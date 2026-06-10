import { notFound, redirect } from "next/navigation";
import { LearningWorkspace } from "@/components/learning-workspace";
import { requireViewer } from "@/lib/auth";
import { hasFeatureAccess } from "@/lib/economy";
import { getCompetitionArenaData } from "@/lib/learning-data";

export default async function CompetitionArenaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await requireViewer();
  if (!(await hasFeatureAccess(viewer.id, "competition", "plus"))) {
    redirect("/store?required=competition");
  }
  const { id } = await params;
  const data = await getCompetitionArenaData(viewer, id);
  if (!data) notFound();
  return (
    <LearningWorkspace
      kind="quiz"
      data={data.workspace}
      challenge={data.challenge}
    />
  );
}
