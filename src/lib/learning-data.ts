import "server-only";
import type { Viewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Localized = Record<string, string> | null;

export type SkillProgress = {
  skill: string;
  level: string;
  mastery: number;
  totalMinutes: number;
  totalAttempts: number;
  lastPracticedAt: string | null;
};

function localized(value: Localized, locale: string, fallback = "") {
  return value?.[locale] ?? value?.vi ?? value?.en ?? fallback;
}

function assertNoError(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export async function getDashboardData(viewer: Viewer) {
  const supabase = await createClient();
  const admin = createAdminClient();
  await admin.rpc("refresh_recurring_challenges");
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const [
    profileResult,
    progressResult,
    vocabularyResult,
    documentsResult,
    eventsResult,
    enrollmentResult,
    walletResult,
    challengesResult,
    participantsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("learning_goal,daily_goal_minutes")
      .eq("id", viewer.id)
      .single(),
    supabase
      .from("user_skill_progress")
      .select("skill,level,mastery,total_minutes,total_attempts,last_practiced_at")
      .eq("user_id", viewer.id)
      .order("last_practiced_at", { ascending: false }),
    supabase
      .from("vocabulary")
      .select("id,word,meaning_vi,level,next_review_at,created_at")
      .eq("user_id", viewer.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("documents")
      .select("id,file_name,status,created_at")
      .eq("user_id", viewer.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("learning_events")
      .select("duration_seconds,created_at")
      .eq("user_id", viewer.id)
      .gte("created_at", weekStart.toISOString())
      .order("created_at"),
    supabase
      .from("user_path_enrollments")
      .select("progress_percent,learning_paths(title,target_level)")
      .eq("user_id", viewer.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("user_wallets")
      .select("xp,tokens")
      .eq("user_id", viewer.id)
      .maybeSingle(),
    supabase
      .from("learning_challenges")
      .select("id,title,description,target_value,points_reward,token_reward,challenge_type,difficulty,badge_icon,level_required,ends_at,metadata")
      .eq("is_published", true)
      .lte("starts_at", new Date().toISOString())
      .gte("ends_at", new Date().toISOString())
      .order("challenge_type"),
    supabase
      .from("challenge_participants")
      .select("challenge_id,progress,completed_at")
      .eq("user_id", viewer.id),
  ]);

  [
    ["Hồ sơ", profileResult.error],
    ["Tiến độ kỹ năng", progressResult.error],
    ["Từ vựng", vocabularyResult.error],
    ["Tài liệu", documentsResult.error],
    ["Sự kiện học", eventsResult.error],
    ["Lộ trình", enrollmentResult.error],
    ["Ví XP/token", walletResult.error],
    ["Thử thách", challengesResult.error],
    ["Tiến độ thử thách", participantsResult.error],
  ].forEach(([context, error]) =>
    assertNoError(error as { message: string } | null, context as string),
  );

  const weekly = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    const minutes = (eventsResult.data ?? [])
      .filter((event) => event.created_at.slice(0, 10) === key)
      .reduce((sum, event) => sum + event.duration_seconds / 60, 0);
    return {
      day: new Intl.DateTimeFormat(viewer.locale, { weekday: "short" }).format(date),
      minutes: Math.round(minutes),
    };
  });

  const progress: SkillProgress[] = (progressResult.data ?? []).map((row) => ({
    skill: row.skill,
    level: row.level,
    mastery: Number(row.mastery),
    totalMinutes: row.total_minutes,
    totalAttempts: row.total_attempts,
    lastPracticedAt: row.last_practiced_at,
  }));
  const totalMinutes = weekly.reduce((sum, day) => sum + day.minutes, 0);
  const goalMinutes = (profileResult.data?.daily_goal_minutes ?? 20) * 7;
  const enrollment = enrollmentResult.data as {
    progress_percent?: number | string;
    learning_paths?: { title?: Localized; target_level?: string } | null;
  } | null;
  const participantMap = new Map(
    (participantsResult.data ?? []).map((item) => [item.challenge_id, item]),
  );

  return {
    learningGoal: profileResult.data?.learning_goal ?? "",
    dailyGoalMinutes: profileResult.data?.daily_goal_minutes ?? 20,
    totalMinutes,
    goalPercent: goalMinutes
      ? Math.min(100, Math.round((totalMinutes / goalMinutes) * 100))
      : 0,
    weekly,
    progress,
    vocabulary: vocabularyResult.data ?? [],
    documents: documentsResult.data ?? [],
    enrollment: enrollment
      ? {
          title: localized(enrollment.learning_paths?.title ?? null, viewer.locale),
          targetLevel: enrollment.learning_paths?.target_level ?? "",
          progress: Number(enrollment.progress_percent ?? 0),
        }
      : null,
    wallet: walletResult.data ?? { xp: 0, tokens: 0 },
    challenges: (challengesResult.data ?? []).map((challenge) => {
      const participant = participantMap.get(challenge.id);
      return {
        id: challenge.id,
        title: localized(challenge.title as Localized, viewer.locale),
        description: localized(challenge.description as Localized, viewer.locale),
        target: challenge.target_value,
        rewardXp: challenge.points_reward,
        rewardTokens: challenge.token_reward,
        type: challenge.challenge_type,
        difficulty: challenge.difficulty,
        badgeIcon: challenge.badge_icon,
        levelRequired: challenge.level_required,
        endsAt: challenge.ends_at,
        progress: participant?.progress ?? 0,
        completed: Boolean(participant?.completed_at),
        joined: Boolean(participant),
        mascot: String((challenge.metadata as { mascot?: string } | null)?.mascot ?? "champion"),
      };
    }),
  };
}

export async function getRoadmapData(viewer: Viewer) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: path, error: pathError } = await supabase
    .from("learning_paths")
    .select("id,title,description,target_level,estimated_hours")
    .eq("is_published", true)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  assertNoError(pathError, "Lộ trình");
  if (!path) return null;

  const [
    { data: units, error: unitsError },
    { data: enrollment, error: enrollmentError },
    { data: unitProgress, error: unitProgressError },
    { data: unitQuestions, error: unitQuestionsError },
  ] =
    await Promise.all([
      supabase
        .from("learning_units")
        .select("id,position,title,description,skill,level,estimated_minutes,unlock_mastery,content")
        .eq("path_id", path.id)
        .order("position"),
      supabase
        .from("user_path_enrollments")
        .select("id,progress_percent,current_unit_id,status")
        .eq("user_id", viewer.id)
        .eq("path_id", path.id)
        .maybeSingle(),
      supabase
        .from("user_unit_progress")
        .select("unit_id,mastery,best_score,attempts,passed_questions,total_questions,completed_at")
        .eq("user_id", viewer.id),
      admin
        .from("practice_questions")
        .select("unit_id")
        .eq("is_public", true)
        .not("unit_id", "is", null),
    ]);
  assertNoError(unitsError, "Bài học");
  assertNoError(enrollmentError, "Đăng ký lộ trình");
  assertNoError(unitProgressError, "Tiến độ checkpoint");
  assertNoError(unitQuestionsError, "Số câu hỏi checkpoint");
  const progressMap = new Map((unitProgress ?? []).map((item) => [item.unit_id, item]));
  const questionCounts = new Map<string, number>();
  (unitQuestions ?? []).forEach((item) => {
    if (item.unit_id) questionCounts.set(item.unit_id, (questionCounts.get(item.unit_id) ?? 0) + 1);
  });

  return {
    id: path.id,
    title: localized(path.title as Localized, viewer.locale),
    description: localized(path.description as Localized, viewer.locale),
    targetLevel: path.target_level,
    estimatedHours: path.estimated_hours,
    progress: Number(enrollment?.progress_percent ?? 0),
    enrolled: Boolean(enrollment),
    currentUnitId: enrollment?.current_unit_id ?? null,
    units: (units ?? []).map((unit) => {
      const saved = progressMap.get(unit.id);
      return {
        id: unit.id,
        position: unit.position,
        title: localized(unit.title as Localized, viewer.locale),
        description: localized(unit.description as Localized, viewer.locale),
        skill: unit.skill,
        level: unit.level,
        estimatedMinutes: unit.estimated_minutes,
        unlockMastery: unit.unlock_mastery,
        mascot: String((unit.content as { mascot?: string } | null)?.mascot ?? "read"),
        mastery: Number(saved?.mastery ?? 0),
        bestScore: Number(saved?.best_score ?? 0),
        attempts: saved?.attempts ?? 0,
        passedQuestions: saved?.passed_questions ?? 0,
        totalQuestions: saved?.total_questions ?? questionCounts.get(unit.id) ?? 0,
        completed: Boolean(saved?.completed_at),
      };
    }),
  };
}

