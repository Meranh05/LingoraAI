import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminUserRow = {
  id: string;
  fullName: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "suspended";
  level: string;
  locale: string;
  consent: boolean;
  createdAt: string;
};

export async function getAdminOverview() {
  const admin = createAdminClient();
  const [
    profilesResult,
    authUsersResult,
    activeTodayResult,
    trainingResult,
    minutesResult,
    pathsResult,
    unitsResult,
    questionsResult,
    documentsResult,
  ] = await Promise.all([
    admin.from("profiles").select("id,full_name,role,status,level,locale,ai_training_consent,created_at").order("created_at", { ascending: false }).limit(500),
    admin.auth.admin.listUsers({ page: 1, perPage: 500 }),
    admin.from("learning_events").select("user_id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86_400_000).toISOString()),
    admin.from("training_candidates").select("id", { count: "exact", head: true }).eq("review_status", "pending"),
    admin.from("learning_events").select("duration_seconds"),
    admin.from("learning_paths").select("id", { count: "exact", head: true }),
    admin.from("learning_units").select("id", { count: "exact", head: true }),
    admin.from("practice_questions").select("id", { count: "exact", head: true }),
    admin.from("documents").select("id", { count: "exact", head: true }),
  ]);

  const databaseError = [
    profilesResult.error,
    authUsersResult.error,
    activeTodayResult.error,
    trainingResult.error,
    minutesResult.error,
    pathsResult.error,
    unitsResult.error,
    questionsResult.error,
    documentsResult.error,
  ].find(Boolean);
  if (databaseError) throw new Error(databaseError.message);

  const emailMap = new Map(
    authUsersResult.data.users.map((user) => [user.id, user.email ?? ""]),
  );
  const users: AdminUserRow[] = (profilesResult.data ?? []).map((profile) => ({
    id: profile.id,
    fullName: profile.full_name ?? "Chưa đặt tên",
    email: emailMap.get(profile.id) ?? "",
    role: profile.role === "admin" ? "admin" : "user",
    status: profile.status === "suspended" ? "suspended" : "active",
    level: profile.level,
    locale: profile.locale,
    consent: profile.ai_training_consent,
    createdAt: profile.created_at,
  }));

  return {
    users,
    stats: {
      users: authUsersResult.data.users.length,
      activeToday: activeTodayResult.count ?? 0,
      learningMinutes: Math.round(
        (minutesResult.data ?? []).reduce(
          (sum, event) => sum + (event.duration_seconds ?? 0),
          0,
        ) / 60,
      ),
      trainingCandidates: trainingResult.count ?? 0,
    },
    contentStats: {
      paths: pathsResult.count ?? 0,
      units: unitsResult.count ?? 0,
      questions: questionsResult.count ?? 0,
      documents: documentsResult.count ?? 0,
    },
  };
}
