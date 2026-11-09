# CHANAKYA

India's political, government and public-affairs intelligence platform: a provenance-first
corpus of official documents and entities, with isolated analyst workspaces on top.

> **Status: Milestone 1 (Foundation) is built and tested.** Policy Radar, Search, the AI
> Analyst, Entities/Graph, Geo and Impact are designed but not yet implemented; their
> routes say so explicitly. No intelligence data is fabricated. The optional demo
> dataset is synthetic, flagged `is_demo`, and badged **DEMO** everywhere.

- Architecture, schema, routes, ingestion design, risks, milestones → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Decisions → [`docs/adr/`](docs/adr)

## Layout

| Path | Contents |
|---|---|
| `supabase/migrations/` | Postgres schema, RLS policies, RPCs (tenancy, corpus, workspace, audit) |
| `supabase/seed.sql` | Reference data only: states/UTs, sectors, candidate source catalogue (all inactive, licence unreviewed) |
| `supabase/seed/demo.sql` | **Optional synthetic demo data.** Never load in production. |
| `supabase/tests/` | 74 RLS / constraint assertions + a runner using a throwaway Postgres |
| `web/` | Next.js 15 workstation (App Router, Tailwind 4, Supabase SSR auth) |
| `web/e2e/journey.cjs` | Playwright end-to-end user journey |

## What Milestone 1 does

- Email/password auth (Supabase Auth), session refresh in middleware, safe post-login redirects.
- Multi-tenant organisations with roles **owner / admin / analyst / researcher / viewer**, enforced
  by Postgres RLS and SECURITY DEFINER RPCs (not the UI). Last-owner protection; admins can't touch owners.
- Single-use, hashed, email-bound, expiring invitation links (email delivery is an M4 dependency).
- **Command Centre**: corpus status strip, latest developments, gazette & notifications (30d),
  watchlists with 7-day match counts, tracked regions/sectors, ingestion status per source, research
  activity from the audit log. Panels hideable per user (stored in the DB). `⌘K` palette, `g c` / `g w` / `g s` … chords.
- **Watchlists**: create, org/private visibility, items by state, sector, document type, source or
  keyword (web-search syntax); live matching in SQL under the caller's RLS.
- **Document view**: provenance (identifier, published/effective dates, retrieval timestamps, source URL,
  version hashes, extraction/verification status, licence) and a correction-request workflow.
- **Source catalogue** with licence status; a DB constraint stops a source being activated before its
  reuse terms are reviewed.
- Append-only audit log (trigger-written, secrets redacted).

## Running locally

Prerequisites: Node 20+, Docker, and the Supabase CLI (`npx supabase`).

```bash
cd chanakya
npx supabase start                      # applies migrations + seed.sql
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/seed/demo.sql   # optional DEMO data
npx supabase status -o env              # copy API_URL and ANON_KEY

cd web
cp .env.example .env.local              # fill NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev                             # http://localhost:3000 → sign up → create organisation
```

Locally, email confirmation is off (`supabase/config.toml`). In hosted projects keep it on: accepting
an invitation requires a confirmed email.

## Tests

```bash
supabase/tests/run.sh        # throwaway Postgres 15+ with pgvector; schema + RLS assertions
cd web && npm run typecheck && npm test && npm run build
NODE_PATH=$(npm root -g) node e2e/journey.cjs /tmp/shots   # with app + local Supabase running
```

The E2E journey covers: auth redirect, signup validation, org creation, keyboard navigation, watchlist
matching, document provenance + correction, invitation → second user joins as viewer (read-only),
outsider gets 404 on a foreign org, invitation replay is rejected, mobile layout without horizontal overflow.

## Deployment

- **Database**: `supabase link` then `supabase db push`. Use region `ap-south-1` (Mumbai) for data residency.
- **Web**: Vercel, root directory `chanakya/web`, set the three `NEXT_PUBLIC_*` variables.
- The service-role key is **never** used by the web app; it belongs only to the M2 ingestion workers.
