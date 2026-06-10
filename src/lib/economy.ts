import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getUserBilling, hasPlan, type PlanCode } from "@/lib/billing";

type Localized = Record<string, string>;

export async function getEconomyData(userId: string, locale = "vi") {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const [
    { data: wallet },
    { data: catalog },
    { data: unlocks },
    { data: packages },
    { data: ledger },
  ] = await Promise.all([
    admin.from("user_wallets").select("xp,tokens,updated_at").eq("user_id", userId).maybeSingle(),
    admin
      .from("feature_unlock_catalog")
      .select("code,name,description,feature_code,duration_hours,token_cost,position")
      .eq("is_active", true)
      .order("position"),
    admin
      .from("user_feature_unlocks")
      .select("id,feature_code,catalog_code,source,starts_at,expires_at")
      .eq("user_id", userId)
      .gt("expires_at", now)
      .order("expires_at", { ascending: false }),
    admin
      .from("token_packages")
      .select("code,name,tokens,bonus_tokens,price_vnd,price_usd,position")
      .eq("is_active", true)
      .order("position"),
    admin
      .from("wallet_ledger")
      .select("id,currency,amount,reason,metadata,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return {
    wallet: wallet ?? { xp: 0, tokens: 0, updated_at: now },
    catalog: (catalog ?? []).map((item) => ({
      ...item,
      name:
        (item.name as Localized)?.[locale] ??
        (item.name as Localized)?.vi ??
        (item.name as Localized)?.en ??
        item.code,
      description:
        (item.description as Localized)?.[locale] ??
        (item.description as Localized)?.vi ??
        (item.description as Localized)?.en ??
        "",
    })),
    unlocks: unlocks ?? [],
    packages: packages ?? [],
    ledger: ledger ?? [],
  };
}

export async function hasActiveFeatureUnlock(
  userId: string,
  featureCode: string,
) {
  const admin = createAdminClient();
  const { count } = await admin
    .from("user_feature_unlocks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature_code", featureCode)
    .gt("expires_at", new Date().toISOString());
  return Boolean(count);
}

export async function hasFeatureAccess(
  userId: string,
  featureCode: string,
  requiredPlan: PlanCode,
) {
  const billing = await getUserBilling(userId);
  if (hasPlan(billing.plan.code, requiredPlan)) return true;
  return hasActiveFeatureUnlock(userId, featureCode);
}

export async function spendTokens(userId: string, catalogCode: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("spend_tokens_for_unlock", {
    target_user_id: userId,
    target_catalog_code: catalogCode,
  });
  if (error) throw new Error(error.message);
  return data?.[0] as
    | {
        feature_code: string;
        expires_at: string;
        tokens_remaining: number;
      }
    | undefined;
}
