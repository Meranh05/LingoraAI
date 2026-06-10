"use client";

import { useState } from "react";
import {
  Clock3,
  Coins,
  CreditCard,
  Flame,
  Loader2,
  LockOpen,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { PageHero } from "@/components/page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useExperience } from "@/components/experience-provider";

type EconomyData = Awaited<
  ReturnType<typeof import("@/lib/economy").getEconomyData>
>;

function money(amount: number, currency: "vnd" | "usd") {
  return new Intl.NumberFormat(currency === "vnd" ? "vi-VN" : "en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: currency === "vnd" ? 0 : 2,
  }).format(currency === "usd" ? amount / 100 : amount);
}

function duration(hours: number) {
  if (hours % 720 === 0) return `${hours / 720} tháng`;
  if (hours % 24 === 0) return `${hours / 24} ngày`;
  return `${hours} giờ`;
}

export function EconomyStore({ data }: { data: EconomyData }) {
  const [currency, setCurrency] = useState<"vnd" | "usd">("vnd");
  const [loading, setLoading] = useState("");
  const { play } = useExperience();
  const level = Math.floor(Number(data.wallet.xp) / 500) + 1;
  const levelProgress = Number(data.wallet.xp) % 500;

  async function unlock(catalogCode: string) {
    setLoading(catalogCode);
    const response = await fetch("/api/store/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catalogCode }),
    });
    const payload = (await response.json()) as { error?: string };
    setLoading("");
    if (!response.ok) {
      play("error");
      toast.error(payload.error ?? "Không thể mở khóa.");
      return;
    }
    play("complete");
    toast.success("Đã mở khóa tính năng.");
    window.location.reload();
  }

  async function buy(packageCode: string) {
    setLoading(packageCode);
    const response = await fetch("/api/store/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageCode, currency }),
    });
    const payload = (await response.json()) as { url?: string; error?: string };
    setLoading("");
    if (!response.ok || !payload.url) {
      play("error");
      toast.error(payload.error ?? "Không thể mở thanh toán.");
      return;
    }
    window.location.assign(payload.url);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        icon={Coins}
        title="Lingora Rewards"
        description="Kiếm XP và token qua học tập, dùng token để mở khóa tính năng có thời hạn hoặc mua thêm bằng Stripe."
        eyebrow={`Level ${level}`}
        tone="amber"
        aside={
          <div className="grid min-w-72 grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <Star className="size-4" />
              <p className="mt-2 text-2xl font-bold">{Number(data.wallet.xp).toLocaleString()}</p>
              <p className="text-xs text-white/70">XP tích lũy</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <Coins className="size-4" />
              <p className="mt-2 text-2xl font-bold">{data.wallet.tokens.toLocaleString()}</p>
              <p className="text-xs text-white/70">Lingora Tokens</p>
            </div>
          </div>
        }
      />

      <Card className="glass-panel">
        <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-semibold">Level {level}</span>
              <span>{levelProgress} / 500 XP</span>
            </div>
            <Progress value={(levelProgress / 500) * 100} />
          </div>
          <Badge variant="secondary" className="px-4 py-2">
            <Flame /> Học để nhận 1–3 token mỗi event
          </Badge>
        </CardContent>
      </Card>

      {data.unlocks.length ? (
        <section>
          <h2 className="mb-3 text-xl font-bold">Đang mở khóa</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.unlocks.map((unlock) => (
              <Card key={unlock.id} className="border-emerald-200 bg-emerald-50/80">
                <CardContent className="p-4">
                  <Badge className="bg-emerald-600">Đang hiệu lực</Badge>
                  <p className="mt-3 font-semibold capitalize">{unlock.feature_code}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-emerald-800">
                    <Clock3 className="size-3" />
                    Đến{" "}
                    {new Intl.DateTimeFormat("vi-VN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(unlock.expires_at))}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-4">
          <h2 className="text-2xl font-bold">Mở khóa bằng token</h2>
          <p className="text-sm text-muted-foreground">
            Thời gian mới sẽ được cộng tiếp nếu quyền hiện tại chưa hết hạn.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.catalog.map((item) => (
            <Card key={item.code} className="interactive-lift glass-panel">
              <CardHeader>
                <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <LockOpen />
                </span>
                <CardTitle>{item.name}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-amber-700">
                    {item.token_cost} tokens
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {duration(item.duration_hours)}
                  </p>
                </div>
                <Button
                  onClick={() => unlock(item.code)}
                  disabled={Boolean(loading) || data.wallet.tokens < item.token_cost}
                >
                  {loading === item.code ? <Loader2 className="animate-spin" /> : <Coins />}
                  Mở khóa
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Mua Lingora Tokens</h2>
            <p className="text-sm text-muted-foreground">
              Thanh toán một lần, token không hết hạn.
            </p>
          </div>
          <div className="flex rounded-xl border bg-white p-1">
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
        <div className="grid gap-4 md:grid-cols-3">
          {data.packages.map((item) => (
            <Card key={item.code} className="interactive-lift overflow-hidden">
              <CardHeader className="bg-slate-950 text-white">
                <CardTitle>{item.name}</CardTitle>
                <p className="text-4xl font-bold">
                  {(item.tokens + item.bonus_tokens).toLocaleString()}
                </p>
                <p className="text-xs text-slate-300">Lingora Tokens</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 p-5">
                {item.bonus_tokens ? (
                  <Badge variant="secondary">+{item.bonus_tokens} token thưởng</Badge>
                ) : null}
                <p className="text-2xl font-bold">
                  {money(currency === "vnd" ? item.price_vnd : item.price_usd, currency)}
                </p>
                <Button onClick={() => buy(item.code)} disabled={Boolean(loading)}>
                  {loading === item.code ? <Loader2 className="animate-spin" /> : <CreditCard />}
                  Mua token
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Lịch sử ví</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {data.ledger.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-xl border bg-white/70 p-3 text-sm"
            >
              <div>
                <p className="font-medium">{entry.reason.replaceAll("_", " ")}</p>
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("vi-VN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(entry.created_at))}
                </p>
              </div>
              <Badge variant={entry.amount > 0 ? "secondary" : "outline"}>
                {entry.amount > 0 ? "+" : ""}
                {entry.amount} {entry.currency === "xp" ? "XP" : "token"}
              </Badge>
            </div>
          ))}
          {!data.ledger.length ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Hoàn thành bài học đầu tiên để nhận XP và token.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
