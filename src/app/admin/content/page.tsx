import { requireAdmin } from "@/lib/auth";
import { AdminContentPage } from "@/components/admin-sections";
import { getAdminOverview } from "@/lib/admin-data";

export default async function ContentPage() {
  await requireAdmin();
  const overview = await getAdminOverview();
  return <AdminContentPage stats={overview.contentStats} />;
}
