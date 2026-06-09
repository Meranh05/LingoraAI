import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  inputText: z.string().max(30_000).optional(),
  outputText: z.string().min(1).max(30_000),
  rating: z.union([z.literal(-1), z.literal(1)]),
  correction: z.string().max(30_000).optional(),
  category: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  const viewer = await getOptionalViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = schema.parse(await request.json());

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_training_consent")
    .eq("id", viewer.id)
    .single();
  const { error } = await supabase.from("ai_feedback").insert({
    user_id: viewer.id,
    input_text: input.inputText,
    output_text: input.outputText,
    rating: input.rating,
    correction: input.correction,
    category: input.category,
    consent_snapshot: Boolean(profile?.ai_training_consent),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (input.correction) {
    await supabase.from("ai_memories").insert({
      user_id: viewer.id,
      category: "correction",
      content: input.correction,
      confidence: 0.8,
      expires_at: new Date(Date.now() + 90 * 86_400_000).toISOString(),
    });
  }
  return NextResponse.json({ ok: true });
}
