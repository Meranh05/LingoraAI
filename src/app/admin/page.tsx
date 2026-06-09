import { requireAdmin } from "@/lib/auth";
import { getAdminOverview } from "@/lib/admin-data";
import { AdminDashboard } from "@/components/admin-dashboard";

export default async function AdminPage() {
  await requireAdmin();
  const overview = await getAdminOverview();
  return <AdminDashboard initial={overview} />;
}
