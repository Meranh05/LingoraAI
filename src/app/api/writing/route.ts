import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hasFeatureAccess } from "@/lib/economy";

const schema = z.object({
  originalText: z.string().trim().min(1).max(30_000),
  correctedText: z.string().trim().min(1).max(30_000),
  feedbackVi: z.string().trim().max(30_000).optional(),
  score: z.number().min(0).max(10).optional(),
});

export async function POST(request: Request) {
  const viewer = await getOptionalViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await hasFeatureAccess(viewer.id, "writing", "basic"))) {
    return NextResponse.json(
      {
        error: "Sửa bài viết yêu cầu gói Basic, Plus hoặc Pro.",
        code: "PLAN_UPGRADE_REQUIRED",
        requiredPlan: "basic",
      },
      { status: 403 },
    );
  }
  const input = schema.parse(await request.json());
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("writing_reviews")
    .insert({
      user_id: viewer.id,
      original_text: input.originalText,
      corrected_text: input.correctedText,
      feedback_vi: input.feedbackVi || null,
      score: input.score ?? null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await supabase.from("learning_events").insert({
    user_id: viewer.id,
    event_type: "writing_review",
    skill: "writing",
    metadata: { review_id: data.id },
  });
  return NextResponse.json({ review: data });
}
