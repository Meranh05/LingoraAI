import { AdminBilling } from "@/components/admin-billing";
import { getAdminBillingData } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";

export default async function AdminBillingPage() {
  await requireAdmin();
  const data = await getAdminBillingData();
  return <AdminBilling data={data} />;
}
