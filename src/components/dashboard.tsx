"use client";

import Link from "next/link";
import { Bot, BookOpen, Clock3, Coins, FileText, Star, Target, Waypoints } from "lucide-react";
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
import { useLocale } from "@/components/locale-provider";

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
  wallet: { xp: number; tokens: number };
};

export function Dashboard({ data }: { data: DashboardData }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[28px] bg-[linear-gradient(120deg,#075985,#0ea5e9_58%,#22d3ee)] p-7 text-white shadow-xl shadow-sky-200/70">
        <p className="text-sm text-sky-100">
          {t("dashboard.recentMinutes", { count: data.totalMinutes })}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
          {t("dashboard.question")}
        </h1>
        <p className="mt-3 max-w-2xl text-sky-50">
          {data.learningGoal || t("dashboard.noGoal")}
        </p>
        <Button nativeButton={false} className="mt-6 bg-white text-sky-800 hover:bg-sky-50" render={<Link href="/ai-tutor" />}>
          <Bot /> {t("dashboard.startTutor")}
        </Button>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Clock3} value={`${data.totalMinutes}`} label={t("dashboard.weekMinutes")} />
        <Metric icon={Target} value={`${data.goalPercent}%`} label={t("dashboard.dailyGoal", { count: data.dailyGoalMinutes })} />
        <Metric icon={Waypoints} value={`${data.enrollment?.progress ?? 0}%`} label={data.enrollment?.title || t("dashboard.noRoadmap")} />
        <Metric icon={Star} value={Number(data.wallet.xp).toLocaleString()} label="XP tích lũy" />
        <Metric icon={Coins} value={data.wallet.tokens.toLocaleString()} label="Lingora Tokens" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card className="glass-panel">
          <CardHeader><CardTitle>{t("dashboard.activity")}</CardTitle><CardDescription>{t("dashboard.activityDescription")}</CardDescription></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                initialDimension={{ width: 640, height: 256 }}
              >
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
          <CardHeader><CardTitle>{t("dashboard.skillProgress")}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            {data.progress.length ? data.progress.slice(0, 6).map((item) => (
              <div key={item.skill}>
                <div className="mb-1 flex justify-between text-sm"><span className="capitalize">{item.skill} · {item.level}</span><span>{Math.round(item.mastery)}%</span></div>
                <Progress value={item.mastery} />
              </div>
            )) : <Empty text={t("dashboard.noPractice")} />}
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader><CardTitle>{t("dashboard.recentVocabulary")}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.vocabulary.length ? data.vocabulary.map((item) => (
              <div key={item.id} className="rounded-xl bg-secondary/60 p-3">
                <p className="font-semibold">{item.word} <Badge variant="outline">{item.level || "—"}</Badge></p>
                <p className="text-sm text-muted-foreground">{item.meaning_vi}</p>
              </div>
            )) : <Empty text={t("dashboard.noVocabulary")} />}
            <Button nativeButton={false} variant="outline" render={<Link href="/vocabulary" />}><BookOpen /> {t("dashboard.openVocabulary")}</Button>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader><CardTitle>{t("dashboard.recentDocuments")}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.documents.length ? data.documents.map((item) => (
              <div key={item.id} className="rounded-xl bg-secondary/60 p-3">
                <p className="truncate font-semibold">{item.file_name}</p>
                <p className="text-xs text-muted-foreground">{item.status}</p>
              </div>
            )) : <Empty text={t("dashboard.noDocuments")} />}
            <Button nativeButton={false} variant="outline" render={<Link href="/documents" />}><FileText /> {t("dashboard.openDocuments")}</Button>
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
