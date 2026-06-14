import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const skill = z.enum(["reading", "writing", "listening", "speaking", "vocabulary", "grammar"]);
const questionType = z.enum([
  "multiple_choice",
  "true_false",
  "short_answer",
  "essay",
  "dictation",
  "speaking",
  "fill_blank",
  "match_meaning",
  "sentence_order",
]);

const createSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("path"),
    slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
    titleVi: z.string().trim().min(2).max(160),
    titleEn: z.string().trim().max(160).optional(),
    titleJa: z.string().trim().max(160).optional(),
    titleTh: z.string().trim().max(160).optional(),
    descriptionVi: z.string().trim().max(1000).optional(),
    descriptionEn: z.string().trim().max(1000).optional(),
    descriptionJa: z.string().trim().max(1000).optional(),
    descriptionTh: z.string().trim().max(1000).optional(),
    targetLevel: z.string().trim().min(1).max(20),
    estimatedHours: z.coerce.number().int().min(1).max(1000),
    published: z.boolean(),
  }),
  z.object({
    kind: z.literal("unit"),
    pathId: z.uuid(),
    position: z.coerce.number().int().min(1).max(1000),
    titleVi: z.string().trim().min(2).max(160),
    titleEn: z.string().trim().max(160).optional(),
    titleJa: z.string().trim().max(160).optional(),
    titleTh: z.string().trim().max(160).optional(),
    descriptionVi: z.string().trim().max(1000).optional(),
    descriptionEn: z.string().trim().max(1000).optional(),
    descriptionJa: z.string().trim().max(1000).optional(),
    descriptionTh: z.string().trim().max(1000).optional(),
    skill,
    level: z.string().trim().min(1).max(20),
    estimatedMinutes: z.coerce.number().int().min(1).max(300),
  }),
  z.object({
    kind: z.literal("question"),
    unitId: z.uuid(),
    promptVi: z.string().trim().min(2).max(3000),
    promptEn: z.string().trim().max(3000).optional(),
    promptJa: z.string().trim().max(3000).optional(),
    promptTh: z.string().trim().max(3000).optional(),
    explanationVi: z.string().trim().max(3000).optional(),
    explanationEn: z.string().trim().max(3000).optional(),
    explanationJa: z.string().trim().max(3000).optional(),
    explanationTh: z.string().trim().max(3000).optional(),
    passage: z.string().trim().max(10000).optional(),
    audioUrl: z.string().trim().url().optional().or(z.literal("")),
    skill,
    questionType,
    difficulty: z.string().trim().min(1).max(20),
    options: z.array(z.string().trim().min(1).max(500)).max(10),
    answer: z.string().trim().min(1).max(2000),
    published: z.boolean(),
  }),
  z.object({
    kind: z.literal("challenge"),
    slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
    titleVi: z.string().trim().min(2).max(160),
    titleEn: z.string().trim().max(160).optional(),
    titleJa: z.string().trim().max(160).optional(),
    titleTh: z.string().trim().max(160).optional(),
    descriptionVi: z.string().trim().max(1000),
    descriptionEn: z.string().trim().max(1000).optional(),
    descriptionJa: z.string().trim().max(1000).optional(),
    descriptionTh: z.string().trim().max(1000).optional(),
    challengeType: z.enum(["daily", "weekly", "boss", "community"]),
    difficulty: z.enum(["easy", "normal", "hard", "legendary"]),
    eventType: z.string().trim().max(80).optional(),
    skill: skill.optional(),
    target: z.coerce.number().int().min(1).max(10000),
    pointsReward: z.coerce.number().int().min(0).max(100000),
    tokenReward: z.coerce.number().int().min(0).max(100000),
    levelRequired: z.coerce.number().int().min(1).max(1000),
    badgeIcon: z.string().trim().min(1).max(40),
    durationDays: z.coerce.number().int().min(1).max(365),
    published: z.boolean(),
  }),
]);

async function authorize() {
  const viewer = await getOptionalViewer();
  return viewer?.role === "admin" ? viewer : null;
}

