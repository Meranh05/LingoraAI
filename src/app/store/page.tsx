import type { Metadata } from "next";
import { EconomyStore } from "@/components/economy-store";
import { requireViewer } from "@/lib/auth";
import { getEconomyData } from "@/lib/economy";

export const metadata: Metadata = { title: "XP, Token và cửa hàng" };

export default async function StorePage() {
  const viewer = await requireViewer();
  return <EconomyStore data={await getEconomyData(viewer.id, viewer.locale)} />;
}
