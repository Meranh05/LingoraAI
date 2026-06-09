import { PracticeCenter } from "@/components/practice-center";
import { requireViewer } from "@/lib/auth";
import { getLearningWorkspaceData } from "@/lib/learning-data";

export default async function PracticePage() {
  const viewer = await requireViewer();
  const data = await getLearningWorkspaceData(viewer);
  return <PracticeCenter progress={data.progress} />;
}
