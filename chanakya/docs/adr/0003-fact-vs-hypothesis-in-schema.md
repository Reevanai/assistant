# ADR-0003: Fact vs hypothesis enforced by the schema

**Status:** accepted (M1)

**Decision:** Each relationship has `assertion_kind` (`documented` | `inferred`), `evidence_quality`,
`confidence`, evidence (document or URL) and `verification_status`. CHECK constraints guarantee:
an inferred edge always has `evidence_quality = 'inferred'` and can never be `verified`; a documented
edge must cite evidence; `verified` requires a timestamp. People can only be profiled with a
recorded `public_capacity`. Sources cannot be activated before a licence review is recorded.

**Consequences:** Ingestion and curation code cannot accidentally present inference as fact,
whatever the UI does.
