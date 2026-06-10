import { requireViewer } from "@/lib/auth";
import { getLearningWorkspaceData } from "@/lib/learning-data";
import { LearningWorkspace } from "@/components/learning-workspace";
import { hasFeatureAccess } from "@/lib/economy";
import { redirect } from "next/navigation";
export default async function Page() {
  const viewer = await requireViewer();
  if (!(await hasFeatureAccess(viewer.id, "translation", "basic"))) {
    redirect("/store?required=translation");
  }
  return <LearningWorkspace kind="translation" data={await getLearningWorkspaceData(viewer, { kind: "translation" })} />;
}
