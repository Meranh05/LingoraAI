"use client";

import {
  AlertTriangle,
  CircleDollarSign,
  CreditCard,
  RefreshCcw,
  Users,
} from "lucide-react";
import { useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminBillingRow } from "@/lib/admin-data";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BillingAdminData = {
  subscriptions: AdminBillingRow[];
  transactions: Array<{
    id: string;
    user_id: string | null;
    event_type: string;
    plan_code: string | null;
    amount: number | null;
    currency: string | null;
    status: string | null;
    created_at: string;
  }>;
  stats: {
    active: number;
    trialing: number;
    pastDue: number;
    canceling: number;
    mrrVnd: number;
    mrrUsd: number;
  };
};

function money(amount: number, currency: "VND" | "USD") {
  return new Intl.NumberFormat(currency === "VND" ? "vi-VN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "VND" ? 0 : 2,
  }).format(currency === "USD" ? amount / 100 : amount);
}

const subscribeToClient = () => () => {};

export function AdminBilling({ data }: { data: BillingAdminData }) {
  const chartReady = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );

  const revenueByDay = Array.from(
    data.transactions.reduce((map, transaction) => {
      if (transaction.amount === null || !transaction.currency) return map;
      const date = transaction.created_at.slice(0, 10);
      const current = map.get(date) ?? { date, vnd: 0, usd: 0 };
      if (transaction.currency.toLowerCase() === "usd") {
        current.usd += transaction.amount / 100;
      } else {
        current.vnd += transaction.amount;
      }
      map.set(date, current);
      return map;
    }, new Map<string, { date: string; vnd: number; usd: number }>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
  const cards = [
    ["Thuê bao hoạt động", data.stats.active.toLocaleString(), Users],
    [
      "MRR ước tính",
      `${money(data.stats.mrrVnd, "VND")} + ${money(data.stats.mrrUsd, "USD")}`,
      CircleDollarSign,
    ],
    ["Đang dùng thử", data.stats.trialing.toLocaleString(), RefreshCcw],
    ["Quá hạn thanh toán", data.stats.pastDue.toLocaleString(), AlertTriangle],
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Gói và doanh thu
        </h1>
        <p className="mt-2 text-slate-500">
          Theo dõi thuê bao Stripe, doanh thu định kỳ và trạng thái gia hạn.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5 text-cyan-600" />
            Thuê bao người dùng
          </CardTitle>
          <CardDescription>
            {data.stats.canceling} thuê bao đã đặt hủy cuối chu kỳ.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Người dùng</TableHead>
                <TableHead>Gói</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Tiền tệ</TableHead>
                <TableHead>Hết chu kỳ</TableHead>
                <TableHead>Gia hạn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.subscriptions.map((subscription) => (
                <TableRow key={subscription.userId}>
                  <TableCell>
                    <p className="font-medium">{subscription.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {subscription.email}
                    </p>
                  </TableCell>
                  <TableCell className="font-semibold uppercase">
                    {subscription.planCode}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        subscription.status === "active"
                          ? "secondary"
                          : subscription.status === "past_due"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {subscription.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{subscription.currency?.toUpperCase() ?? "-"}</TableCell>
                  <TableCell>
                    {subscription.currentPeriodEnd
                      ? new Intl.DateTimeFormat("vi-VN", {
                          dateStyle: "medium",
                        }).format(new Date(subscription.currentPeriodEnd))
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {subscription.cancelAtPeriodEnd ? "Sẽ hủy" : "Tự động"}
                  </TableCell>
                </TableRow>
              ))}
              {!data.subscriptions.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                    Chưa có thuê bao trả phí.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Giao dịch theo ngày</CardTitle>
          <CardDescription>
            Giá trị event Stripe đã nhận, tách riêng VND và USD.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {chartReady ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                initialDimension={{ width: 900, height: 300 }}
              >
              <BarChart data={revenueByDay}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} opacity={0.2} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => value.slice(5)}
                />
                <YAxis axisLine={false} tickLine={false} width={50} />
                <Tooltip />
                <Bar dataKey="vnd" name="VND" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                <Bar dataKey="usd" name="USD" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sự kiện thanh toán gần đây</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {data.transactions.slice(0, 20).map((transaction) => (
            <div
              key={transaction.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm"
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
              <div className="flex items-center gap-2">
                {transaction.amount !== null && transaction.currency ? (
                  <span className="font-semibold">
                    {money(
                      transaction.amount,
                      transaction.currency.toLowerCase() === "usd" ? "USD" : "VND",
                    )}
                  </span>
                ) : null}
                <Badge variant="outline">{transaction.status ?? "received"}</Badge>
              </div>
            </div>
          ))}
          {!data.transactions.length ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Chưa nhận sự kiện Stripe.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