export async function getLearningWorkspaceData(
  viewer: Viewer,
  options?: { challengeId?: string; kind?: string; unitId?: string },
) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const kind = options?.kind;
  let challengeQuestionIds: string[] | null = null;
  if (options?.challengeId) {
    const { data: pool, error } = await supabase
      .from("challenge_question_pool")
      .select("question_id")
      .eq("challenge_id", options.challengeId)
      .order("position");
    assertNoError(error, "Bộ câu hỏi thi đấu");
    challengeQuestionIds = (pool ?? []).map((item) => item.question_id);
  }
  let questionQuery = admin
    .from("practice_questions")
    .select("id,unit_id,skill,question_type,prompt,passage,audio_url,options,difficulty")
    .eq("is_public", true)
    .order("created_at")
    .limit(300);
  if (challengeQuestionIds) {
    questionQuery = questionQuery.in(
      "id",
      challengeQuestionIds.length ? challengeQuestionIds : ["00000000-0000-0000-0000-000000000000"],
    );
  } else if (options?.unitId) {
    questionQuery = questionQuery.eq("unit_id", options.unitId);
  } else if (kind && ["reading", "listening", "speaking"].includes(kind)) {
    questionQuery = questionQuery.eq("skill", kind);
  } else if (kind && !["quiz", "practice"].includes(kind)) {
    questionQuery = questionQuery.in("id", ["00000000-0000-0000-0000-000000000000"]);
  }
  const vocabularyPromise =
    !kind || ["vocabulary", "flashcards", "search"].includes(kind)
      ? supabase.from("vocabulary").select("*").eq("user_id", viewer.id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null });
  const documentsPromise =
    !kind || ["documents", "search"].includes(kind)
      ? supabase.from("documents").select("id,file_name,file_type,status,summary_vi,summary_en,created_at").eq("user_id", viewer.id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null });
  const progressPromise =
    !kind || ["progress", "practice"].includes(kind)
      ? supabase.from("user_skill_progress").select("*").eq("user_id", viewer.id).order("skill")
      : Promise.resolve({ data: [], error: null });
  const attemptsPromise =
    kind && ["reading", "listening", "speaking", "quiz", "practice", "competition"].includes(kind)
      ? supabase
          .from("practice_attempts")
          .select("id,question_id,skill,score,created_at")
          .eq("user_id", viewer.id)
          .order("created_at", { ascending: false })
          .limit(120)
      : Promise.resolve({ data: [], error: null });
  const reviewQueuePromise =
    kind === "practice"
      ? admin
          .from("user_question_review_queue")
          .select(
            "question_id,source_unit_id,reason,last_score,updated_at,practice_questions(prompt,skill,difficulty)",
          )
          .eq("user_id", viewer.id)
          .is("mastered_at", null)
          .order("updated_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [], error: null });
  const [
    vocabulary,
    documents,
    questions,
    attempts,
    reviews,
    results,
    progress,
    reviewQueue,
  ] = await Promise.all([
    vocabularyPromise,
    documentsPromise,
    questionQuery,
    attemptsPromise,
    Promise.resolve({ data: [], error: null }),
    Promise.resolve({ data: [], error: null }),
    progressPromise,
    reviewQueuePromise,
  ]);
  const resultsToCheck = [vocabulary, documents, questions, attempts, reviews, results, progress, reviewQueue];
  resultsToCheck.forEach((result) => assertNoError(result.error, "Dữ liệu học tập"));
  const attemptStats = new Map<string, { best: number; last: string; count: number }>();
  (attempts.data ?? []).forEach((attempt) => {
    if (!attempt.question_id) return;
    const saved = attemptStats.get(attempt.question_id) ?? {
      best: 0,
      last: "",
      count: 0,
    };
    saved.best = Math.max(saved.best, Number(attempt.score ?? 0));
    saved.last = saved.last > attempt.created_at ? saved.last : attempt.created_at;
    saved.count += 1;
    attemptStats.set(attempt.question_id, saved);
  });
  const adaptiveQuestions = (questions.data ?? [])
    .map((question) => ({
      ...question,
      options: Array.isArray(question.options)
        ? (question.options as unknown[]).map((option: unknown, index: number) =>
            typeof option === "string"
              ? { id: String.fromCharCode(97 + index), text: option }
              : (option as { id: string; text: string }),
          )
        : null,
    }))
    .sort((left, right) => {
      const a = attemptStats.get(left.id);
      const b = attemptStats.get(right.id);
      if (!a && b) return -1;
      if (a && !b) return 1;
      if ((a?.best ?? 0) !== (b?.best ?? 0)) return (a?.best ?? 0) - (b?.best ?? 0);
      if ((a?.count ?? 0) !== (b?.count ?? 0)) return (a?.count ?? 0) - (b?.count ?? 0);
      return (a?.last ?? "").localeCompare(b?.last ?? "");
    });
  return {
    vocabulary: vocabulary.data ?? [],
    documents: documents.data ?? [],
    questions: adaptiveQuestions,
    attempts: attempts.data ?? [],
    reviews: reviews.data ?? [],
    quizResults: results.data ?? [],
    progress: progress.data ?? [],
    reviewQueue: reviewQueue.data ?? [],
  };
}

