/** What each not-yet-built module will do and what it depends on. Rendered verbatim on its route. */
export const ROADMAP: Record<string, { title: string; milestone: number; summary: string; dependsOn: string[] }> = {
  radar: {
    title: "Policy Radar", milestone: 2,
    summary: "Filterable feed of gazette notifications, orders, bills and policies with change detection between versions, sector/state/ministry classification and source-cited summaries.",
    dependsOn: ["Python ingestion worker and connectors", "Licence review of each source", "Text extraction / OCR", "Classification model"],
  },
  search: {
    title: "Document Search", milestone: 2,
    summary: "Hybrid full-text (tsvector) and semantic (pgvector) search over document chunks with filters for date, state, ministry, type and sector.",
    dependsOn: ["Ingested documents with extracted text", "Embedding provider API key (server-side)"],
  },
  analyst: {
    title: "AI Research Analyst", milestone: 3,
    summary: "Retrieval-augmented answers grounded only in indexed documents. Every claim cites a stored chunk with its exact source date and link; citations are validated server-side against the retrieved set and the analyst declines when evidence is missing.",
    dependsOn: ["Document chunks and embeddings (M2)", "LLM provider API key (server-side only)"],
  },
  entities: {
    title: "Entity Intelligence", milestone: 3,
    summary: "Profiles for ministries, departments, institutions, parties, companies, projects and public-office holders in their public capacity, each attribute backed by a source and a last-verified date.",
    dependsOn: ["Curated entity data from official sources", "Entity-resolution pipeline with human verification"],
  },
  graph: {
    title: "Relationship Intelligence", milestone: 3,
    summary: "Interactive Cytoscape graph of documented relationships. Each edge shows type, period, evidence document, verification status and evidence quality; inferred links are visually distinct and never presented as fact.",
    dependsOn: ["Verified relationships in the corpus"],
  },
  map: {
    title: "GeoPolitical Intelligence", milestone: 5,
    summary: "MapLibre map of states, districts and constituencies with project locations and regional policy activity.",
    dependsOn: ["Licensed boundary datasets (states, districts, constituencies)", "Geocoded projects and institutions"],
  },
  impact: {
    title: "Impact Intelligence", milestone: 5,
    summary: "Define your industry, locations, departments and activities; new notifications are scored for potential relevance with an explanation of what changed and why it may matter, routed for mandatory human review. Not legal advice.",
    dependsOn: ["Policy Radar classification (M2)", "Analyst retrieval (M3)", "Encrypted customer impact profiles"],
  },
};
