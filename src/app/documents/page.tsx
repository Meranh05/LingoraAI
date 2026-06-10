import { requireViewer } from "@/lib/auth";
import { getLearningWorkspaceData } from "@/lib/learning-data";
import { DocumentStudio } from "@/components/document-studio";
export default async function Page() {
  const viewer = await requireViewer();
  const data = await getLearningWorkspaceData(viewer, { kind: "documents" });
  return <DocumentStudio initialDocuments={data.documents} />;
}
