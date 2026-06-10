import { requireViewer } from "@/lib/auth";
import { getLearningWorkspaceData } from "@/lib/learning-data";
import { LearningWorkspace } from "@/components/learning-workspace";
import { hasFeatureAccess } from "@/lib/economy";
import { redirect } from "next/navigation";
export default async function Page() {
  const viewer = await requireViewer();
  if (!(await hasFeatureAccess(viewer.id, "writing", "basic"))) {
    redirect("/store?required=writing");
  }
  return <LearningWorkspace kind="writing" data={await getLearningWorkspaceData(viewer, { kind: "writing" })} />;
}
