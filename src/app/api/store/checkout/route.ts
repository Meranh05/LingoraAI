import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

const schema = z.object({
  packageCode: z.string().min(1).max(100),
  currency: z.enum(["vnd", "usd"]).default("vnd"),
});

export async function POST(request: Request) {
  try {
    const viewer = await getOptionalViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
    }
    const input = schema.parse(await request.json());
    const admin = createAdminClient();
    const { data: tokenPackage, error } = await admin
      .from("token_packages")
      .select("code,name,tokens,bonus_tokens,price_vnd,price_usd")
      .eq("code", input.packageCode)
      .eq("is_active", true)
      .single();
    if (error || !tokenPackage) {
      return NextResponse.json({ error: "Gói token không tồn tại." }, { status: 404 });
    }

    const stripe = getStripe();
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
      await admin.from("billing_customers").upsert({
        user_id: viewer.id,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      });
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
      new URL(request.url).origin;
    const amount =
      input.currency === "vnd" ? tokenPackage.price_vnd : tokenPackage.price_usd;
    const totalTokens = tokenPackage.tokens + tokenPackage.bonus_tokens;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      success_url: `${origin}/store?purchase=success`,
      cancel_url: `${origin}/store?purchase=cancelled`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency,
            unit_amount: amount,
            product_data: {
              name: `${totalTokens.toLocaleString()} Lingora Tokens`,
              description: tokenPackage.name,
            },
          },
        },
      ],
      metadata: {
        lingora_user_id: viewer.id,
        purchase_type: "tokens",
        package_code: tokenPackage.code,
        token_amount: String(totalTokens),
      },
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể tạo thanh toán." },
      { status: 400 },
    );
  }
}
