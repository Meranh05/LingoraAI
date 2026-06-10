import type { Metadata } from "next";
import { CompetitionCenter } from "@/components/competition-center";
import { requireViewer } from "@/lib/auth";
import { getCompetitionData } from "@/lib/competition-data";
import { hasFeatureAccess } from "@/lib/economy";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Thi đua học tập",
};

export default async function CompetitionPage() {
  const viewer = await requireViewer();
  if (!(await hasFeatureAccess(viewer.id, "competition", "plus"))) {
    redirect("/store?required=competition");
  }
  return <CompetitionCenter data={await getCompetitionData(viewer)} />;
}
