import type { Metadata } from "next";
import { AiTutor } from "@/components/ai-tutor";
import { requireViewer } from "@/lib/auth";
import { getTutorData } from "@/lib/learning-data";

export const metadata: Metadata = {
  title: "Gia sư AI",
};

export default async function AiTutorPage() {
  const viewer = await requireViewer();
  return <AiTutor initial={await getTutorData(viewer)} />;
}
