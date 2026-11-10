import { redirect } from "next/navigation";

/** Full-text search lives in Policy Radar (same corpus, same filters). Semantic search arrives with embeddings. */
export default async function SearchPage({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ q?: string }> }) {
  const { org } = await params;
  const { q } = await searchParams;
  redirect(`/o/${org}/radar${q ? `?q=${encodeURIComponent(q)}` : ""}`);
}
