import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  locale: z.enum(["vi", "en", "ja", "th"]).optional(),
  learningGoal: z.string().max(500).optional(),
  dailyGoalMinutes: z.number().int().min(5).max(240).optional(),
  aiTrainingConsent: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const viewer = await getOptionalViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = schema.parse(await request.json());

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      ...(input.fullName !== undefined ? { full_name: input.fullName } : {}),
      ...(input.locale !== undefined ? { locale: input.locale } : {}),
      ...(input.learningGoal !== undefined
        ? { learning_goal: input.learningGoal }
        : {}),
      ...(input.dailyGoalMinutes !== undefined
        ? { daily_goal_minutes: input.dailyGoalMinutes }
        : {}),
      ...(input.aiTrainingConsent !== undefined
        ? {
            ai_training_consent: input.aiTrainingConsent,
            consent_updated_at: new Date().toISOString(),
          }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", viewer.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
