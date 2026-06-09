import { requireAdmin } from "@/lib/auth";
import { AdminAiPage } from "@/components/admin-sections";

export default async function AiLabPage() {
  await requireAdmin();
  return <AdminAiPage />;
}
