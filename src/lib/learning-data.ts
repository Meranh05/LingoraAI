import "server-only";
import type { Viewer } from "@/lib/auth";
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
  ]);

  [
    ["Hồ sơ", profileResult.error],
    ["Tiến độ kỹ năng", progressResult.error],
    ["Từ vựng", vocabularyResult.error],
    ["Tài liệu", documentsResult.error],
    ["Sự kiện học", eventsResult.error],
    ["Lộ trình", enrollmentResult.error],
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
  };
}

export async function getRoadmapData(viewer: Viewer) {
  const supabase = await createClient();
  const { data: path, error: pathError } = await supabase
    .from("learning_paths")
    .select("id,title,description,target_level,estimated_hours")
    .eq("is_published", true)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  assertNoError(pathError, "Lộ trình");
  if (!path) return null;

  const [{ data: units, error: unitsError }, { data: enrollment, error: enrollmentError }] =
    await Promise.all([
      supabase
        .from("learning_units")
        .select("id,position,title,description,skill,level,estimated_minutes")
        .eq("path_id", path.id)
        .order("position"),
      supabase
        .from("user_path_enrollments")
        .select("id,progress_percent,current_unit_id,status")
        .eq("user_id", viewer.id)
        .eq("path_id", path.id)
        .maybeSingle(),
    ]);
  assertNoError(unitsError, "Bài học");
  assertNoError(enrollmentError, "Đăng ký lộ trình");

  return {
    id: path.id,
    title: localized(path.title as Localized, viewer.locale),
    description: localized(path.description as Localized, viewer.locale),
    targetLevel: path.target_level,
    estimatedHours: path.estimated_hours,
    progress: Number(enrollment?.progress_percent ?? 0),
    enrolled: Boolean(enrollment),
    currentUnitId: enrollment?.current_unit_id ?? null,
    units: (units ?? []).map((unit) => ({
      id: unit.id,
      position: unit.position,
      title: localized(unit.title as Localized, viewer.locale),
      description: localized(unit.description as Localized, viewer.locale),
      skill: unit.skill,
      level: unit.level,
      estimatedMinutes: unit.estimated_minutes,
    })),
  };
}

export async function getLearningWorkspaceData(viewer: Viewer) {
  const supabase = await createClient();
  const [
    vocabulary,
    documents,
    questions,
    attempts,
    reviews,
    results,
    progress,
  ] = await Promise.all([
    supabase.from("vocabulary").select("*").eq("user_id", viewer.id).order("created_at", { ascending: false }),
    supabase.from("documents").select("id,file_name,file_type,status,summary_vi,summary_en,created_at").eq("user_id", viewer.id).order("created_at", { ascending: false }),
    supabase.from("practice_questions").select("*").eq("is_public", true).order("created_at"),
    supabase.from("practice_attempts").select("*").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("writing_reviews").select("*").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("quiz_results").select("*").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("user_skill_progress").select("*").eq("user_id", viewer.id).order("skill"),
  ]);
  const resultsToCheck = [vocabulary, documents, questions, attempts, reviews, results, progress];
  resultsToCheck.forEach((result) => assertNoError(result.error, "Dữ liệu học tập"));
  return {
    vocabulary: vocabulary.data ?? [],
    documents: documents.data ?? [],
    questions: questions.data ?? [],
    attempts: attempts.data ?? [],
    reviews: reviews.data ?? [],
    quizResults: results.data ?? [],
    progress: progress.data ?? [],
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
