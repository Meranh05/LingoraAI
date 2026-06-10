import type { Metadata } from "next";
import { BillingCenter } from "@/components/billing-center";
import { requireViewer } from "@/lib/auth";
import { getBillingDashboard } from "@/lib/billing";

export const metadata: Metadata = { title: "Gói và thanh toán" };

export default async function BillingPage() {
  const viewer = await requireViewer();
  return <BillingCenter data={await getBillingDashboard(viewer.id)} />;
}
