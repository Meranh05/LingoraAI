import { NextResponse } from "next/server";
import { getOptionalViewer } from "@/lib/auth";

export async function GET() {
  if (!(await getOptionalViewer())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      configured: {
        gemini: Boolean(process.env.GEMINI_API_KEY),
        groq: Boolean(process.env.GROQ_API_KEY),
        openai: Boolean(process.env.OPENAI_API_KEY),
        openrouter: Boolean(process.env.OPENROUTER_API_KEY),
        anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
