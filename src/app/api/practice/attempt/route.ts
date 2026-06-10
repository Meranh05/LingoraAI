import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  questionId: z.uuid(),
  answer: z.unknown(),
  durationSeconds: z.number().int().min(0).max(14_400).default(0),
  module: z.enum(["practice", "quiz", "competition"]).default("practice"),
  challengeId: z.uuid().optional(),
  idempotencyKey: z.uuid(),
});

function normalize(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("en");
}

function words(value: unknown) {
  return normalize(value)
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean);
}

function similarity(expectedValue: unknown, actualValue: unknown) {
  const expected = words(expectedValue);
  const actual = words(actualValue);
  if (!expected.length) return 0;
  const remaining = [...actual];
  const matched = expected.filter((word) => {
    const index = remaining.indexOf(word);
    if (index < 0) return false;
    remaining.splice(index, 1);
    return true;
  }).length;
  return Math.round((matched / expected.length) * 100);
}

export async function POST(request: Request) {
  const viewer = await getOptionalViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = schema.parse(await request.json());
  const admin = createAdminClient();
  const { data: question, error: questionError } = await admin
    .from("practice_questions")
    .select("id,skill,question_type,answer_key,explanation,options")
    .eq("id", input.questionId)
    .single();
  if (questionError || !question) {
    return NextResponse.json({ error: "Không tìm thấy câu hỏi." }, { status: 404 });
  }

  const key = (question.answer_key ?? {}) as {
    value?: unknown;
    text?: string;
    keywords?: string[];
    min_words?: number;
    max_words?: number;
  };
  const options = (question.options ?? []) as Array<{ id?: string; text?: string }>;
  let score: number | null = null;
  if (question.question_type === "multiple_choice" || question.question_type === "true_false") {
    const selected = options.find((option) => normalize(option.id) === normalize(input.answer));
    score =
      normalize(input.answer) === normalize(key.value) ||
      normalize(selected?.text) === normalize(key.value)
        ? 100
        : 0;
  } else if (question.question_type === "dictation") {
    score = similarity(key.text ?? key.value, input.answer);
  } else if (question.question_type === "short_answer") {
    score = similarity(key.value ?? key.text, input.answer);
  } else if (question.question_type === "fill_blank") {
    score = normalize(key.value ?? key.text) === normalize(input.answer) ? 100 : similarity(key.value ?? key.text, input.answer);
  } else if (question.question_type === "match_meaning") {
    const selected = options.find((option) => normalize(option.id) === normalize(input.answer));
    score =
      normalize(input.answer) === normalize(key.value) ||
      normalize(selected?.text) === normalize(key.value)
        ? 100
        : 0;
  } else if (question.question_type === "sentence_order") {
    const ordered = Array.isArray(input.answer)
      ? input.answer.join(" ")
      : input.answer;
    score = similarity(key.text ?? key.value, ordered);
  } else if (question.question_type === "speaking") {
    const keywords = key.keywords ?? [];
    score = keywords.length
      ? similarity(keywords.join(" "), input.answer)
      : Math.min(100, words(input.answer).length * 10);
  } else if (question.question_type === "essay") {
    const count = words(input.answer).length;
    const minimum = key.min_words ?? 60;
    const maximum = key.max_words ?? 180;
    score =
      count < minimum
        ? Math.round((count / minimum) * 80)
        : count <= maximum
          ? 100
          : Math.max(60, 100 - Math.round(((count - maximum) / maximum) * 40));
  }

  const { data: secureResult, error } = await admin.rpc(
    "record_secure_practice_attempt",
    {
      target_user_id: viewer.id,
      target_question_id: question.id,
      target_answer: { value: input.answer },
      target_score: score ?? 0,
      target_feedback: question.explanation ?? {},
      target_duration_seconds: input.durationSeconds,
      target_idempotency_key: input.idempotencyKey,
      target_challenge_id: input.challengeId ?? null,
    },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const secured = secureResult?.[0] as
    | {
        attempt_id: string;
        reward_eligible: boolean;
        xp_awarded: number;
        tokens_awarded: number;
        cooldown_seconds: number;
      }
    | undefined;
  if (!secured) {
    return NextResponse.json({ error: "Không thể ghi nhận lượt học." }, { status: 500 });
  }
  if (input.module === "quiz" && score !== null) {
    await admin.from("quiz_results").insert({
      user_id: viewer.id,
      quiz_type: question.skill,
      score: score === 100 ? 1 : 0,
      total: 1,
      details: { question_id: question.id, attempt_id: secured.attempt_id },
    });
  }
  return NextResponse.json({
    attempt: { id: secured.attempt_id },
    score,
    explanation: question.explanation,
    rewards: {
      xp: secured.xp_awarded,
      tokens: secured.tokens_awarded,
    },
    rewardEligible: secured.reward_eligible,
    cooldownSeconds: secured.cooldown_seconds,
  });
}
