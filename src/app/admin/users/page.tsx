import { requireAdmin } from "@/lib/auth";
import { getAdminOverview } from "@/lib/admin-data";
import { AdminUsersPage } from "@/components/admin-sections";

export default async function UsersPage() {
  await requireAdmin();
  const overview = await getAdminOverview();
  return <AdminUsersPage users={overview.users} />;
}
