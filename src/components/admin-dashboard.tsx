"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  Clock3,
  Database,
  MoreHorizontal,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import type { AdminUserRow } from "@/lib/admin-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Overview = {
  users: AdminUserRow[];
  stats: {
    users: number;
    activeToday: number;
    learningMinutes: number;
    trainingCandidates: number;
    totalXp: number;
    totalTokens: number;
    activeUnlocks: number;
  };
  contentStats: {
    paths: number;
    units: number;
    questions: number;
    documents: number;
  };
  analytics: {
    activity: Array<{
      date: string;
      activeUsers: number;
      events: number;
      minutes: number;
      registrations: number;
    }>;
    skills: Array<{ skill: string; attempts: number; minutes: number }>;
    locales: Array<{ name: string; value: number }>;
    levels: Array<{ name: string; value: number }>;
    plans: Array<{ name: string; value: number }>;
  };
};

const planColors = ["#cbd5e1", "#22d3ee", "#6366f1", "#f59e0b"];
const subscribeToClient = () => () => {};

export function AdminDashboard({ initial }: { initial: Overview }) {
  const [users, setUsers] = useState(initial.users);
  const chartsReady = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );

  async function updateUser(
    userId: string,
    changes: { role?: "user" | "admin"; status?: "active" | "suspended" },
  ) {
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...changes }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) return toast.error(data.error ?? "Không thể cập nhật.");
    setUsers((current) =>
      current.map((user) => (user.id === userId ? { ...user, ...changes } : user)),
    );
    toast.success("Đã cập nhật người dùng.");
  }

  const cards = [
    {
      label: "Tổng người dùng",
      value: initial.stats.users.toLocaleString(),
      detail: `${users.filter((user) => user.status === "active").length} đang hoạt động`,
      icon: Users,
      color: "bg-cyan-500",
    },
    {
      label: "Active hôm nay",
      value: initial.stats.activeToday.toLocaleString(),
      detail: "Người dùng duy nhất",
      icon: Activity,
      color: "bg-emerald-500",
    },
    {
      label: "Tổng phút học",
      value: initial.stats.learningMinutes.toLocaleString(),
      detail: `${initial.analytics.activity.reduce((sum, day) => sum + day.events, 0)} event trong 14 ngày`,
      icon: Clock3,
      color: "bg-indigo-500",
    },
    {
      label: "Dataset chờ duyệt",
      value: initial.stats.trainingCandidates.toLocaleString(),
      detail: "Yêu cầu admin kiểm tra",
      icon: BrainCircuit,
      color: "bg-amber-500",
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-[30px] bg-slate-950 p-7 text-white shadow-2xl shadow-slate-300/50">
        <div className="absolute right-0 top-0 size-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
              <Sparkles className="size-4" /> Lingora Operations
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              Tổng quan hệ thống
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Số liệu trực tiếp từ Supabase về học tập, nội dung, thuê bao và
              pipeline AI.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              className="bg-white text-slate-950 hover:bg-cyan-50"
              render={<Link href="/admin/billing" />}
            >
              Xem doanh thu <ArrowUpRight />
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              render={<Link href="/admin/ai" />}
            >
              Mở AI Lab
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="interactive-lift border-0 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <span
                className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-white ${card.color}`}
              >
                <card.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-slate-950">{card.value}</p>
                <p className="text-sm font-semibold text-slate-700">{card.label}</p>
                <p className="truncate text-xs text-slate-400">{card.detail}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Hoạt động 14 ngày</CardTitle>
            <CardDescription>
              Active users, event học tập và số phút phát sinh mỗi ngày.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[330px]">
              {chartsReady ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  initialDimension={{ width: 760, height: 330 }}
                >
                <AreaChart data={initial.analytics.activity}>
                  <defs>
                    <linearGradient id="activeUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} opacity={0.2} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => value.slice(5)}
                  />
                  <YAxis axisLine={false} tickLine={false} width={28} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="activeUsers"
                    name="Active users"
                    stroke="#0891b2"
                    strokeWidth={3}
                    fill="url(#activeUsers)"
                  />
                  <Area
                    type="monotone"
                    dataKey="registrations"
                    name="Đăng ký mới"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="transparent"
                  />
                </AreaChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Phân bố gói</CardTitle>
            <CardDescription>Thuê bao đang active, trialing hoặc past due.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[245px]">
              {chartsReady ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  initialDimension={{ width: 420, height: 245 }}
                >
                <PieChart>
                  <Pie
                    data={initial.analytics.plans}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={96}
                    paddingAngle={3}
                  >
                    {initial.analytics.plans.map((entry, index) => (
                      <Cell key={entry.name} fill={planColors[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
                </ResponsiveContainer>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {initial.analytics.plans.map((plan, index) => (
                <div
                  key={plan.name}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2 capitalize">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: planColors[index] }}
                    />
                    {plan.name}
                  </span>
                  <strong>{plan.value}</strong>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Hoạt động theo kỹ năng</CardTitle>
            <CardDescription>Số event thực tế trong 14 ngày gần nhất.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartsReady ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  initialDimension={{ width: 620, height: 300 }}
                >
                <BarChart data={initial.analytics.skills.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="4 4" horizontal={false} opacity={0.2} />
                  <XAxis type="number" axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="skill"
                    axisLine={false}
                    tickLine={false}
                    width={82}
                  />
                  <Tooltip />
                  <Bar dataKey="attempts" name="Event" fill="#6366f1" radius={[0, 8, 8, 0]} />
                </BarChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Kho nội dung</CardTitle>
            <CardDescription>Dữ liệu hiện có trong hệ thống học tập.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              ["Lộ trình", initial.contentStats.paths, "learning_paths"],
              ["Bài học", initial.contentStats.units, "learning_units"],
              ["Câu hỏi", initial.contentStats.questions, "practice_questions"],
              ["Tài liệu", initial.contentStats.documents, "documents"],
            ].map(([label, value, table]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-2xl font-bold text-slate-950">
                  {Number(value).toLocaleString()}
                </p>
                <p className="mt-1 text-sm font-semibold">{label}</p>
                <code className="text-[11px] text-slate-400">{table}</code>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["XP đang lưu hành", initial.stats.totalXp.toLocaleString(), "Tổng XP trong ví user"],
          ["Token chưa sử dụng", initial.stats.totalTokens.toLocaleString(), "Token economy hiện tại"],
          ["Quyền mở khóa active", initial.stats.activeUnlocks.toLocaleString(), "Unlock có expires_at còn hạn"],
        ].map(([label, value, description]) => (
          <Card key={label} className="border-0 bg-slate-950 text-white shadow-sm">
            <CardContent className="p-5">
              <p className="text-2xl font-bold">{value}</p>
              <p className="mt-1 text-sm font-semibold text-cyan-300">{label}</p>
              <p className="mt-1 text-xs text-slate-400">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Người dùng gần đây</CardTitle>
            <CardDescription>
              Quản lý role, trạng thái và quyền đóng góp dữ liệu AI.
            </CardDescription>
          </div>
          <Button nativeButton={false} variant="outline" render={<Link href="/admin/users" />}>
            Xem tất cả
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Người dùng</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Locale</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.slice(0, 10).map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <p className="font-medium">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === "active" ? "secondary" : "destructive"}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.level}</TableCell>
                  <TableCell>{user.locale.toUpperCase()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={() =>
                              updateUser(user.id, {
                                role: user.role === "admin" ? "user" : "admin",
                              })
                            }
                          >
                            <ShieldCheck />
                            Đổi thành {user.role === "admin" ? "user" : "admin"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              updateUser(user.id, {
                                status:
                                  user.status === "active" ? "suspended" : "active",
                              })
                            }
                          >
                            <Database />
                            {user.status === "active" ? "Khóa tài khoản" : "Mở khóa"}
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
