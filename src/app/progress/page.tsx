import { requireViewer } from "@/lib/auth";
import { getLearningWorkspaceData } from "@/lib/learning-data";
import { LearningWorkspace } from "@/components/learning-workspace";
import { hasFeatureAccess } from "@/lib/economy";
import { redirect } from "next/navigation";
export default async function Page() {
  const viewer = await requireViewer();
  if (!(await hasFeatureAccess(viewer.id, "progress", "basic"))) {
    redirect("/store?required=progress");
  }
  return <LearningWorkspace kind="progress" data={await getLearningWorkspaceData(viewer, { kind: "progress" })} />;
}
