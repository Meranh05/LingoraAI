import { SearchResults } from "@/components/search-results";
import { requireViewer } from "@/lib/auth";
import { getLearningWorkspaceData } from "@/lib/learning-data";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const viewer = await requireViewer();
  const data = await getLearningWorkspaceData(viewer, { kind: "search" });
  return <SearchResults query={q} documents={data.documents} vocabulary={data.vocabulary} />;
}
