"use client";

import Link from "next/link";
import { Bot, BookOpen, Clock3, FileText, Target, Waypoints } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
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
import { ProviderQuickPanel } from "@/components/provider-quick-panel";

type DashboardData = {
  learningGoal: string;
  dailyGoalMinutes: number;
  totalMinutes: number;
  goalPercent: number;
  weekly: Array<{ day: string; minutes: number }>;
  progress: Array<{
    skill: string;
    level: string;
    mastery: number;
    totalMinutes: number;
    totalAttempts: number;
  }>;
  vocabulary: Array<{ id: string; word: string; meaning_vi: string; level: string | null }>;
  documents: Array<{ id: string; file_name: string; status: string }>;
  enrollment: { title: string; targetLevel: string; progress: number } | null;
};

export function Dashboard({ data }: { data: DashboardData }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[28px] bg-[linear-gradient(120deg,#075985,#0ea5e9_58%,#22d3ee)] p-7 text-white shadow-xl shadow-sky-200/70">
        <p className="text-sm text-sky-100">
          {data.totalMinutes} phút trong 7 ngày gần nhất
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
          Hôm nay bạn muốn học gì?
        </h1>
        <p className="mt-3 max-w-2xl text-sky-50">
          {data.learningGoal || "Hãy đặt mục tiêu học tập trong phần Cài đặt để Lingora cá nhân hóa lộ trình."}
        </p>
        <Button className="mt-6 bg-white text-sky-800 hover:bg-sky-50" render={<Link href="/ai-tutor" />}>
          <Bot /> Bắt đầu với gia sư AI
        </Button>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric icon={Clock3} value={`${data.totalMinutes}`} label="phút học tuần này" />
        <Metric icon={Target} value={`${data.goalPercent}%`} label={`mục tiêu ${data.dailyGoalMinutes} phút/ngày`} />
        <Metric icon={Waypoints} value={`${data.enrollment?.progress ?? 0}%`} label={data.enrollment?.title || "chưa đăng ký lộ trình"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card className="glass-panel">
          <CardHeader><CardTitle>Hoạt động 7 ngày</CardTitle><CardDescription>Tổng hợp từ learning_events của tài khoản</CardDescription></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={data.weekly}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} opacity={0.25} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="minutes" stroke="#0ea5e9" fill="#bae6fd" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <ProviderQuickPanel />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="glass-panel">
          <CardHeader><CardTitle>Tiến độ kỹ năng</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            {data.progress.length ? data.progress.slice(0, 6).map((item) => (
              <div key={item.skill}>
                <div className="mb-1 flex justify-between text-sm"><span className="capitalize">{item.skill} · {item.level}</span><span>{Math.round(item.mastery)}%</span></div>
                <Progress value={item.mastery} />
              </div>
            )) : <Empty text="Chưa có lần luyện nào." />}
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader><CardTitle>Từ vựng gần đây</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.vocabulary.length ? data.vocabulary.map((item) => (
              <div key={item.id} className="rounded-xl bg-secondary/60 p-3">
                <p className="font-semibold">{item.word} <Badge variant="outline">{item.level || "—"}</Badge></p>
                <p className="text-sm text-muted-foreground">{item.meaning_vi}</p>
              </div>
            )) : <Empty text="Chưa có từ đã lưu." />}
            <Button variant="outline" render={<Link href="/vocabulary" />}><BookOpen /> Mở từ vựng</Button>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader><CardTitle>Tài liệu gần đây</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.documents.length ? data.documents.map((item) => (
              <div key={item.id} className="rounded-xl bg-secondary/60 p-3">
                <p className="truncate font-semibold">{item.file_name}</p>
                <p className="text-xs text-muted-foreground">{item.status}</p>
              </div>
            )) : <Empty text="Chưa tải tài liệu." />}
            <Button variant="outline" render={<Link href="/documents" />}><FileText /> Mở tài liệu</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, value, label }: { icon: typeof Clock3; value: string; label: string }) {
  return <Card className="glass-panel"><CardContent className="flex items-center gap-4 p-5"><Icon className="size-6 text-primary" /><div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">{text}</p>;
}
