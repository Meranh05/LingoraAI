import { Roadmap } from "@/components/roadmap";
import { requireViewer } from "@/lib/auth";
import { getRoadmapData } from "@/lib/learning-data";

export default async function RoadmapPage() {
  const viewer = await requireViewer();
  return <Roadmap data={await getRoadmapData(viewer)} />;
}