export async function POST(request: Request) {
  const viewer = await authorize();
  if (!viewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const input = parsed.data;
  const admin = createAdminClient();
  let result: { data: unknown; error: { message: string } | null };

  if (input.kind === "path") {
    result = await admin.from("learning_paths").insert({
      slug: input.slug,
      title: { vi: input.titleVi, en: input.titleEn || input.titleVi, ja: input.titleJa || input.titleEn || input.titleVi, th: input.titleTh || input.titleEn || input.titleVi },
      description: { vi: input.descriptionVi || "", en: input.descriptionEn || input.descriptionVi || "", ja: input.descriptionJa || input.descriptionEn || input.descriptionVi || "", th: input.descriptionTh || input.descriptionEn || input.descriptionVi || "" },
      target_level: input.targetLevel,
      estimated_hours: input.estimatedHours,
      is_published: input.published,
      created_by: viewer.id,
    }).select().single();
  } else if (input.kind === "unit") {
    result = await admin.from("learning_units").insert({
      path_id: input.pathId,
      position: input.position,
      title: { vi: input.titleVi, en: input.titleEn || input.titleVi, ja: input.titleJa || input.titleEn || input.titleVi, th: input.titleTh || input.titleEn || input.titleVi },
      description: { vi: input.descriptionVi || "", en: input.descriptionEn || input.descriptionVi || "", ja: input.descriptionJa || input.descriptionEn || input.descriptionVi || "", th: input.descriptionTh || input.descriptionEn || input.descriptionVi || "" },
      skill: input.skill,
      level: input.level,
      estimated_minutes: input.estimatedMinutes,
      content: {},
    }).select().single();
  } else if (input.kind === "question") {
    const optionObjects = input.options.map((text, index) => ({
      id: String.fromCharCode(97 + index),
      text,
    }));
    const matchingOption = optionObjects.find(
      (option) => option.text.toLowerCase() === input.answer.toLowerCase(),
    );
    const answerKey =
      input.questionType === "dictation" || input.questionType === "sentence_order"
        ? { text: input.answer }
        : input.questionType === "speaking"
          ? {
              keywords: input.answer
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            }
          : input.questionType === "essay"
            ? { model: input.answer, min_words: 60, max_words: 180 }
            : { value: matchingOption?.id ?? input.answer };
    result = await admin.from("practice_questions").insert({
      unit_id: input.unitId,
      owner_id: null,
      skill: input.skill,
      question_type: input.questionType,
      prompt: { vi: input.promptVi, en: input.promptEn || input.promptVi, ja: input.promptJa || input.promptEn || input.promptVi, th: input.promptTh || input.promptEn || input.promptVi },
      explanation: { vi: input.explanationVi || "", en: input.explanationEn || input.explanationVi || "", ja: input.explanationJa || input.explanationEn || input.explanationVi || "", th: input.explanationTh || input.explanationEn || input.explanationVi || "" },
      passage: input.passage || null,
      audio_url: input.audioUrl || null,
      options: optionObjects.length ? optionObjects : null,
      answer_key: answerKey,
      difficulty: input.difficulty,
      is_public: input.published,
    }).select().single();
  } else {
    const now = new Date();
    const ends = new Date(now);
    ends.setDate(ends.getDate() + input.durationDays);
    result = await admin.from("learning_challenges").insert({
      slug: input.slug,
      title: { vi: input.titleVi, en: input.titleEn || input.titleVi, ja: input.titleJa || input.titleEn || input.titleVi, th: input.titleTh || input.titleEn || input.titleVi },
      description: { vi: input.descriptionVi, en: input.descriptionEn || input.descriptionVi, ja: input.descriptionJa || input.descriptionEn || input.descriptionVi, th: input.descriptionTh || input.descriptionEn || input.descriptionVi },
      challenge_type: input.challengeType,
      difficulty: input.difficulty,
      event_type: input.eventType || null,
      skill: input.skill || null,
      target_value: input.target,
      points_reward: input.pointsReward,
      token_reward: input.tokenReward,
      level_required: input.levelRequired,
      badge_icon: input.badgeIcon,
      starts_at: now.toISOString(),
      ends_at: ends.toISOString(),
      is_published: input.published,
      metadata: {},
    }).select().single();
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  const created = result.data as { id?: string; skill?: string } | null;
  if (input.kind === "challenge" && created?.id) {
    let questionsQuery = admin
      .from("practice_questions")
      .select("id")
      .eq("is_public", true)
      .limit(100);
    if (input.skill) questionsQuery = questionsQuery.eq("skill", input.skill);
    const { data: questions } = await questionsQuery;
    if (questions?.length) {
      await admin.from("challenge_question_pool").upsert(
        questions.map((question, index) => ({
          challenge_id: created.id,
          question_id: question.id,
          position: index + 1,
        })),
        { onConflict: "challenge_id,question_id" },
      );
    }
  }
  if (input.kind === "question" && created?.id) {
    const { data: challenges } = await admin
      .from("learning_challenges")
      .select("id")
      .eq("is_published", true)
      .or(`skill.is.null,skill.eq.${input.skill}`);
    if (challenges?.length) {
      await admin.from("challenge_question_pool").upsert(
        challenges.map((challenge) => ({
          challenge_id: challenge.id,
          question_id: created.id,
          position: 999,
        })),
        { onConflict: "challenge_id,question_id" },
      );
    }
  }
  await admin.from("admin_audit_logs").insert({
    admin_id: viewer.id,
    action: `content.${input.kind}.create`,
    target_type: input.kind,
    metadata: { input, result: result.data },
  });
  return NextResponse.json({ ok: true, data: result.data });
}

const patchSchema = z.object({
  table: z.enum(["learning_paths", "practice_questions", "learning_challenges"]),
  id: z.uuid(),
  published: z.boolean(),
});

export async function PATCH(request: Request) {
  const viewer = await authorize();
  if (!viewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const input = patchSchema.parse(await request.json());
  const column = input.table === "practice_questions" ? "is_public" : "is_published";
  const admin = createAdminClient();
  const { error } = await admin.from(input.table).update({ [column]: input.published }).eq("id", input.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin.from("admin_audit_logs").insert({
    admin_id: viewer.id,
    action: "content.publish.update",
    target_type: input.table,
    target_id: input.id,
    metadata: { published: input.published },
  });
  return NextResponse.json({ ok: true });
}

const deleteSchema = z.object({
  table: z.enum(["learning_paths", "learning_units", "practice_questions", "learning_challenges"]),
  id: z.uuid(),
});

export async function DELETE(request: Request) {
  const viewer = await authorize();
  if (!viewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const input = deleteSchema.parse(await request.json());
  const admin = createAdminClient();
  const { error } = await admin.from(input.table).delete().eq("id", input.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin.from("admin_audit_logs").insert({
    admin_id: viewer.id,
    action: "content.delete",
    target_type: input.table,
    target_id: input.id,
  });
  return NextResponse.json({ ok: true });
}
