# ADR-0002: Postgres first for graph, search, vectors and queue

**Status:** accepted (M1)

**Context:** The brief lists Neo4j, pgvector and background jobs. Running several stores early
multiplies operational cost and makes provenance and tenancy harder to keep consistent.

**Decision:** Relationships are rows in `public.relationships` (1–3 hop exploration via recursive
CTEs). Full-text uses generated `tsvector` columns, semantic search uses `pgvector` HNSW, and the
ingestion queue will be a table consumed with `FOR UPDATE SKIP LOCKED`.

**Revisit when:** graph traversals beyond 3 hops or path analytics become a product requirement, or
p95 graph queries exceed ~300 ms on production data. Neo4j would then be a derived read model,
fed from Postgres (still the source of truth).
