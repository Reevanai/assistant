#!/usr/bin/env node
/**
 * CHANAKYA corpus collector (Milestone 2 bootstrap).
 *
 * Fetches REAL records from public sources and writes:
 *   data/snapshot/<source>.json          raw normalised records with provenance
 *   supabase/seed/real_corpus.sql        idempotent SQL loader (upserts) for the corpus tables
 *
 * Licensing policy (see docs/DATA_SOURCES.md):
 *   • Wikidata — CC0 1.0: entity facts stored in full, licence recorded as open_license.
 *   • PRS Legislative Research, PIB — terms not cleared for commercial reuse: we store only
 *     bibliographic metadata (title, date, status, canonical URL) and link out. No body text.
 *
 * Usage: node ingest/collect.mjs   (Node 20+, no dependencies). Run from chanakya/.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const UA = "CHANAKYA-research/0.1 (public-affairs research; contact via repository)";
const now = new Date().toISOString();
const sha = (s) => createHash("sha256").update(s).digest("hex");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, accept = "text/html") {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: accept } });
      if (res.ok) return await res.text();
      console.warn(`  ${res.status} ${url}`);
    } catch (e) {
      console.warn(`  retry ${i + 1}: ${url} (${e.message})`);
    }
    await sleep(1500 * (i + 1));
  }
  throw new Error(`failed: ${url}`);
}

const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&#039;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

// ── PRS Legislative Research: bill & rules tracker (metadata only) ───────────────
// The listing currently returns the full tracker (~977 rows) on one page.
async function collectPrs(pages = 1) {
  const out = [];
  for (let p = 0; p < pages; p++) {
    const url = `https://prsindia.org/billtrack${p ? `?page=${p}` : ""}`;
    const html = await get(url);
    const rows = html.split('<div class="views-row">').slice(1);
    for (const row of rows) {
      const m = /href="(\/billtrack\/[^"]+)">([\s\S]*?)<\/a>/.exec(row);
      if (!m) continue;
      const status = /views-field-field-bill-status">\s*<span\s+class="[^"]*">([^<]*)</.exec(row)?.[1]?.trim() ?? null;
      const title = decode(m[2]);
      const year = /\b(19|20)\d{2}\b/.exec(title)?.[0] ?? null;
      const isRules = /\brules\b|regulations\b/i.test(title);
      out.push({
        external_id: `PRS:${m[1].replace("/billtrack/", "")}`,
        title,
        doc_type: isRules ? "rule" : "bill",
        status,
        year,
        source_url: `https://prsindia.org${m[1]}`,
        listing_url: url,
        retrieved_at: new Date().toISOString(),
      });
    }
    console.log(`PRS page ${p}: ${rows.length} rows`);
    await sleep(1200); // polite crawl rate
  }
  return dedupe(out, "external_id");
}

// ── PIB: press releases via official RSS (metadata only) ─────────────────────────
async function collectPib() {
  const feeds = [
    { url: "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3", lang: "hi" },
    { url: "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=2&Regid=3", lang: "en" },
  ];
  const out = [];
  for (const f of feeds) {
    const xml = await get(f.url, "application/rss+xml");
    for (const item of xml.split("<item>").slice(1)) {
      const title = decode(/<title>([\s\S]*?)<\/title>/.exec(item)?.[1] ?? "");
      const link = decode(/<link>([\s\S]*?)<\/link>/.exec(item)?.[1] ?? "");
      const prid = /PRID=(\d+)/.exec(link)?.[1];
      const pub = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(item)?.[1];
      if (!title || !prid) continue;
      const hasDevanagari = /[ऀ-ॿ]/.test(title);
      out.push({
        external_id: `PIB:${prid}`,
        title,
        doc_type: "press_release",
        language: hasDevanagari ? "hi" : "en",
        published_on: pub ? new Date(pub).toISOString().slice(0, 10) : null,
        source_url: `https://pib.gov.in/PressReleasePage.aspx?PRID=${prid}`,
        feed_url: f.url,
        retrieved_at: new Date().toISOString(),
      });
    }
    await sleep(800);
  }
  return dedupe(out, "external_id");
}

// ── Wikidata (CC0): ministries, parties, Karnataka power stations ───────────────
async function sparql(query) {
  const url = "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(query);
  const json = JSON.parse(await get(url, "application/sparql-results+json"));
  return json.results.bindings.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])));
}
const qid = (uri) => uri.replace("http://www.wikidata.org/entity/", "");

async function collectWikidata() {
  const ministries = await sparql(`
    SELECT ?m ?mLabel ?mDescription ?website ?inception WHERE {
      ?m wdt:P31 ?c . ?c wdt:P279* wd:Q192350 . ?m wdt:P17 wd:Q668 .
      FILTER NOT EXISTS { ?m wdt:P576 ?dissolved }
      OPTIONAL { ?m wdt:P856 ?website } OPTIONAL { ?m wdt:P571 ?inception }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`);
  await sleep(1500);
  const parties = await sparql(`
    SELECT ?p ?pLabel ?pDescription ?abbr ?website ?inception WHERE {
      ?p wdt:P31 wd:Q7278 ; wdt:P17 wd:Q668 ; wikibase:sitelinks ?sl . FILTER(?sl > 8)
      FILTER NOT EXISTS { ?p wdt:P576 ?dissolved }
      OPTIONAL { ?p wdt:P1813 ?abbr FILTER(lang(?abbr) = "en") }
      OPTIONAL { ?p wdt:P856 ?website } OPTIONAL { ?p wdt:P571 ?inception }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`);
  await sleep(1500);
  const plants = await sparql(`
    SELECT ?s ?sLabel ?sDescription ?coord ?cap ?operatorLabel ?typeLabel WHERE {
      { ?s wdt:P131 wd:Q1185 } UNION { ?s wdt:P131 ?d . ?d wdt:P131 wd:Q1185 }
      UNION { ?s wdt:P131 ?t . ?t wdt:P131 ?d2 . ?d2 wdt:P131 wd:Q1185 }
      ?s wdt:P31 ?type . ?type wdt:P279* wd:Q159719 . ?s wdt:P625 ?coord .
      OPTIONAL { ?s wdt:P2109 ?cap } OPTIONAL { ?s wdt:P137 ?operator }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    } LIMIT 500`).catch((e) => { console.warn("plants query failed:", e.message); return []; });

  const pick = (rows, key) => dedupe(rows.map((r) => ({ ...r, qid: qid(r[key]) })), "qid");
  return { ministries: pick(ministries, "m"), parties: pick(parties, "p"), plants: pick(plants, "s") };
}

function dedupe(rows, key) {
  const seen = new Map();
  for (const r of rows) if (!seen.has(r[key])) seen.set(r[key], r);
  return [...seen.values()];
}

// ── SQL generation ─────────────────────────────────────────────────────────────
const lit = (v) => (v === null || v === undefined || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => `array[${a.map(lit).join(",")}]::text[]`;

function sectorsFor(title) {
  const t = title.toLowerCase();
  const s = new Set();
  if (/energy|power|electric|solar|renewable|coal|petroleum|gas|nuclear|hydro/.test(t)) s.add("energy");
  if (/solar|renewable|wind|green hydrogen/.test(t)) s.add("renewable_energy");
  if (/road|highway|rail|metro|port|airport|infrastructure|shipping|waterway/.test(t)) s.add("infrastructure");
  if (/rail|road|transport|motor|shipping|aviation|aircraft|vehicle/.test(t)) s.add("transport");
  if (/real estate|housing|building|urban|rera|tenancy|rent/.test(t)) s.add("real_estate");
  if (/urban|municipal|smart cit/.test(t)) s.add("urban_development");
  if (/land|acquisition|revenue/.test(t)) s.add("land");
  if (/mine|mineral|coal/.test(t)) s.add("mining");
  if (/telecom|digital|broadcast|information technology|data protection|cyber/.test(t)) s.add("telecommunications");
  if (/tax|finance|bank|insurance|securities|budget|appropriation|gst|customs/.test(t)) s.add("finance");
  if (/labour|wage|social security|occupational|industrial relations|employment/.test(t)) s.add("labour");
  if (/environment|forest|climate|pollution|wildlife|water/.test(t)) s.add("environment");
  if (/agricultur|farm|seed|fertili|co-operative|cooperative|fisher/.test(t)) s.add("agriculture");
  if (/health|medical|drug|pharma/.test(t)) s.add("health");
  if (/education|universit|school/.test(t)) s.add("education");
  return [...s];
}

function buildSql({ prs, pib, wd }) {
  const L = [];
  L.push(`-- GENERATED by ingest/collect.mjs at ${now}. Real records; provenance on every row.`);
  L.push(`-- Load after migrations + seed.sql. Idempotent (upserts on natural keys).`);
  L.push(`begin;`);
  L.push(`insert into public.sources (slug, name, publisher, base_url, kind, jurisdiction_code, license_status, license_notes, terms_url, license_reviewed_at, is_active) values
  ('wikidata', 'Wikidata', 'Wikimedia Foundation', 'https://www.wikidata.org', 'other', 'IN', 'open_license',
   'Structured data is dedicated to the public domain under CC0 1.0.', 'https://www.wikidata.org/wiki/Wikidata:Licensing', now(), true),
  ('pib', 'Press Information Bureau', 'Press Information Bureau, Government of India', 'https://pib.gov.in', 'ministry_portal', 'IN', 'permitted_with_attribution',
   'PIB copyright policy: material may be reproduced free of charge without prior approval (third-party material excluded). RSS still states "All rights reserved", so CHANAKYA stores titles, dates and links only, attributed to PIB. Reviewed from the published policy; counsel confirmation pending.',
   'https://pib.gov.in/Content/102_2_Copyright-Policy.aspx', now(), true)
  on conflict (slug) do update set license_status = excluded.license_status, license_notes = excluded.license_notes,
    terms_url = excluded.terms_url, license_reviewed_at = excluded.license_reviewed_at, is_active = excluded.is_active;`);
  L.push(`update public.sources set license_notes = 'Terms not cleared for commercial reuse. Only bill titles, status and links are stored; analysis remains on prsindia.org.' where slug = 'prs-legislative';`);

  const runs = [["prs-legislative", prs.length], ["pib", pib.length], ["wikidata", wd.ministries.length + wd.parties.length + wd.plants.length]];
  for (const [slug, n] of runs) {
    L.push(`insert into public.ingestion_runs (source_id, status, started_at, finished_at, items_discovered, items_new, worker_version)
  select id, 'succeeded', '${now}', now(), ${n}, ${n}, 'collect.mjs@0.1' from public.sources where slug = '${slug}';`);
  }

  const doc = (srcSlug, d, level, state, body) => `insert into public.documents (source_id, external_id, title, doc_type, jurisdiction_level, state_code, issuing_body, language, published_on, source_url, first_retrieved_at, extraction_status, verification_status, sectors, license_note)
  select s.id, ${lit(d.external_id)}, ${lit(d.title)}, '${d.doc_type}', '${level}', ${lit(state)}, ${lit(body)}, ${lit(d.language ?? "en")}, ${lit(d.published_on ?? null)}, ${lit(d.source_url)}, ${lit(d.retrieved_at)}, 'not_applicable', 'unverified', ${arr(sectorsFor(d.title))}, ${lit(d.note)}
  from public.sources s where s.slug = '${srcSlug}'
  on conflict (source_id, external_id) do update set title = excluded.title, last_checked_at = now(), sectors = excluded.sectors;`;

  for (const d of prs) {
    L.push(doc("prs-legislative", { ...d, published_on: null, note: `Metadata only. PRS status at retrieval: ${d.status ?? "unknown"}. Year in title: ${d.year ?? "n/a"} (exact introduction date not captured yet).` }, "central", null, "Parliament of India (tracked by PRS)"));
  }
  for (const d of pib) {
    L.push(doc("pib", { ...d, note: "Metadata only (title + link)." }, "central", null, "Press Information Bureau"));
  }
  // A version row per document = hash of the metadata we observed (change detection for listings).
  L.push(`insert into public.document_versions (document_id, version_no, content_sha256, mime_type, retrieved_at, fetched_url, extraction_status)
  select d.id, 1, encode(sha256(convert_to(d.title || '|' || d.source_url, 'UTF8')), 'hex'), 'text/html', d.first_retrieved_at, d.source_url, 'not_applicable'
  from public.documents d join public.sources s on s.id = d.source_id where s.slug in ('prs-legislative','pib')
  on conflict do nothing;`);
  L.push(`update public.documents d set current_version_id = v.id from public.document_versions v where v.document_id = d.id and d.current_version_id is null;`);

  const ent = (type, r, label, extra = {}, state = null) => {
    const attrs = { wikidata_qid: r.qid, ...extra };
    for (const k of Object.keys(attrs)) if (attrs[k] === undefined || attrs[k] === null) delete attrs[k];
    return `insert into public.entities (entity_type, canonical_name, aliases, description, state_code, attributes, verification_status, last_verified_at)
  select '${type}', ${lit(label)}, ${arr(extra.abbr ? [extra.abbr] : [])}, ${lit(r[Object.keys(r).find((k) => k.endsWith("Description"))])}, ${lit(state)}, ${lit(JSON.stringify(attrs))}::jsonb, 'auto_matched', null
  where not exists (select 1 from public.entities e where e.attributes ->> 'wikidata_qid' = '${r.qid}');
insert into public.entity_sources (entity_id, source_url, claim, retrieved_at)
  select e.id, 'https://www.wikidata.org/wiki/${r.qid}', 'identity and attributes (Wikidata ${r.qid}, CC0)', '${now}'
  from public.entities e where e.attributes ->> 'wikidata_qid' = '${r.qid}'
  and not exists (select 1 from public.entity_sources es where es.entity_id = e.id and es.source_url = 'https://www.wikidata.org/wiki/${r.qid}');`;
  };
  for (const r of wd.ministries) if (!/^Q\d+$/.test(r.mLabel)) L.push(ent(/department/i.test(r.mLabel) ? "department" : "ministry", r, r.mLabel, { website: r.website, inception: r.inception?.slice(0, 10) }));
  for (const r of wd.parties) if (!/^Q\d+$/.test(r.pLabel)) L.push(ent("political_party", r, r.pLabel, { abbr: r.abbr, website: r.website, inception: r.inception?.slice(0, 10) }));
  for (const r of wd.plants) {
    if (/^Q\d+$/.test(r.sLabel)) continue;
    const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(r.coord ?? "");
    L.push(ent("public_project", r, r.sLabel, {
      category: "power_station", plant_type: r.typeLabel, capacity_mw: r.cap ? Number(r.cap) : undefined,
      operator: r.operatorLabel, lon: m ? Number(m[1]) : undefined, lat: m ? Number(m[2]) : undefined,
    }, "IN-KA"));
  }
  L.push(`commit;`);
  return L.join("\n");
}

// ── main ───────────────────────────────────────────────────────────────────────
const results = {};
const errors = [];
for (const [name, fn] of [["prs", collectPrs], ["pib", collectPib], ["wikidata", collectWikidata]]) {
  try {
    console.log(`collecting ${name}…`);
    results[name] = await fn();
  } catch (e) {
    errors.push(`${name}: ${e.message}`);
    results[name] = name === "wikidata" ? { ministries: [], parties: [], plants: [] } : [];
  }
}
await mkdir("data/snapshot", { recursive: true });
for (const [k, v] of Object.entries(results)) {
  await writeFile(`data/snapshot/${k}.json`, JSON.stringify({ retrieved_at: now, records: v }, null, 1));
}
const sql = buildSql({ prs: results.prs, pib: results.pib, wd: results.wikidata });
await writeFile("supabase/seed/real_corpus.sql", sql + "\n");
const wd = results.wikidata;
console.log(JSON.stringify({
  prs: results.prs.length, pib: results.pib.length,
  ministries: wd.ministries.length, parties: wd.parties.length, power_stations: wd.plants.length,
  sql_sha256: sha(sql).slice(0, 12), errors,
}, null, 1));
