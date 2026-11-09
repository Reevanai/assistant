# CHANAKYA — Architecture & Delivery Plan

Status: **Milestone 1 (Foundation) implemented.** Everything after M1 is design, not code.

This document answers the nine questions in §12 of the master brief:

1. [Brief analysis](#1-brief-analysis)
2. [Application architecture](#2-application-architecture)
3. [Folder structure](#3-folder-structure)
4. [PostgreSQL schema](#4-postgresql-schema)
5. [Application routes](#5-application-routes)
6. [Data ingestion architecture](#6-data-ingestion-architecture)
7. [Command Centre — first screen](#7-command-centre--first-screen)
8. [Technical risks & dependencies](#8-technical-risks--dependencies)
9. [Milestone plan](#9-milestone-plan)

Architecture Decision Records live in [`docs/adr/`](./adr).

---

## 1. Brief analysis

**What CHANAKYA actually is:** a *provenance-first document and entity corpus* about Indian
public administration, with tenant-scoped analyst workflows (watchlists, research, impact
profiles) layered on top, and AI used only as a retrieval/summarisation layer that must cite
that corpus.

Three observations shape every design decision:

1. **The corpus is the product; the UI is a lens.** Value comes from (a) reliably fetching
   official documents, (b) versioning them, (c) extracting structure, and (d) linking them to
   entities. If ingestion is weak, every module downstream (Radar, Analyst, Graph, Impact) is
   weak. So the schema treats *document → version → chunk* and *provenance* as first-class.
2. **Two data planes with different trust rules.**
   - **Shared corpus** (documents, entities, relationships, sources): curated by the platform,
     written only by back-end workers / platform curators, readable by entitled tenants.
   - **Tenant workspace** (orgs, members, watchlists, projects, reports, impact profiles):
     written by customers, strictly isolated by Postgres Row Level Security.
3. **"Fact vs hypothesis" must be a schema property, not a UI convention.** Relationships carry
   `assertion_kind` (`documented` | `inferred`), `evidence_quality`, an evidence document, and a
   `verification_status`. Database `CHECK` constraints make it impossible to store an inferred
   relationship as `verified`, or a `verified` relationship without evidence.

**What the brief under-specifies (decisions taken):**

| Gap | Decision |
|---|---|
| Graph store: Neo4j vs Postgres | Start with relationships in Postgres (recursive CTEs handle 1–3 hop exploration at MVP scale). Add Neo4j only when traversal queries exceed Postgres comfortably (ADR-0002). |
| Where AI runs | Server-side only (Next.js route handlers / Python workers). Keys never reach the browser. Provider behind an interface so OpenAI/Gemini/others are swappable. |
| Licensing | Each `source` has a `license_status`; it starts as `unreviewed` and connectors are disabled until a human records the terms. "Public" ≠ "licensed for commercial reuse". |
| Personal data | Only public-office holders in their public capacity. No voter-level data, no private individuals. Enforced by entity-type allow-list and curation review. |
| Data entitlements per tenant | M1: any org member can read the shared corpus. M4: `organization_source_access` restricts by source/edition. |

---

## 2. Application architecture

```
                         ┌───────────────────────────────────────────────┐
  Browser (analyst)      │ Next.js 15 (App Router) on Vercel             │
  ─────────────────▶     │  • Server Components read via Supabase SSR    │
  cookie session         │    client AS THE USER  → RLS applies          │
                         │  • Server Actions for mutations (zod-validated)│
                         │  • Route handlers for AI (M3) – server keys   │
                         └──────────────┬────────────────────────────────┘
                                        │ PostgREST / RPC (user JWT)
                         ┌──────────────▼────────────────────────────────┐
                         │ Supabase                                       │
                         │  Postgres 15+  ─ RLS on every table            │
                         │   ├─ tenant schema (orgs, watchlists, …)       │
                         │   ├─ corpus (sources, documents, versions,     │
                         │   │          chunks+pgvector, entities, rels)  │
                         │   ├─ private.* security-definer helpers        │
                         │   └─ audit_log (trigger-written, append-only)  │
                         │  Auth (email/password, magic link, SSO later)  │
                         │  Storage: raw document bytes (private bucket)  │
                         └──────────────▲────────────────────────────────┘
                                        │ service-role (workers only)
                         ┌──────────────┴────────────────────────────────┐
                         │ Python workers (container: Fly/Render/ECS)    │
                         │  connectors → fetch → hash/version → extract  │
                         │  (pdf text / OCR) → classify → chunk → embed  │
                         │  → entity-link → change-detect → alert fanout │
                         │  queue = Postgres table `ingestion_jobs`       │
                         │  (SKIP LOCKED); upgrade to a broker if needed │
                         └───────────────────────────────────────────────┘
```

**Principles**

- **RLS is the security boundary.** The web app never uses the service-role key. All reads and
  writes from the web tier run as the signed-in user. Workers use service role and are not
  internet-facing.
- **Business logic outside components.** `web/src/lib/data/*` holds typed query functions;
  `web/src/lib/actions/*` holds server actions; components only render.
- **Postgres-first infra.** Queue, full-text search (`tsvector`), vectors (`pgvector`), and
  graph edges all live in Postgres until measured load justifies another system.
- **Every corpus row is traceable**: source URL, publication date, retrieval timestamp,
  document identifier, version, extraction status, verification status, licence note.

---

## 3. Folder structure

```
chanakya/
├── docs/
│   ├── ARCHITECTURE.md          ← this file
│   └── adr/                     ← architecture decision records
├── supabase/
│   ├── config.toml              ← Supabase CLI project config
│   ├── migrations/              ← ordered, idempotent-on-fresh-db SQL
│   ├── seed.sql                 ← reference data only (states/UTs, source catalog)
│   ├── seed/demo.sql            ← OPTIONAL synthetic demo data, every row is_demo=true
│   └── tests/                   ← RLS / constraint tests + local runner
├── web/                         ← Next.js app
│   └── src/
│       ├── app/
│       │   ├── (auth)/          login, signup
│       │   ├── auth/            callback / sign-out route handlers
│       │   ├── onboarding/      create first organisation
│       │   ├── invite/[token]/  accept invitation
│       │   └── o/[org]/         tenant workspace (layout = workstation shell)
│       │       ├── command/     Command Centre            (M1)
│       │       ├── documents/[id]/ document & provenance  (M1)
│       │       ├── watchlists/  watchlists CRUD            (M1)
│       │       ├── settings/    members, invitations, sources (M1)
│       │       └── radar|search|analyst|entities|graph|map|impact  (M2+)
│       ├── components/
│       │   ├── ui/              shadcn-style primitives (button, input, badge, panel…)
│       │   ├── shell/           sidebar, top bar, command palette, keyboard nav
│       │   └── command/         Command Centre panels
│       ├── lib/
│       │   ├── supabase/        server / browser / middleware clients
│       │   ├── data/            typed read functions (RLS-enforced)
│       │   ├── actions/         server actions (mutations)
│       │   ├── validation/      zod schemas
│       │   └── domain/          pure logic (roles, labels, formatting) – unit tested
│       └── middleware.ts        session refresh + route protection
└── workers/                     ← Python ingestion (M2)
    └── chanakya_ingest/
        ├── connectors/          one module per source (egazette, prs, sansad, karnataka…)
        ├── pipeline/            fetch, version, extract, classify, chunk, embed
        └── queue.py             Postgres SKIP LOCKED job runner
```

---

## 4. PostgreSQL schema

Full DDL: `supabase/migrations/`. Summary by plane:

### 4.1 Tenancy & identity (tenant plane)

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | 1:1 with `auth.users` | `full_name`, `default_org_id` |
| `organizations` | Tenant | `slug` (unique), `name`, `edition` (`trial/research/professional/enterprise`) |
| `organization_members` | Membership + role | PK(`org_id`,`user_id`), `role` (`owner/admin/analyst/researcher/viewer`) |
| `organization_invitations` | Invite by email | `token_hash` (sha256), `role`, `expires_at`, `accepted_at` |
| `teams`, `team_members` | Sub-groups (M4 UI) | `org_id`-scoped |
| `user_workspace_prefs` | Per-user Command Centre layout | PK(`user_id`,`org_id`), `layout jsonb` |

Role capabilities (enforced in RLS via `private.has_org_role`):

| Capability | owner | admin | analyst | researcher | viewer |
|---|:-:|:-:|:-:|:-:|:-:|
| Read corpus & org workspace | ✔ | ✔ | ✔ | ✔ | ✔ |
| Create watchlists / projects | ✔ | ✔ | ✔ | ✔ | – |
| Edit others' watchlists | ✔ | ✔ | ✔ | – | – |
| Manage members / invitations | ✔ | ✔ | – | – | – |
| Read full audit log | ✔ | ✔ | – | – | – |
| Delete org, transfer ownership | ✔ | – | – | – | – |

### 4.2 Shared corpus (platform plane — read-only to tenants)

| Table | Purpose |
|---|---|
| `jurisdictions` | States / UTs (ISO 3166-2:IN), districts later. Reference data. |
| `sources` | Registered publishers/endpoints, `license_status`, `license_notes`, `terms_url`, `is_active` |
| `ingestion_runs` | One row per connector run: counts, status, error |
| `ingestion_jobs` | Work queue (M2) |
| `documents` | Logical document: `external_id`, `title`, `doc_type`, `jurisdiction_level`, `state_code`, `issuing_body`, `published_on`, `effective_on`, `source_url`, `first_retrieved_at`, `current_version_id`, `extraction_status`, `verification_status`, `license_note`, `sectors[]`, `summary` (+ model, generated_at), `is_demo`, generated `search_tsv` |
| `document_versions` | Immutable snapshots: `version_no`, `content_sha256`, `storage_path`, `mime_type`, `retrieved_at`, `text_content`, `change_summary` |
| `document_chunks` | RAG units: `content`, page span, `embedding vector(1536)`, `tsv` |
| `entities` | Politicians (public capacity), parties, ministries, departments, institutions, companies, projects, policies, instruments, constituencies |
| `entity_sources` | Evidence for entity attributes |
| `document_entities` | Mentions / issued-by links between documents and entities |
| `relationships` | Typed, time-bounded edges with `assertion_kind`, `evidence_quality`, `confidence`, `evidence_document_id`, `verification_status` |
| `record_corrections` | Tenant-submitted correction requests for corpus rows |

Enforced invariants (CHECK constraints):

- `relationships`: `verification_status='verified'` ⇒ evidence present **and** `assertion_kind='documented'`.
- `relationships`: `assertion_kind='inferred'` ⇒ `evidence_quality='inferred'`.
- `relationships`: `valid_to >= valid_from`; no self-loops.
- `documents`: `source_url` must be `http(s)://`.
- `document_versions`: unique (`document_id`,`content_sha256`) — re-fetching identical bytes never creates a version.

### 4.3 Analyst workspace (tenant plane)

| Table | Milestone |
|---|---|
| `watchlists`, `watchlist_items` | M1 |
| `saved_queries`, `research_projects`, `project_items` | M3 |
| `analyst_conversations`, `analyst_messages`, `analyst_citations` | M3 |
| `impact_profiles`, `impact_assessments` | M5 |
| `alerts`, `notification_deliveries`, `reports` | M4 |

### 4.4 Governance

- `audit_log` — written by `private.audit_trigger()` on tenant tables (insert/update/delete,
  actor = `auth.uid()`, before/after JSON). No UPDATE/DELETE policy ⇒ append-only for clients.
- `platform_admins` — curators allowed to resolve corrections (M2).
- Customer-sensitive columns (e.g. impact profile business locations) will use
  Supabase Vault / pgsodium column encryption in M5.

---

## 5. Application routes

| Route | Module | M |
|---|---|---|
| `/login`, `/signup` | Auth | 1 |
| `/auth/callback`, `/auth/signout` | Auth handlers | 1 |
| `/onboarding` | Create organisation | 1 |
| `/invite/[token]` | Accept invitation | 1 |
| `/o/[org]/command` | Command Centre | 1 |
| `/o/[org]/documents/[id]` | Document, versions, provenance | 1 |
| `/o/[org]/watchlists` · `/[id]` | Intelligence Watchlists | 1 |
| `/o/[org]/settings/members` | Members, roles, invitations | 1 |
| `/o/[org]/settings/sources` | Source catalogue & licence status | 1 |
| `/o/[org]/radar` | Policy Radar (filters, change detection) | 2 |
| `/o/[org]/search` | Hybrid document search | 2 |
| `/o/[org]/analyst` · `/[conversationId]` | AI Research Analyst | 3 |
| `/o/[org]/entities` · `/[id]` | Entity profiles | 3 |
| `/o/[org]/graph` | Relationship graph (Cytoscape) | 3 |
| `/o/[org]/watchlists/reports` | Weekly reports | 4 |
| `/o/[org]/map` | GeoPolitical (MapLibre) | 5 |
| `/o/[org]/impact` | Impact Intelligence | 5 |

---

## 6. Data ingestion architecture

```
 scheduler (cron in worker)            ┌──────────── ingestion_jobs (Postgres queue) ─────────────┐
  └─ enqueue discover(source) ───────▶ │ discover → fetch → extract → classify → index → link     │
                                       └──────────────────────────────────────────────────────────┘
 Connector contract (Python Protocol):
   discover(since) -> Iterable[DiscoveredItem(external_id, url, published_on, title_hint)]
   fetch(item)     -> RawArtifact(bytes, mime, final_url, http_headers)
   parse_metadata(artifact) -> DocumentMetadata(doc_type, issuing_body, state_code, …)
```

Stages:

1. **Discover** — list/search pages or official APIs (data.gov.in has an API; most gazettes are
   HTML listings + PDFs). Respect robots.txt, rate-limit per host, identify the crawler.
2. **Fetch & version** — store bytes in a private Storage bucket at
   `raw/{source}/{external_id}/{sha256}`; insert `document_versions` only if the hash is new.
   Hash change on a known `external_id` ⇒ **change event**.
3. **Extract** — `pdfplumber`/`pypdf` for text PDFs; OCR (Tesseract with `eng+kan+hin`, or a
   managed OCR) when text density is below threshold. Status ⇒ `extraction_status`.
4. **Classify** — doc type, sectors, state/ministry. Rules first (gazette part/section, issuing
   ministry), LLM with structured output second; model + prompt version recorded.
5. **Index** — chunk (~800 tokens, page-aware), embed, write `document_chunks`.
6. **Link** — entity resolution against `entities` (exact alias → fuzzy `pg_trgm` → human
   queue). Never auto-create `verified` links.
7. **Diff & alert** — text diff between versions → `change_summary`; watchlist matching →
   `alerts` (M4).

Idempotency key: (`source_id`, `external_id`, `content_sha256`). Every stage is restartable.

**Initial connectors (Karnataka-first, infra/energy/real-estate):** Karnataka eRajyapatra
gazette, e-Gazette of India, PRS bills tracker, Sansad (Lok Sabha / Rajya Sabha questions),
data.gov.in catalogue. Each starts `is_active=false, license_status='unreviewed'`.

---

## 7. Command Centre — first screen

Dense, multi-panel, dark. 12-column grid on ≥1280px, single column on mobile.

```
┌ top bar: org ▾ · ⌘K command palette · IST clock · user ───────────────────────────────┐
├ side rail ┬───────────────────────────────────────────────────────────────────────────┤
│ Command   │ STATUS STRIP  docs · versions · active sources · last ingest · demo flag   │
│ Radar     ├──────────────────────────────────────────────┬────────────────────────────┤
│ Search    │ LATEST DEVELOPMENTS (table)                  │ WATCHLISTS                 │
│ Analyst   │ date · type · jurisdiction · title · verif   │ name · items · 7d matches  │
│ Entities  │ (click → document provenance view)           ├────────────────────────────┤
│ Graph     ├──────────────────────────────────────────────┤ TRACKED BODIES             │
│ Map       │ GAZETTE & NOTIFICATIONS (last 30d)           │ ministries / depts / states│
│ Impact    ├──────────────────────────────────────────────┼────────────────────────────┤
│ Watch     │ INGESTION STATUS  source · last run · result │ RESEARCH ACTIVITY (audit)  │
│ Settings  │                                              │                            │
└───────────┴──────────────────────────────────────────────┴────────────────────────────┘
```

- Every panel reads real tables through RLS and has loading (Suspense skeleton), empty, and
  error states. With an empty corpus it says so — no placeholder intelligence.
- Panels can be hidden per user (`user_workspace_prefs.layout`).
- Keyboard: `⌘K`/`Ctrl K` palette, `g c` Command, `g w` Watchlists, `g s` Settings.
- Demo rows (`is_demo=true`) carry a visible **DEMO** badge everywhere.

---

## 8. Technical risks & dependencies

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | **Source licensing / ToS** — Indian government sites vary; GODL-India covers data.gov.in but not every portal; PRS content has its own terms | Legal | `license_status` gate per source; legal review before activation; store links + extracts rather than republishing full text where terms are unclear |
| R2 | **Scraping fragility** — gazette portals change HTML, use CAPTCHAs, ASP.NET postbacks, go offline | Data gaps | Connector contract + per-source health in `ingestion_runs`; alert on zero-yield runs; prefer official APIs/bulk downloads |
| R3 | **OCR quality** for scanned Kannada/Hindi PDFs | Bad search / RAG | Text-density detection, language-aware OCR, `extraction_status='needs_review'`, keep page images |
| R4 | **LLM hallucinated citations** | Trust | Answers may cite only chunk IDs returned by retrieval; server validates every citation ID exists in the retrieved set before rendering; refuse when retrieval is empty |
| R5 | **Entity resolution errors** (same name, different person) | Reputational / defamation | Human-verified merges only; unverified links shown as such; correction workflow |
| R6 | **RLS mistakes** | Tenant data leak | Policies via small set of helper functions; automated RLS test suite (`supabase/tests`) in CI |
| R7 | **DPDP Act 2023 compliance** | Regulatory | Public-capacity data only; customer data minimisation; data-processing records; India-region hosting option (Supabase `ap-south-1`) |
| R8 | **Cost of embeddings / LLM** at corpus scale | Margin | Embed once per version; cache summaries; smaller models for classification |
| R9 | Geographic boundaries (constituencies/districts) licensing & accuracy; India's official map depiction requirements | Legal / reputational | Use Survey of India / official boundaries where licensed; label data vintage |

**External dependencies not available in this repo yet:** Supabase project (URL + anon key),
an LLM provider key (M3), Storage bucket, worker hosting, boundary datasets (M5).

---

## 9. Milestone plan

| M | Name | Scope | Exit criteria |
|---|---|---|---|
| **1** | **Foundation** ✅ | Schema + RLS for tenancy & corpus; auth; onboarding; invitations; roles; workstation shell; Command Centre on real data; document provenance page; watchlists CRUD; source catalogue; audit log; RLS tests | `supabase/tests/run.sh` passes; `npm run build` + unit tests pass; a new user can sign up, create an org, invite a colleague, create a watchlist |
| 2 | Ingestion & Policy Radar | Python worker, job queue, 2 Karnataka + 1 central connector (post licence review), Storage, OCR, classification, change detection, Radar filters, FTS search | Real documents flow end-to-end with provenance; version diff visible |
| 3 | Analyst, Entities, Graph | Chunking + pgvector hybrid retrieval, cited RAG answers with citation validation, entity profiles, curated relationships, Cytoscape graph | Every answer sentence maps to a stored chunk; refusal on no evidence |
| 4 | Watchlist alerts & reports | Matching engine, email/in-app alerts, weekly report generation, teams, per-source entitlements | Weekly report delivered for a pilot org |
| 5 | Geo & Impact | MapLibre map with states/districts/constituencies, project locations; impact profiles + relevance scoring with mandatory human review | Pilot customer validates relevance on real notifications |
| 6 | Enterprise hardening | SSO/SAML, column encryption, data residency, export, SLA monitoring, pen-test | Enterprise security questionnaire passes |
