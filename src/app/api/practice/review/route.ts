import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  questionId: z.uuid(),
  difficult: z.boolean(),
  score: z.number().min(0).max(100).default(0),
});

export async function POST(request: Request) {
  const viewer = await getOptionalViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = schema.parse(await request.json());
  const admin = createAdminClient();
  const { error } = await admin.rpc("set_question_review_state", {
    target_user_id: viewer.id,
    target_question_id: input.questionId,
    target_difficult: input.difficult,
    target_score: input.score,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ saved: true });
}
