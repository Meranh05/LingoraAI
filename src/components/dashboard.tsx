"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  Check,
  Coins,
  Crown,
  Flame,
  Headphones,
  LockKeyhole,
  MessageCircle,
  PenLine,
  Play,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MascotSprite } from "@/components/lingora-mascot";
import { getDailyQuests, getLevelState, getStreak } from "@/lib/gamification";
import { cn } from "@/lib/utils";

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
  challenges: Array<{
    id: string;
    title: string;
    description: string;
    target: number;
    rewardXp: number;
    rewardTokens: number;
    type: string;
    difficulty: string;
    badgeIcon: string;
    levelRequired: number;
    endsAt: string;
    progress: number;
    completed: boolean;
    joined: boolean;
    mascot: string;
  }>;
};

const checkpoints = [
  { title: "Khởi động", icon: Play, href: "/practice" },
  { title: "Nền tảng", icon: BookOpen, href: "/vocabulary" },
  { title: "Giao tiếp", icon: MessageCircle, href: "/speaking" },
  { title: "Diễn đạt", icon: PenLine, href: "/writing" },
  { title: "Phản xạ", icon: Headphones, href: "/listening" },
];

export function Dashboard({ data }: { data: DashboardData }) {
  const level = getLevelState(Number(data.wallet.xp));
  const streak = getStreak(data.weekly);
  const attempts = data.progress.reduce((sum, item) => sum + item.totalAttempts, 0);
  const quests = getDailyQuests({
    totalMinutes: data.totalMinutes,
    todayMinutes: data.weekly.at(-1)?.minutes ?? 0,
    vocabularyCount: data.vocabulary.length,
    attempts,
    documents: data.documents.length,
  });
  const completedQuests = quests.filter((quest) => quest.completed).length;
  const routeProgress = data.enrollment?.progress ?? level.progress;
  const currentCheckpoint = Math.min(4, Math.floor(routeProgress / 22));
  const averageMastery = data.progress.length
    ? Math.round(data.progress.reduce((sum, item) => sum + item.mastery, 0) / data.progress.length)
    : 0;
  const boss = data.challenges.find((challenge) => challenge.type === "boss");

  return (
    <div className="page-enter flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-[30px] border border-white/80 bg-white/85 px-6 py-7 shadow-xl shadow-sky-200/40 md:px-8">
        <div className="absolute -right-20 -top-24 size-72 rounded-full bg-cyan-200/45 blur-3xl" />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-sky-600">Hành trình hôm nay</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              Tiến thêm một checkpoint
            </h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              {data.learningGoal || "Lumo đã phối hợp các kỹ năng để mỗi buổi học có một nhịp điệu khác nhau."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button nativeButton={false} render={<Link href={checkpoints[currentCheckpoint].href} />}>
                Bắt đầu nhiệm vụ <ArrowRight />
              </Button>
              <Button nativeButton={false} variant="outline" render={<Link href="/roadmap" />}>
                Xem toàn bộ lộ trình
              </Button>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
            {completedQuests >= 2 ? (
              <Image
                src="/mascot/lumo-celebration.gif"
                alt="Lumo đang ăn mừng"
                width={160}
                height={160}
                unoptimized
                className="size-32 object-contain md:size-40"
              />
            ) : (
              <MascotSprite mood="wave" className="size-32 md:size-40" />
            )}
            <div className="relative max-w-56 rounded-2xl border border-sky-100 bg-white p-4 text-sm text-slate-600 shadow-lg">
              <span className="absolute -left-2 top-8 size-4 rotate-45 border-b border-l border-sky-100 bg-white" />
              <strong className="block text-sky-700">
                {completedQuests === 3 ? "Tuyệt vời!" : `${completedQuests}/3 nhiệm vụ`}
              </strong>
              {completedQuests === 3
                ? "Rương bí ẩn hôm nay đã sẵn sàng."
                : "Hoàn thành thêm nhiệm vụ để tăng combo XP nhé!"}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Hud icon={Crown} label={`Level ${level.level} · ${level.title}`} value={`${level.current} / ${level.required} XP`} color="text-indigo-600" />
        <Hud icon={Coins} label="Lingora Tokens" value={data.wallet.tokens.toLocaleString()} color="text-amber-500" />
        <Hud icon={Flame} label="Chuỗi hiện tại" value={`${streak} ngày`} color="text-orange-500" />
        <Hud icon={Zap} label="Combo học tập" value={streak >= 7 ? "x2 XP" : streak >= 3 ? "x1.5 XP" : "x1 XP"} color="text-cyan-600" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_350px]">
        <div className="flex flex-col gap-5">
          <Card className="overflow-hidden border-0 bg-gradient-to-b from-sky-100/85 to-white shadow-lg shadow-sky-200/40">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Bản đồ Level {level.level}</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Hoàn thành kỹ năng để mở đường tới thử thách tiếp theo.
                </p>
              </div>
              <span className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-sky-700 shadow-sm">
                {routeProgress}%
              </span>
            </CardHeader>
            <CardContent>
              <div className="journey-path relative grid min-h-64 grid-cols-5 items-center gap-2 rounded-[26px] border border-white/80 bg-white/55 px-3 py-8">
                {checkpoints.map((checkpoint, index) => {
                  const complete = index < currentCheckpoint;
                  const current = index === currentCheckpoint;
                  const locked = index > currentCheckpoint;
                  return (
                    <Link
                      key={checkpoint.title}
                      href={locked ? "#" : checkpoint.href}
                      aria-disabled={locked}
                      className={cn(
                        "group flex flex-col items-center gap-3 text-center transition",
                        index % 2 ? "translate-y-8" : "-translate-y-5",
                        locked ? "cursor-not-allowed opacity-55" : "hover:-translate-y-2",
                      )}
                    >
                      <span className={cn(
                        "quest-shine flex size-14 items-center justify-center rounded-2xl border-4 border-white shadow-lg md:size-18",
                        complete && "bg-emerald-500 text-white",
                        current && "scale-110 bg-gradient-to-br from-sky-500 to-indigo-600 text-white ring-8 ring-sky-200/60",
                        locked && "bg-slate-300 text-slate-500",
                      )}>
                        {complete ? <Check /> : locked ? <LockKeyhole /> : <checkpoint.icon />}
                      </span>
                      <span className="text-xs font-bold text-slate-700 md:text-sm">{checkpoint.title}</span>
                      {current ? <span className="rounded-full bg-sky-600 px-2 py-1 text-[10px] font-bold text-white">Hiện tại</span> : null}
                    </Link>
                  );
                })}
              </div>
              <div className="mt-5 flex items-center gap-3">
                <Progress value={routeProgress} className="flex-1" />
                <span className="text-sm font-semibold text-slate-600">{routeProgress}% hoàn thành</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            <Card className="border-0 shadow-sm">
              <CardContent className="grid gap-5 p-5 sm:grid-cols-[150px_1fr]">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-200 via-rose-100 to-indigo-200">
                  <MascotSprite mood="read" className="mx-auto size-36" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Gợi ý không lặp lại</span>
                  <h2 className="mt-2 text-xl font-bold">Kể lại một kỷ niệm trong 60 giây</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Kết hợp nói, từ vựng và phản xạ. AI sẽ đổi chủ đề và độ khó theo kết quả gần nhất.
                  </p>
                  <Button nativeButton={false} className="mt-4" render={<Link href="/speaking" />}>
                    Thử ngay <Play />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-slate-950 text-white shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                  <p className="text-sm font-semibold text-violet-300">Thử thách Boss tuần</p>
                    <h2 className="mt-1 text-xl font-bold">{boss?.title ?? "Conversation Master"}</h2>
                  </div>
                  <Trophy className="size-8 text-amber-400" />
                </div>
                <p className="mt-3 text-sm text-slate-300">
                  {boss?.description ?? "Đạt độ thành thạo trung bình 80% để chiến thắng."}
                </p>
                <Progress
                  value={boss ? Math.min(100, (boss.progress / boss.target) * 100) : Math.min(100, averageMastery)}
                  className="mt-5"
                />
                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>{boss ? `${boss.progress}/${boss.target}` : `${averageMastery}% sức mạnh`}</span>
                  <span>+{boss?.rewardXp ?? 200} XP · +{boss?.rewardTokens ?? 80} Token</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <aside className="flex flex-col gap-5">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Nhiệm vụ hằng ngày
                <Sparkles className="size-5 text-sky-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {quests.map((quest, index) => (
                <Link key={quest.id} href={quest.href} className="interactive-lift rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-start gap-3">
                    <span className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl font-bold",
                      quest.completed ? "bg-emerald-100 text-emerald-600" : ["bg-sky-100 text-sky-600", "bg-violet-100 text-violet-600", "bg-amber-100 text-amber-600"][index],
                    )}>
                      {quest.completed ? <Check className="size-4" /> : index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-2">
                        <p className="text-sm font-semibold">{quest.title}</p>
                        <span className="text-xs font-bold text-sky-600">+{quest.rewardXp} XP</span>
                      </div>
                      <Progress value={(quest.value / quest.target) * 100} className="mt-3" />
                      <p className="mt-1 text-right text-xs text-slate-400">{quest.value}/{quest.target}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className={cn(
            "quest-shine border-0 text-white shadow-lg",
            completedQuests >= 2
              ? "bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500"
              : "bg-gradient-to-br from-slate-700 to-slate-900",
          )}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-white/15">
                <span className="text-5xl">{completedQuests >= 2 ? "🎁" : "🔒"}</span>
              </div>
              <div>
                <p className="font-bold">Rương bí ẩn</p>
                <p className="mt-1 text-sm text-white/75">{completedQuests}/3 nhiệm vụ hoàn thành</p>
                <p className="mt-2 text-xs font-semibold">
                  {completedQuests >= 2 ? "Sắp mở khóa phần thưởng bất ngờ!" : "Hoàn thành thêm nhiệm vụ"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Tiến độ level</p>
                  <p className="text-2xl font-black">{level.progress}%</p>
                </div>
                <Star className="size-8 fill-amber-400 text-amber-400" />
              </div>
              <Progress value={level.progress} className="mt-4" />
              <p className="mt-3 text-xs text-slate-500">
                Còn {level.required - level.current} XP để lên Level {level.level + 1}.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Hud({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Crown;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
      <span className={cn("flex size-11 items-center justify-center rounded-2xl bg-slate-50", color)}>
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-sm font-bold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{value}</p>
      </div>
    </div>
  );
}
