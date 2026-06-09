import { requireViewer } from "@/lib/auth";
import { getLearningWorkspaceData } from "@/lib/learning-data";
import { LearningWorkspace } from "@/components/learning-workspace";
export default async function Page() {
  const viewer = await requireViewer();
  return <LearningWorkspace kind="speaking" data={await getLearningWorkspaceData(viewer)} />;
}
