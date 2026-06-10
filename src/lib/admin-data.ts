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

export type AdminBillingRow = {
  userId: string;
  fullName: string;
  email: string;
  planCode: string;
  status: string;
  currency: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  updatedAt: string;
};

export async function getAdminOverview() {
  const admin = createAdminClient();
  const fourteenDaysAgo = new Date(Date.now() - 13 * 86_400_000);
  fourteenDaysAgo.setHours(0, 0, 0, 0);
  const [
    profilesResult,
    authUsersResult,
    recentEventsResult,
    trainingResult,
    minutesResult,
    pathsResult,
    unitsResult,
    questionsResult,
    documentsResult,
    subscriptionsResult,
    walletsResult,
    unlocksResult,
  ] = await Promise.all([
    admin.from("profiles").select("id,full_name,role,status,level,locale,ai_training_consent,created_at").order("created_at", { ascending: false }).limit(500),
    admin.auth.admin.listUsers({ page: 1, perPage: 500 }),
    admin
      .from("learning_events")
      .select("user_id,skill,duration_seconds,created_at")
      .gte("created_at", fourteenDaysAgo.toISOString())
      .order("created_at"),
    admin.from("training_candidates").select("id", { count: "exact", head: true }).eq("review_status", "pending"),
    admin.from("learning_events").select("duration_seconds"),
    admin.from("learning_paths").select("id", { count: "exact", head: true }),
    admin.from("learning_units").select("id", { count: "exact", head: true }),
    admin.from("practice_questions").select("id", { count: "exact", head: true }),
    admin.from("documents").select("id", { count: "exact", head: true }),
    admin.from("subscriptions").select("plan_code,status"),
    admin.from("user_wallets").select("xp,tokens"),
    admin
      .from("user_feature_unlocks")
      .select("id", { count: "exact", head: true })
      .gt("expires_at", new Date().toISOString()),
  ]);

  const databaseError = [
    profilesResult.error,
    authUsersResult.error,
    recentEventsResult.error,
    trainingResult.error,
    minutesResult.error,
    pathsResult.error,
    unitsResult.error,
    questionsResult.error,
    documentsResult.error,
    subscriptionsResult.error,
    walletsResult.error,
    unlocksResult.error,
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
  const recentEvents = recentEventsResult.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const activeToday = new Set(
    recentEvents
      .filter((event) => event.created_at.slice(0, 10) === today)
      .map((event) => event.user_id),
  ).size;
  const activityMap = new Map<
    string,
    { activeUsers: Set<string>; events: number; minutes: number }
  >();
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 86_400_000)
      .toISOString()
      .slice(0, 10);
    activityMap.set(date, { activeUsers: new Set(), events: 0, minutes: 0 });
  }
  const skillMap = new Map<string, { attempts: number; minutes: number }>();
  recentEvents.forEach((event) => {
    const date = event.created_at.slice(0, 10);
    const activity = activityMap.get(date);
    if (activity) {
      activity.activeUsers.add(event.user_id);
      activity.events += 1;
      activity.minutes += Math.round((event.duration_seconds ?? 0) / 60);
    }
    if (event.skill) {
      const skill = skillMap.get(event.skill) ?? { attempts: 0, minutes: 0 };
      skill.attempts += 1;
      skill.minutes += Math.round((event.duration_seconds ?? 0) / 60);
      skillMap.set(event.skill, skill);
    }
  });
  const registrationsMap = new Map<string, number>();
  users.forEach((user) => {
    const date = user.createdAt.slice(0, 10);
    registrationsMap.set(date, (registrationsMap.get(date) ?? 0) + 1);
  });
  const subscriptions = subscriptionsResult.data ?? [];
  const activeStatuses = new Set(["active", "trialing", "past_due"]);
  const planDistribution = ["free", "basic", "plus", "pro"].map((plan) => ({
    name: plan,
    value:
      plan === "free"
        ? Math.max(
            0,
            users.length -
              subscriptions.filter((item) => activeStatuses.has(item.status))
                .length,
          )
        : subscriptions.filter(
            (item) =>
              item.plan_code === plan && activeStatuses.has(item.status),
          ).length,
  }));
  const distribution = (field: "locale" | "level") =>
    Array.from(
      users.reduce((map, user) => {
        const value = user[field] || "unknown";
        map.set(value, (map.get(value) ?? 0) + 1);
        return map;
      }, new Map<string, number>()),
    ).map(([name, value]) => ({ name, value }));

  return {
    users,
    stats: {
      users: authUsersResult.data.users.length,
      activeToday,
      learningMinutes: Math.round(
        (minutesResult.data ?? []).reduce(
          (sum, event) => sum + (event.duration_seconds ?? 0),
          0,
        ) / 60,
      ),
      trainingCandidates: trainingResult.count ?? 0,
      totalXp: (walletsResult.data ?? []).reduce(
        (sum, wallet) => sum + Number(wallet.xp ?? 0),
        0,
      ),
      totalTokens: (walletsResult.data ?? []).reduce(
        (sum, wallet) => sum + Number(wallet.tokens ?? 0),
        0,
      ),
      activeUnlocks: unlocksResult.count ?? 0,
    },
    contentStats: {
      paths: pathsResult.count ?? 0,
      units: unitsResult.count ?? 0,
      questions: questionsResult.count ?? 0,
      documents: documentsResult.count ?? 0,
    },
    analytics: {
      activity: Array.from(activityMap.entries()).map(([date, value]) => ({
        date,
        activeUsers: value.activeUsers.size,
        events: value.events,
        minutes: value.minutes,
        registrations: registrationsMap.get(date) ?? 0,
      })),
      skills: Array.from(skillMap.entries())
        .map(([skill, value]) => ({ skill, ...value }))
        .sort((a, b) => b.attempts - a.attempts),
      locales: distribution("locale"),
      levels: distribution("level"),
      plans: planDistribution,
    },
  };
}

