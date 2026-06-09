import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  documentId: z.uuid(),
  kind: z.enum(["summary", "questions", "vocabulary"]),
  content: z.string().trim().min(1).max(100_000),
  provider: z.string().max(80).optional(),
  model: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const viewer = await getOptionalViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = schema.parse(await request.json());
  const supabase = await createClient();
  const { data: document } = await supabase
    .from("documents")
    .select("id")
    .eq("id", input.documentId)
    .eq("user_id", viewer.id)
    .single();
  if (!document) return NextResponse.json({ error: "Không tìm thấy tài liệu." }, { status: 404 });

  const { data, error } = await supabase
    .from("document_ai_outputs")
    .insert({
      document_id: document.id,
      user_id: viewer.id,
      kind: input.kind,
      content: input.content,
      provider: input.provider || null,
      model: input.model || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (input.kind === "summary") {
    await supabase
      .from("documents")
      .update({ summary_vi: input.content })
      .eq("id", document.id)
      .eq("user_id", viewer.id);
  }
  return NextResponse.json({ output: data });
}