export async function getUnitLessonData(viewer: Viewer, unitId: string) {
  const supabase = await createClient();
  const [
    { data: unit, error: unitError },
    { data: enrollment, error: enrollmentError },
    { data: progress, error: progressError },
  ] = await Promise.all([
    supabase
      .from("learning_units")
      .select("id,path_id,position,title,description,skill,level,estimated_minutes,unlock_mastery,content,learning_paths!inner(is_published)")
      .eq("id", unitId)
      .eq("learning_paths.is_published", true)
      .maybeSingle(),
    supabase
      .from("user_path_enrollments")
      .select("path_id,current_unit_id,status")
      .eq("user_id", viewer.id),
    supabase
      .from("user_unit_progress")
      .select("unit_id,mastery,best_score,attempts,passed_questions,total_questions,completed_at")
      .eq("user_id", viewer.id),
  ]);
  assertNoError(unitError, "Checkpoint");
  assertNoError(enrollmentError, "Đăng ký lộ trình");
  assertNoError(progressError, "Tiến độ checkpoint");
  if (!unit) return null;

  const pathEnrollment = (enrollment ?? []).find((item) => item.path_id === unit.path_id);
  if (!pathEnrollment) return { locked: true as const, reason: "not_enrolled" as const };

  const { data: previous } = await supabase
    .from("learning_units")
    .select("id")
    .eq("path_id", unit.path_id)
    .lt("position", unit.position)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const progressMap = new Map((progress ?? []).map((item) => [item.unit_id, item]));
  if (previous && !progressMap.get(previous.id)?.completed_at) {
    return { locked: true as const, reason: "previous_incomplete" as const };
  }
  const saved = progressMap.get(unit.id);
  return {
    locked: false as const,
    lesson: {
      id: unit.id,
      position: unit.position,
      title: localized(unit.title as Localized, viewer.locale),
      description: localized(unit.description as Localized, viewer.locale),
      skill: unit.skill,
      level: unit.level,
      estimatedMinutes: unit.estimated_minutes,
      unlockMastery: unit.unlock_mastery,
      mascot: String((unit.content as { mascot?: string } | null)?.mascot ?? "read"),
      mastery: Number(saved?.mastery ?? 0),
      bestScore: Number(saved?.best_score ?? 0),
      attempts: saved?.attempts ?? 0,
      passedQuestions: saved?.passed_questions ?? 0,
      totalQuestions: saved?.total_questions ?? 0,
      completed: Boolean(saved?.completed_at),
    },
    workspace: await getLearningWorkspaceData(viewer, {
      kind: unit.skill,
      unitId: unit.id,
    }),
  };
}