export async function getTrainingCandidates() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("training_candidates")
    .select(
      "id,anonymized_input,anonymized_output,preferred_output,quality_score,review_status,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAdminBillingData() {
  const admin = createAdminClient();
  const [subscriptionsResult, transactionsResult, profilesResult, authUsersResult, plansResult] =
    await Promise.all([
      admin
        .from("subscriptions")
        .select(
          "user_id,plan_code,status,currency,current_period_end,cancel_at_period_end,updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(500),
      admin
        .from("billing_transactions")
        .select(
          "id,user_id,event_type,plan_code,amount,currency,status,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      admin.from("profiles").select("id,full_name"),
      admin.auth.admin.listUsers({ page: 1, perPage: 500 }),
      admin
        .from("billing_plans")
        .select("code,price_vnd,price_usd")
        .eq("is_active", true),
    ]);

  const error = [
    subscriptionsResult.error,
    transactionsResult.error,
    profilesResult.error,
    authUsersResult.error,
    plansResult.error,
  ].find(Boolean);
  if (error) throw new Error(error.message);

  const profileMap = new Map(
    (profilesResult.data ?? []).map((profile) => [
      profile.id,
      profile.full_name ?? "Chưa đặt tên",
    ]),
  );
  const emailMap = new Map(
    authUsersResult.data.users.map((user) => [user.id, user.email ?? ""]),
  );
  const plans = new Map(
    (plansResult.data ?? []).map((plan) => [plan.code, plan]),
  );
  const activeStatuses = new Set(["active", "trialing", "past_due"]);
  const subscriptions: AdminBillingRow[] = (subscriptionsResult.data ?? []).map(
    (subscription) => ({
      userId: subscription.user_id,
      fullName: profileMap.get(subscription.user_id) ?? "Chưa đặt tên",
      email: emailMap.get(subscription.user_id) ?? "",
      planCode: subscription.plan_code,
      status: subscription.status,
      currency: subscription.currency,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: subscription.updated_at,
    }),
  );

  const activeSubscriptions = subscriptions.filter((subscription) =>
    activeStatuses.has(subscription.status),
  );
  const mrr = activeSubscriptions.reduce(
    (total, subscription) => {
      const plan = plans.get(subscription.planCode);
      if (!plan) return total;
      if (subscription.currency === "usd") total.usd += plan.price_usd;
      else total.vnd += plan.price_vnd;
      return total;
    },
    { vnd: 0, usd: 0 },
  );

  return {
    subscriptions,
    transactions: transactionsResult.data ?? [],
    stats: {
      active: activeSubscriptions.length,
      trialing: subscriptions.filter((item) => item.status === "trialing").length,
      pastDue: subscriptions.filter((item) => item.status === "past_due").length,
      canceling: subscriptions.filter((item) => item.cancelAtPeriodEnd).length,
      mrrVnd: mrr.vnd,
      mrrUsd: mrr.usd,
    },
  };
}
