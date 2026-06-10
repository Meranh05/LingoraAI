import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalViewer } from "@/lib/auth";
import {
  getBillingPlans,
  planCodes,
  type BillingCurrency,
} from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

const schema = z.object({
  plan: z.enum(planCodes).refine((value) => value !== "free"),
  currency: z.enum(["vnd", "usd"]).default("vnd"),
  mode: z.enum(["purchase", "trial", "developer"]).default("purchase"),
});

export async function POST(request: Request) {
  try {
    const viewer = await getOptionalViewer();
    if (!viewer) {
      return NextResponse.json(
        { error: "Bạn cần đăng nhập trước khi mua gói." },
        { status: 401 },
      );
    }
    const input = schema.parse(await request.json());
    const plans = await getBillingPlans();
    const plan = plans.find((item) => item.code === input.plan);
    if (!plan) {
      return NextResponse.json({ error: "Gói không tồn tại." }, { status: 404 });
    }

    const stripe = getStripe();
    const sandbox = process.env.STRIPE_SECRET_KEY?.trim().startsWith("sk_test_");
    if (input.mode === "developer" && (!sandbox || viewer.role !== "admin")) {
      return NextResponse.json(
        { error: "Chế độ dev chỉ dành cho admin trong Stripe Sandbox." },
        { status: 403 },
      );
    }
    const admin = createAdminClient();
    const { data: customerRow } = await admin
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", viewer.id)
      .maybeSingle();
    let customerId = customerRow?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: viewer.email,
        name: viewer.fullName,
        metadata: { lingora_user_id: viewer.id },
      });
      customerId = customer.id;
      const { error } = await admin.from("billing_customers").upsert({
        user_id: viewer.id,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    }

    if (input.mode === "trial") {
      const customer = await stripe.customers.retrieve(customerId);
      if (
        !customer.deleted &&
        customer.metadata.lingora_trial_used === "true"
      ) {
        return NextResponse.json(
          { error: "Tài khoản này đã sử dụng lượt dùng thử 3 ngày." },
          { status: 409 },
        );
      }
      await stripe.customers.update(customerId, {
        metadata: {
          ...(!customer.deleted ? customer.metadata : {}),
          lingora_user_id: viewer.id,
          lingora_trial_used: "true",
        },
      });
    }

    const currency = input.currency as BillingCurrency;
    const amount = currency === "vnd" ? plan.priceVnd : plan.priceUsd;
    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
      new URL(request.url).origin;
    const cardless = input.mode === "trial" || input.mode === "developer";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: viewer.id,
      success_url: `${origin}/billing?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      payment_method_collection: cardless ? "if_required" : "always",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amount,
            recurring: { interval: "month" },
            product_data: {
              name: `Lingora ${plan.name}`,
              description:
                plan.description[viewer.locale] ??
                plan.description.en ??
                plan.description.vi,
              metadata: { plan_code: plan.code },
            },
          },
        },
      ],
      metadata: {
        lingora_user_id: viewer.id,
        plan_code: plan.code,
        currency,
        checkout_mode: input.mode,
      },
      subscription_data: {
        ...(cardless
          ? {
              trial_period_days: 3,
              trial_settings: {
                end_behavior: { missing_payment_method: "cancel" as const },
              },
            }
          : {}),
        metadata: {
          lingora_user_id: viewer.id,
          plan_code: plan.code,
          currency,
          checkout_mode: input.mode,
        },
      },
    });
    return NextResponse.json({ url: session.url, mode: input.mode });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tạo checkout.";
    return NextResponse.json(
      { error: message },
      { status: message.includes("chưa được cấu hình") ? 503 : 400 },
    );
  }
}
