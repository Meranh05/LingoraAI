import type { Metadata } from "next";
import { AiSettings } from "@/components/ai-settings";

export const metadata: Metadata = {
  title: "Cài đặt AI",
};

export default function SettingsPage() {
  return <AiSettings />;
}
