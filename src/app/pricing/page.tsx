import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { PricingTable } from "@/components/pricing-table";
import { Button } from "@/components/ui/button";
import { getOptionalViewer } from "@/lib/auth";
import { getBillingPlans, getUserBilling } from "@/lib/billing";
import { isStripeConfigured } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Bảng giá",
  description: "Chọn gói Basic, Plus hoặc Pro để mở khóa Lingora.",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ required?: string; feature?: string }>;
}) {
  const { required, feature } = await searchParams;
  const viewer = await getOptionalViewer();
  const [plans, billing] = await Promise.all([
    getBillingPlans(),
    viewer ? getUserBilling(viewer.id) : null,
  ]);
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dff8ff,#f8fdff_48%,#eef8ff)] px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-bold">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-white">
              <Sparkles className="size-5" />
            </span>
            Lingora
          </Link>
          <Button nativeButton={false} variant="ghost" render={<Link href="/" />}>
            <ArrowLeft /> Quay lại ứng dụng
          </Button>
        </div>
        <section className="text-center">
          <BadgeLine />
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
            Mở khóa toàn bộ trải nghiệm học tiếng Anh cùng AI
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Chọn hạn mức phù hợp. Nâng cấp hoặc hủy gia hạn trực tiếp trong cổng
            thanh toán bảo mật.
          </p>
          {required ? (
            <p className="mx-auto mt-5 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Tính năng <strong>{feature ?? "này"}</strong> yêu cầu gói{" "}
              <strong>{required.toUpperCase()}</strong> trở lên.
            </p>
          ) : null}
        </section>
        <PricingTable
          plans={plans}
          currentPlan={billing?.plan.code ?? "free"}
          authenticated={Boolean(viewer)}
          admin={viewer?.role === "admin"}
          stripeConfigured={isStripeConfigured()}
        />
      </div>
    </main>
  );
}

function BadgeLine() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border bg-white/80 px-4 py-2 text-sm font-medium">
      <ShieldCheck className="size-4 text-emerald-600" />
      3 gói trả phí · VND và USD
    </span>
  );
}
