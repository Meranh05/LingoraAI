import { NextResponse } from "next/server";
import { getOptionalViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const viewer = await getOptionalViewer();
    if (!viewer) {
      return NextResponse.json(
        { error: "Bạn cần đăng nhập để quản lý thanh toán." },
        { status: 401 },
      );
    }
    const admin = createAdminClient();
    const { data } = await admin
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", viewer.id)
      .maybeSingle();
    if (!data?.stripe_customer_id) {
      return NextResponse.json(
        { error: "Tài khoản chưa có hồ sơ thanh toán." },
        { status: 404 },
      );
    }
    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
      new URL(request.url).origin;
    const session = await getStripe().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${origin}/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể mở cổng thanh toán.";
    return NextResponse.json(
      { error: message },
      { status: message.includes("chưa được cấu hình") ? 503 : 400 },
    );
  }
}
