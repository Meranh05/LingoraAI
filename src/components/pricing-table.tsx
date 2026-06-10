"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, Loader2, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import type {
  BillingCurrency,
  BillingPlan,
  PlanCode,
} from "@/lib/billing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocale } from "@/components/locale-provider";

function price(plan: BillingPlan, currency: BillingCurrency) {
  if (currency === "vnd") {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(plan.priceVnd);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(plan.priceUsd / 100);
}

const vietnameseFeatures: Record<string, string> = {
  "50 AI requests/day": "50 lượt AI mỗi ngày",
  "20 documents": "20 tài liệu",
  "All skill modules": "Toàn bộ module kỹ năng",
  "Learning progress": "Theo dõi tiến độ học tập",
  "200 AI requests/day": "200 lượt AI mỗi ngày",
  "100 documents": "100 tài liệu",
  "Document-grounded tutor": "Gia sư AI theo tài liệu",
  "Competition and challenges": "Thi đua và thử thách",
  "Advanced feedback": "Phản hồi nâng cao",
  "1000 AI requests/day": "1.000 lượt AI mỗi ngày",
  "1000 documents": "1.000 tài liệu",
  "Priority models": "Model AI ưu tiên",
  "Full analytics": "Phân tích học tập đầy đủ",
  "Early access features": "Truy cập sớm tính năng mới",
};

export function PricingTable({
  plans,
  currentPlan,
  authenticated,
  admin,
  stripeConfigured,
}: {
  plans: BillingPlan[];
  currentPlan: PlanCode;
  authenticated: boolean;
  admin: boolean;
  stripeConfigured: boolean;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [currency, setCurrency] = useState<BillingCurrency>(
    locale === "vi" ? "vnd" : "usd",
  );
  const [loading, setLoading] = useState<string>();
  const paidPlans = plans.filter((plan) => plan.code !== "free");

  async function checkout(
    plan: PlanCode,
    mode: "purchase" | "trial" | "developer",
  ) {
    if (!authenticated) {
      router.push(`/login?next=${encodeURIComponent(`/pricing?plan=${plan}`)}`);
      return;
    }
    if (!stripeConfigured) {
      toast.error("Stripe chưa được cấu hình. Thêm khóa Stripe trong .env.local.");
      return;
    }
    setLoading(`${plan}:${mode}`);
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, currency, mode }),
    });
    const payload = (await response.json()) as { url?: string; error?: string };
    setLoading(undefined);
    if (!response.ok || !payload.url) {
      toast.error(payload.error ?? "Không thể mở trang thanh toán.");
      return;
    }
    window.location.assign(payload.url);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl border bg-white/80 p-1">
          {(["vnd", "usd"] as const).map((item) => (
            <Button
              key={item}
              size="sm"
              variant={currency === item ? "default" : "ghost"}
              onClick={() => setCurrency(item)}
            >
              {item.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {paidPlans.map((plan) => {
          const popular = plan.code === "plus";
          const Icon =
            plan.code === "pro" ? Crown : plan.code === "plus" ? Zap : Sparkles;
          return (
            <Card
              key={plan.code}
              className={`relative flex flex-col overflow-hidden ${
                popular
                  ? "border-primary shadow-xl shadow-sky-200/60"
                  : "glass-panel"
              }`}
            >
              {popular ? (
                <Badge className="absolute right-4 top-4">Phổ biến nhất</Badge>
              ) : null}
              <CardHeader>
                <span className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <Icon className="size-5" />
                </span>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>
                  {plan.description[locale] ??
                    plan.description.en ??
                    plan.description.vi}
                </CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold">
                    {price(plan, currency)}
                  </span>
                  <span className="text-muted-foreground"> / tháng</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5">
                <ul className="flex flex-col gap-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      {locale === "vi"
                        ? vietnameseFeatures[feature] ?? feature
                        : feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-auto w-full"
                  variant={popular ? "default" : "outline"}
                  disabled={Boolean(loading) || currentPlan === plan.code}
                  onClick={() => checkout(plan.code, "purchase")}
                >
                  {loading === `${plan.code}:purchase` ? (
                    <Loader2 className="animate-spin" />
                  ) : currentPlan === plan.code ? (
                    "Gói hiện tại"
                  ) : (
                    `Mua ${plan.name}`
                  )}
                </Button>
                {currentPlan !== plan.code ? (
                  <Button
                    className="w-full"
                    variant="ghost"
                    disabled={Boolean(loading)}
                    onClick={() => checkout(plan.code, "trial")}
                  >
                    {loading === `${plan.code}:trial` ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      "Dùng thử 3 ngày không cần thẻ"
                    )}
                  </Button>
                ) : null}
                {admin && currentPlan !== plan.code ? (
                  <Button
                    className="w-full"
                    size="sm"
                    variant="outline"
                    disabled={Boolean(loading)}
                    onClick={() => checkout(plan.code, "developer")}
                  >
                    {loading === `${plan.code}:developer` ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      "Dev test Sandbox"
                    )}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Thanh toán bảo mật bởi Stripe. Bạn có thể hủy gia hạn bất kỳ lúc nào.
        Giá chưa bao gồm thuế nếu pháp luật khu vực của bạn yêu cầu.
      </p>
    </div>
  );
}
