import { requireAdmin } from "@/lib/auth";
import { AdminContentPage } from "@/components/admin-sections";
import { getAdminOverview } from "@/lib/admin-data";
import { getAdminContentStudioData } from "@/lib/admin-content";

export default async function ContentPage() {
  await requireAdmin();
  const [overview, studio] = await Promise.all([
    getAdminOverview(),
    getAdminContentStudioData(),
  ]);
  return <AdminContentPage stats={overview.contentStats} studio={studio} />;
}