export async function getCompetitionArenaData(viewer: Viewer, challengeId: string) {
  const supabase = await createClient();
  const [{ data: challenge, error: challengeError }, { data: participant, error: participantError }] =
    await Promise.all([
      supabase
        .from("learning_challenges")
        .select("id,title,description,difficulty,target_value,min_score,ends_at")
        .eq("id", challengeId)
        .eq("is_published", true)
        .lte("starts_at", new Date().toISOString())
        .gte("ends_at", new Date().toISOString())
        .maybeSingle(),
      supabase
        .from("challenge_participants")
        .select("progress,completed_at")
        .eq("challenge_id", challengeId)
        .eq("user_id", viewer.id)
        .maybeSingle(),
    ]);
  assertNoError(challengeError, "Thử thách");
  assertNoError(participantError, "Lượt tham gia");
  if (!challenge || !participant) return null;
  return {
    challenge: {
      id: challenge.id,
      title: localized(challenge.title as Localized, viewer.locale),
      description: localized(challenge.description as Localized, viewer.locale),
      difficulty: challenge.difficulty,
      target: challenge.target_value,
      minScore: challenge.min_score,
      endsAt: challenge.ends_at,
      progress: participant.progress,
      completed: Boolean(participant.completed_at),
    },
    workspace: await getLearningWorkspaceData(viewer, { challengeId, kind: "competition" }),
  };
}

