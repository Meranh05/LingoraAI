import { requireAdmin } from "@/lib/auth";
import { AdminSystemPage } from "@/components/admin-sections";

export default async function SystemPage() {
  await requireAdmin();
  return <AdminSystemPage />;
}
