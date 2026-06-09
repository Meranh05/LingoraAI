import type { Metadata } from "next";
import { AiTutor } from "@/components/ai-tutor";

export const metadata: Metadata = {
  title: "Gia sư AI",
};

export default function AiTutorPage() {
  return <AiTutor />;
}
