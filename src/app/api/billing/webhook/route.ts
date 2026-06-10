import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { planCodes, type PlanCode } from "@/lib/billing";

export const runtime = "nodejs";

type SubscriptionShape = Stripe.Subscription & {
  current_period_start?: number;
  current_period_end?: number;
};

function timestamp(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function subscriptionPeriods(subscription: SubscriptionShape) {
  const item = subscription.items.data[0] as Stripe.SubscriptionItem & {
    current_period_start?: number;
    current_period_end?: number;
  };
  return {
    start: subscription.current_period_start ?? item?.current_period_start,
    end: subscription.current_period_end ?? item?.current_period_end,
  };
}

function normalizeStatus(status: Stripe.Subscription.Status) {
  return ["trialing", "active", "past_due", "canceled", "unpaid", "paused"].includes(status)
    ? status
    : "inactive";
}

async function syncSubscription(subscription: SubscriptionShape) {
  const admin = createAdminClient();
  const metadata = subscription.metadata;
  let userId = metadata.lingora_user_id;
  if (!userId) {
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    const { data } = await admin
      .from("billing_customers")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    userId = data?.user_id;
  }
  if (!userId) throw new Error("Không tìm thấy Lingora user cho subscription.");
  const requestedPlan = metadata.plan_code;
  const planCode = planCodes.includes(requestedPlan as PlanCode)
    ? (requestedPlan as PlanCode)
    : "free";
  const periods = subscriptionPeriods(subscription);
  const price = subscription.items.data[0]?.price;
  const { error } = await admin.from("subscriptions").upsert({
    user_id: userId,
    plan_code:
      normalizeStatus(subscription.status) === "canceled" ? "free" : planCode,
    provider: "stripe",
    provider_subscription_id: subscription.id,
    provider_price_id: price?.id ?? null,
    currency: price?.currency ?? metadata.currency ?? null,
    status: normalizeStatus(subscription.status),
    cancel_at_period_end: subscription.cancel_at_period_end,
    current_period_start: timestamp(periods.start),
    current_period_end: timestamp(periods.end),
    canceled_at: timestamp(subscription.canceled_at),
    metadata,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

async function awardTokenPurchase(session: Stripe.Checkout.Session) {
  if (
    session.metadata?.purchase_type !== "tokens" ||
    !["paid", "no_payment_required"].includes(session.payment_status)
  ) {
    return;
  }
  const userId = session.metadata.lingora_user_id;
  const tokenAmount = Number(session.metadata.token_amount);
  if (!userId || !Number.isInteger(tokenAmount) || tokenAmount <= 0) {
    throw new Error("Metadata mua token không hợp lệ.");
  }
  const admin = createAdminClient();
  const { error: walletError } = await admin.rpc("credit_wallet_purchase", {
    target_user_id: userId,
    token_amount: tokenAmount,
    checkout_session_id: session.id,
    package_code: session.metadata.package_code ?? null,
  });
  if (walletError) throw walletError;
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Webhook Stripe chưa cấu hình." }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Thiếu chữ ký Stripe." }, { status: 400 });
  }

  try {
    const body = await request.text();
    const event = getStripe().webhooks.constructEvent(body, signature, secret);
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("billing_transactions")
      .select("id")
      .eq("provider_event_id", event.id)
      .maybeSingle();
    if (existing) return NextResponse.json({ received: true, duplicate: true });

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await syncSubscription(event.data.object as SubscriptionShape);
    }
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await awardTokenPurchase(session);
      if (session.subscription) {
        const subscription = await getStripe().subscriptions.retrieve(
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id,
        );
        await syncSubscription(subscription as SubscriptionShape);
      }
    }

    const object = event.data.object as unknown as {
      id?: string;
      amount_paid?: number;
      amount_due?: number;
      currency?: string;
      status?: string;
      metadata?: Record<string, string>;
    };
    const customerId =
      "customer" in event.data.object
        ? String((event.data.object as { customer?: string }).customer ?? "")
        : "";
    const { data: customer } = customerId
      ? await admin
          .from("billing_customers")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle()
      : { data: null };
    await admin.from("billing_transactions").insert({
      user_id:
        object.metadata?.lingora_user_id ??
        customer?.user_id ??
        null,
      provider_event_id: event.id,
      provider_object_id: object.id ?? null,
      event_type: event.type,
      plan_code: object.metadata?.plan_code ?? null,
      amount: object.amount_paid ?? object.amount_due ?? null,
      currency: object.currency ?? null,
      status: object.status ?? null,
      payload: JSON.parse(JSON.stringify(event.data.object)),
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook không hợp lệ." },
      { status: 400 },
    );
  }
}
