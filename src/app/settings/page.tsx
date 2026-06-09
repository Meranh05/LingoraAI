import type { Metadata } from "next";
import { SettingsHub } from "@/components/settings-hub";
import { requireViewer } from "@/lib/auth";
import { getProfileSettings } from "@/lib/learning-data";

export const metadata: Metadata = {
  title: "Cài đặt AI",
};

export default async function SettingsPage() {
  const viewer = await requireViewer();
  return <SettingsHub viewer={viewer} profile={await getProfileSettings(viewer)} />;
}
