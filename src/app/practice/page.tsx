import { PracticeCenter } from "@/components/practice-center";
import { requireViewer } from "@/lib/auth";
import { getLearningWorkspaceData } from "@/lib/learning-data";

export default async function PracticePage() {
  const viewer = await requireViewer();
  const data = await getLearningWorkspaceData(viewer, { kind: "practice" });
  return <PracticeCenter progress={data.progress} reviewQueue={data.reviewQueue} />;
}