export async function getProfileSettings(viewer: Viewer) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("learning_goal,daily_goal_minutes,ai_training_consent")
    .eq("id", viewer.id)
    .single();
  assertNoError(error, "Cài đặt hồ sơ");
  return {
    learningGoal: data?.learning_goal ?? "",
    dailyGoalMinutes: data?.daily_goal_minutes ?? 20,
    aiTrainingConsent: Boolean(data?.ai_training_consent),
  };
}

export async function getTutorData(viewer: Viewer) {
  const supabase = await createClient();
  const [{ data: documents, error: documentsError }, { data: session, error: sessionError }] =
    await Promise.all([
      supabase
        .from("documents")
        .select("id,file_name,status")
        .eq("user_id", viewer.id)
        .eq("status", "ready")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("chat_sessions")
        .select("id,document_id")
        .eq("user_id", viewer.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  assertNoError(documentsError, "Tài liệu gia sư");
  assertNoError(sessionError, "Phiên chat");

  let messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (session) {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("role,content")
      .eq("session_id", session.id)
      .eq("user_id", viewer.id)
      .in("role", ["user", "assistant"])
      .order("created_at")
      .limit(30);
    assertNoError(error, "Lịch sử chat");
    messages = (data ?? []).map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    }));
  }

  return {
    documents: documents ?? [],
    sessionId: session?.id ?? null,
    documentId: session?.document_id ?? null,
    messages,
  };
}
