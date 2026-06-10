import { requireAdmin } from "@/lib/auth";
import { AdminAiPage } from "@/components/admin-sections";
import { getTrainingCandidates } from "@/lib/admin-data";

export default async function AiLabPage() {
  await requireAdmin();
  return <AdminAiPage initialCandidates={await getTrainingCandidates()} />;
}
