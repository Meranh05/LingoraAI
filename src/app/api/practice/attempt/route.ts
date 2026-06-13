import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalViewer } from "@/lib/auth";
import {
  answerWords,
  normalizeAnswer,
  orderedSentenceScore,
  wordSimilarity,
} from "@/lib/practice-scoring";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  questionId: z.uuid(),
  answer: z.unknown(),
  durationSeconds: z.number().int().min(0).max(14_400).default(0),
  module: z.enum(["practice", "quiz", "competition"]).default("practice"),
  challengeId: z.uuid().optional(),
  unitId: z.uuid().optional(),
  unitSessionId: z.uuid().optional(),
  idempotencyKey: z.uuid(),
}).refine(
  (value) =>
    (!value.unitId && !value.unitSessionId) ||
    Boolean(value.unitId && value.unitSessionId),
  { message: "unitId và unitSessionId phải được gửi cùng nhau." },
);

export async function POST(request: Request) {
  const viewer = await getOptionalViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = schema.parse(await request.json());
  const admin = createAdminClient();
  const { data: question, error: questionError } = await admin
    .from("practice_questions")
    .select("id,unit_id,skill,question_type,answer_key,explanation,options")
    .eq("id", input.questionId)
    .single();
  if (questionError || !question) {
    return NextResponse.json({ error: "Không tìm thấy câu hỏi." }, { status: 404 });
  }
  if (input.unitId && question.unit_id !== input.unitId) {
    return NextResponse.json(
      { error: "Câu hỏi không thuộc chặng học hiện tại." },
      { status: 403 },
    );
  }
  if (input.unitId && input.unitSessionId) {
    const { data: activeSession } = await admin
      .from("learning_unit_sessions")
      .select("id")
      .eq("id", input.unitSessionId)
      .eq("user_id", viewer.id)
      .eq("unit_id", input.unitId)
      .eq("status", "active")
      .maybeSingle();
    if (!activeSession) {
      return NextResponse.json(
        { error: "Phiên học không còn hoạt động. Hãy mở lại chặng." },
        { status: 403 },
      );
    }
  }
  if (question.unit_id && input.module !== "competition") {
    const { data: unit } = await admin
      .from("learning_units")
      .select("path_id,position")
      .eq("id", question.unit_id)
      .maybeSingle();
    if (unit) {
      const [{ data: enrollment }, { data: previous }] = await Promise.all([
        admin
          .from("user_path_enrollments")
          .select("id")
          .eq("user_id", viewer.id)
          .eq("path_id", unit.path_id)
          .maybeSingle(),
        admin
          .from("learning_units")
          .select("id")
          .eq("path_id", unit.path_id)
          .lt("position", unit.position)
          .order("position", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (enrollment && previous) {
        const { data: previousProgress } = await admin
          .from("user_unit_progress")
          .select("completed_at")
          .eq("user_id", viewer.id)
          .eq("unit_id", previous.id)
          .maybeSingle();
        if (!previousProgress?.completed_at) {
          return NextResponse.json(
            { error: "Hãy hoàn thành checkpoint trước để mở bài học này." },
            { status: 403 },
          );
        }
      }
    }
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
    const selected = options.find((option) => normalizeAnswer(option.id) === normalizeAnswer(input.answer));
    score =
      normalizeAnswer(input.answer) === normalizeAnswer(key.value) ||
      normalizeAnswer(selected?.text) === normalizeAnswer(key.value)
        ? 100
        : 0;
  } else if (question.question_type === "dictation") {
    score = wordSimilarity(key.text ?? key.value, input.answer);
  } else if (question.question_type === "short_answer") {
    score = wordSimilarity(key.value ?? key.text, input.answer);
  } else if (question.question_type === "fill_blank") {
    score = normalizeAnswer(key.value ?? key.text) === normalizeAnswer(input.answer)
      ? 100
      : wordSimilarity(key.value ?? key.text, input.answer);
  } else if (question.question_type === "match_meaning") {
    const selected = options.find((option) => normalizeAnswer(option.id) === normalizeAnswer(input.answer));
    score =
      normalizeAnswer(input.answer) === normalizeAnswer(key.value) ||
      normalizeAnswer(selected?.text) === normalizeAnswer(key.value)
        ? 100
        : 0;
  } else if (question.question_type === "sentence_order") {
    const ordered = Array.isArray(input.answer)
      ? input.answer.join(" ")
      : input.answer;
    score = orderedSentenceScore(key.text ?? key.value, ordered);
  } else if (question.question_type === "speaking") {
    const keywords = key.keywords ?? [];
    score = keywords.length
      ? wordSimilarity(keywords.join(" "), input.answer)
      : Math.min(100, answerWords(input.answer).length * 10);
  } else if (question.question_type === "essay") {
    const count = answerWords(input.answer).length;
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
  if (input.unitId && input.unitSessionId) {
    const { error: sessionError } = await admin.rpc(
      "attach_attempt_to_unit_session",
      {
        target_user_id: viewer.id,
        target_session_id: input.unitSessionId,
        target_unit_id: input.unitId,
        target_question_id: question.id,
        target_attempt_id: secured.attempt_id,
      },
    );
    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 403 });
    }
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
    correctAnswer:
      question.question_type === "multiple_choice" ||
      question.question_type === "true_false" ||
      question.question_type === "match_meaning"
        ? options.find(
            (option) =>
              normalizeAnswer(option.id) === normalizeAnswer(key.value) ||
              normalizeAnswer(option.text) === normalizeAnswer(key.value),
          )?.text ?? String(key.value ?? "")
        : String(key.text ?? key.value ?? ""),
  });
}
