import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const planCodes = ["free", "basic", "plus", "pro"] as const;
export type PlanCode = (typeof planCodes)[number];
export type BillingCurrency = "vnd" | "usd";

export type BillingPlan = {
  code: PlanCode;
  name: string;
  description: Record<string, string>;
  priceVnd: number;
  priceUsd: number;
  aiRequestsPerDay: number;
  documentLimit: number;
  features: string[];
  position: number;
};

export const fallbackPlans: BillingPlan[] = [
  {
    code: "free",
    name: "Free",
    description: { vi: "Dùng thử Lingora với giới hạn cơ bản.", en: "Try Lingora with basic limits." },
    priceVnd: 0,
    priceUsd: 0,
    aiRequestsPerDay: 5,
    documentLimit: 1,
    features: ["5 AI requests/day", "1 document", "Core learning modules"],
    position: 0,
  },
  {
    code: "basic",
    name: "Basic",
    description: { vi: "Bắt đầu lộ trình học cá nhân với AI.", en: "Start a personal AI learning journey." },
    priceVnd: 99_000,
    priceUsd: 499,
    aiRequestsPerDay: 50,
    documentLimit: 20,
    features: ["50 AI requests/day", "20 documents", "All skill modules", "Learning progress"],
    position: 1,
  },
  {
    code: "plus",
    name: "Plus",
    description: { vi: "AI nâng cao, tài liệu và luyện tập chuyên sâu.", en: "Advanced AI, documents, and intensive practice." },
    priceVnd: 199_000,
    priceUsd: 899,
    aiRequestsPerDay: 200,
    documentLimit: 100,
    features: ["200 AI requests/day", "100 documents", "Document-grounded tutor", "Competition and challenges", "Advanced feedback"],
    position: 2,
  },
  {
    code: "pro",
    name: "Pro",
    description: { vi: "Hạn mức cao và ưu tiên model cho người học chuyên nghiệp.", en: "High limits and priority models for serious learners." },
    priceVnd: 399_000,
    priceUsd: 1699,
    aiRequestsPerDay: 1000,
    documentLimit: 1000,
    features: ["1000 AI requests/day", "1000 documents", "Priority models", "Full analytics", "Early access features"],
    position: 3,
  },
];

export const planRank: Record<PlanCode, number> = {
  free: 0,
  basic: 1,
  plus: 2,
  pro: 3,
};

export async function getBillingPlans() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("billing_plans")
    .select("code,name,description,price_vnd,price_usd,ai_requests_per_day,document_limit,features,position")
    .eq("is_active", true)
    .order("position");
  if (error || !data?.length) return fallbackPlans;
  return data.map((plan) => ({
    code: plan.code as PlanCode,
    name: plan.name,
    description: plan.description as Record<string, string>,
    priceVnd: plan.price_vnd,
    priceUsd: plan.price_usd,
    aiRequestsPerDay: plan.ai_requests_per_day,
    documentLimit: plan.document_limit,
    features: plan.features as string[],
    position: plan.position,
  }));
}

export async function getUserBilling(userId: string) {
  const admin = createAdminClient();
  const [{ data: subscription }, plans] = await Promise.all([
    admin
      .from("subscriptions")
      .select("plan_code,status,currency,cancel_at_period_end,current_period_end,provider_subscription_id")
      .eq("user_id", userId)
      .maybeSingle(),
    getBillingPlans(),
  ]);
  const active =
    subscription &&
    ["active", "trialing", "past_due"].includes(subscription.status);
  const code = (active ? subscription.plan_code : "free") as PlanCode;
  const plan = plans.find((item) => item.code === code) ?? fallbackPlans[0];
  return { plan, subscription: subscription ?? null };
}

export async function getBillingDashboard(userId: string) {
  const admin = createAdminClient();
  const [billing, { data: usage }, { data: transactions }] = await Promise.all([
    getUserBilling(userId),
    admin
      .from("usage_counters")
      .select("metric,quantity")
      .eq("user_id", userId)
      .eq("usage_date", new Date().toISOString().slice(0, 10)),
    admin
      .from("billing_transactions")
      .select("id,event_type,amount,currency,status,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const usageMap = new Map(
    (usage ?? []).map((item) => [item.metric, item.quantity]),
  );
  const { count: documents } = await admin
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return {
    ...billing,
    usage: {
      ai: usageMap.get("ai_request") ?? 0,
      documents: documents ?? 0,
    },
    transactions: transactions ?? [],
  };
}

export async function consumeAiQuota(userId: string) {
  const { plan } = await getUserBilling(userId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_daily_usage", {
    target_user_id: userId,
    target_metric: "ai_request",
    target_limit: plan.aiRequestsPerDay,
  });
  if (error) throw new Error(error.message);
  const result = data?.[0] as
    | { allowed: boolean; used: number; quota: number }
    | undefined;
  return {
    allowed: Boolean(result?.allowed),
    used: result?.used ?? 0,
    quota: result?.quota ?? plan.aiRequestsPerDay,
    plan,
  };
}

export function hasPlan(current: PlanCode, required: PlanCode) {
  return planRank[current] >= planRank[required];
}

export async function checkDocumentLimit(userId: string) {
  const admin = createAdminClient();
  const [{ count }, billing] = await Promise.all([
    admin
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    getUserBilling(userId),
  ]);
  return {
    allowed: (count ?? 0) < billing.plan.documentLimit,
    used: count ?? 0,
    limit: billing.plan.documentLimit,
    plan: billing.plan,
  };
}
