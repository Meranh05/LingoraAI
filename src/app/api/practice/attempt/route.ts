import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  questionId: z.uuid(),
  answer: z.unknown(),
  durationSeconds: z.number().int().min(0).max(14_400).default(0),
  module: z.enum(["practice", "quiz"]).default("practice"),
});

function normalize(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("en");
}

export async function POST(request: Request) {
  const viewer = await getOptionalViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = schema.parse(await request.json());
  const supabase = await createClient();
  const { data: question, error: questionError } = await supabase
    .from("practice_questions")
    .select("id,skill,question_type,answer_key,explanation")
    .eq("id", input.questionId)
    .single();
  if (questionError || !question) {
    return NextResponse.json({ error: "Không tìm thấy câu hỏi." }, { status: 404 });
  }

  const key = (question.answer_key ?? {}) as { value?: unknown; text?: string };
  let score: number | null = null;
  if (question.question_type === "multiple_choice" || question.question_type === "true_false") {
    score = normalize(input.answer) === normalize(key.value) ? 100 : 0;
  } else if (question.question_type === "dictation" && key.text) {
    const expected = new Set(normalize(key.text).replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/));
    const actual = new Set(normalize(input.answer).replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/));
    const matched = [...expected].filter((word) => actual.has(word)).length;
    score = expected.size ? Math.round((matched / expected.size) * 100) : 0;
  }

  const { data, error } = await supabase
    .from("practice_attempts")
    .insert({
      user_id: viewer.id,
      question_id: question.id,
      skill: question.skill,
      answer: { value: input.answer },
      score,
      feedback: question.explanation ?? {},
      duration_seconds: input.durationSeconds,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (input.module === "quiz" && score !== null) {
    await supabase.from("quiz_results").insert({
      user_id: viewer.id,
      quiz_type: question.skill,
      score: score === 100 ? 1 : 0,
      total: 1,
      details: { question_id: question.id, attempt_id: data.id },
    });
  }
  return NextResponse.json({ attempt: data, score, explanation: question.explanation });
}
