import { Dashboard } from "@/components/dashboard";
import { requireViewer } from "@/lib/auth";
import { getDashboardData } from "@/lib/learning-data";

export default async function HomePage() {
  const viewer = await requireViewer();
  return <Dashboard data={await getDashboardData(viewer)} />;
}
