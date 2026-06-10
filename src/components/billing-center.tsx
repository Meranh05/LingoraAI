"use client";

import { CreditCard, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { BillingPlan } from "@/lib/billing";
import { PageHero } from "@/components/page-hero";

type BillingData = {
  plan: BillingPlan;
  subscription: {
    status: string;
    currency: string | null;
    cancel_at_period_end: boolean;
    current_period_end: string | null;
  } | null;
  usage: { ai: number; documents: number };
  transactions: Array<{
    id: string;
    event_type: string;
    amount: number | null;
    currency: string | null;
    status: string | null;
    created_at: string;
  }>;
};

export function BillingCenter({ data }: { data: BillingData }) {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    const response = await fetch("/api/billing/portal", { method: "POST" });
    const payload = (await response.json()) as { url?: string; error?: string };
    setLoading(false);
    if (!response.ok || !payload.url) {
      toast.error(payload.error ?? "Không thể mở cổng thanh toán.");
      return;
    }
    window.location.assign(payload.url);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        icon={CreditCard}
        title="Gói và thanh toán"
        description="Theo dõi hạn mức, chu kỳ, subscription và lịch sử thanh toán của tài khoản."
        eyebrow={`Lingora ${data.plan.name}`}
        tone="emerald"
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card className="overflow-hidden border-primary/30 bg-[linear-gradient(145deg,#ecfeff,#e0f2fe)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white">
                <Sparkles />
              </span>
              <Badge>{data.subscription?.status ?? "free"}</Badge>
            </div>
            <CardTitle className="text-3xl">Lingora {data.plan.name}</CardTitle>
            <CardDescription>
              {data.subscription?.current_period_end
                ? `Chu kỳ hiện tại đến ${new Intl.DateTimeFormat("vi-VN", {
                    dateStyle: "medium",
                  }).format(new Date(data.subscription.current_period_end))}`
                : "Bạn đang sử dụng gói miễn phí."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button nativeButton={false} render={<a href="/pricing" />}>
              Nâng cấp gói
            </Button>
            {data.subscription ? (
              <Button variant="outline" onClick={openPortal} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <ExternalLink />}
                Quản lý thanh toán
              </Button>
            ) : null}
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Hạn mức hiện tại</CardTitle>
            <CardDescription>Quota AI được làm mới mỗi ngày.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Usage
              label="Yêu cầu AI hôm nay"
              used={data.usage.ai}
              limit={data.plan.aiRequestsPerDay}
            />
            <Usage
              label="Tài liệu đã tải"
              used={data.usage.documents}
              limit={data.plan.documentLimit}
            />
          </CardContent>
        </Card>
      </div>
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5 text-primary" /> Hoạt động thanh toán
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {data.transactions.length ? (
            data.transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between rounded-xl border bg-white/70 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{transaction.event_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("vi-VN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(transaction.created_at))}
                  </p>
                </div>
                <Badge variant="outline">{transaction.status ?? "received"}</Badge>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Chưa có giao dịch.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Usage({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <Progress value={Math.min(100, (used / limit) * 100)} />
    </div>
  );
}
