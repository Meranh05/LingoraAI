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
  Flag,
  Gem,
  Rocket,
  ShieldCheck,
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
  { title: "Khởi động", subtitle: "Làm quen nhịp học", icon: Play, href: "/practice", xp: 25, sticker: "🌱", scenery: "🌼", color: "from-cyan-400 to-sky-500" },
  { title: "Từ vựng", subtitle: "Xây nền từ mới", icon: BookOpen, href: "/vocabulary", xp: 40, sticker: "🍎", scenery: "🦋", color: "from-emerald-400 to-teal-500" },
  { title: "Nghe hiểu", subtitle: "Bắt âm và ý chính", icon: Headphones, href: "/listening", xp: 55, sticker: "🎧", scenery: "🎵", color: "from-blue-400 to-indigo-500" },
  { title: "Checkpoint", subtitle: "Kiểm tra nền tảng", icon: Flag, href: "/quiz", xp: 80, sticker: "🏕️", scenery: "⭐", color: "from-amber-400 to-orange-500", milestone: true },
  { title: "Giao tiếp", subtitle: "Phản xạ hội thoại", icon: MessageCircle, href: "/speaking", xp: 65, sticker: "💬", scenery: "☁️", color: "from-pink-400 to-rose-500" },
  { title: "Diễn đạt", subtitle: "Viết rõ và tự nhiên", icon: PenLine, href: "/writing", xp: 70, sticker: "✏️", scenery: "🌈", color: "from-violet-400 to-purple-500" },
  { title: "Đọc sâu", subtitle: "Hiểu ngữ cảnh", icon: Sparkles, href: "/reading", xp: 75, sticker: "📖", scenery: "🍀", color: "from-teal-400 to-cyan-500" },
  { title: "Thử thách", subtitle: "Kết hợp 4 kỹ năng", icon: ShieldCheck, href: "/practice", xp: 100, sticker: "🛡️", scenery: "⚡", color: "from-orange-400 to-amber-500", milestone: true },
  { title: "Dịch thuật", subtitle: "Chuyển ý chính xác", icon: Rocket, href: "/translation", xp: 85, sticker: "🌍", scenery: "🚀", color: "from-sky-400 to-blue-600" },
  { title: "Boss Level", subtitle: "Chinh phục cấp độ", icon: Trophy, href: "/quiz", xp: 150, sticker: "🏆", scenery: "👑", color: "from-fuchsia-500 to-violet-600", boss: true },
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
  const currentCheckpoint = Math.min(
    checkpoints.length - 1,
    Math.floor((routeProgress / 100) * checkpoints.length),
  );
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
        <div className="min-w-0 flex flex-col gap-5">
          <Card className="min-w-0 overflow-hidden border-0 bg-gradient-to-b from-sky-100/90 via-white to-indigo-50/60 shadow-xl shadow-sky-200/40">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Bản đồ Level {level.level}</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  10 chặng thích ứng kết hợp bài học, checkpoint và Boss Level.
                </p>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <span className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-sky-700 shadow-sm">
                  Chặng {currentCheckpoint + 1}/{checkpoints.length}
                </span>
                <span className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white shadow-sm">
                  {routeProgress}%
                </span>
              </div>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="journey-world relative w-full min-w-0 max-w-full overflow-hidden rounded-[32px] border border-white/90 bg-gradient-to-b from-sky-50 via-white to-emerald-50/70 px-4 py-8 shadow-inner sm:px-7">
                <div className="absolute -left-10 bottom-0 h-28 w-56 rounded-[50%] bg-emerald-100/70 blur-sm" />
                <div className="absolute -right-12 bottom-0 h-32 w-64 rounded-[50%] bg-lime-100/70 blur-sm" />
                <span className="journey-cloud absolute left-[8%] top-5 text-4xl opacity-70" aria-hidden>☁️</span>
                <span className="journey-cloud absolute right-[12%] top-8 text-3xl opacity-50 [animation-delay:1.2s]" aria-hidden>☁️</span>
                <span className="absolute left-[46%] top-4 text-2xl" aria-hidden>🌤️</span>
                <span className="absolute bottom-4 left-[4%] text-xl" aria-hidden>🌷</span>
                <span className="absolute bottom-3 right-[5%] text-xl" aria-hidden>🌻</span>
                <p className="relative mb-5 text-center text-xs font-semibold text-sky-700 sm:hidden">
                  Vuốt để khám phá các chặng <span aria-hidden>👉</span>
                </p>
                <div className="journey-route absolute left-[9%] right-[9%] top-[27%] hidden h-[46%] lg:block" aria-hidden>
                  <svg viewBox="0 0 1000 260" className="size-full overflow-visible" preserveAspectRatio="none">
                    <path
                      d="M 18 35 C 160 5, 335 10, 480 35 S 815 70, 982 35 C 1015 105, 910 225, 790 220 S 570 195, 500 220 S 210 245, 18 220"
                      fill="none"
                      stroke="white"
                      strokeWidth="14"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 18 35 C 160 5, 335 10, 480 35 S 815 70, 982 35 C 1015 105, 910 225, 790 220 S 570 195, 500 220 S 210 245, 18 220"
                      fill="none"
                      stroke="rgb(125 211 252 / .9)"
                      strokeWidth="5"
                      strokeDasharray="4 16"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="relative flex w-full min-w-0 max-w-full snap-x snap-mandatory gap-5 overflow-x-auto px-2 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5">
                {checkpoints.map((checkpoint, index) => {
                  const complete = index < currentCheckpoint;
                  const current = index === currentCheckpoint;
                  const locked = index > currentCheckpoint;
                  return (
                    <Link
                      key={checkpoint.title}
                      href={locked ? "#" : checkpoint.href}
                      aria-disabled={locked}
                      onClick={(event) => locked && event.preventDefault()}
                      className={cn(
                        "group relative flex min-h-48 basis-[82%] shrink-0 snap-center flex-col items-center justify-center gap-2 rounded-[28px] border p-4 text-center transition duration-300 sm:basis-auto",
                        locked
                          ? "cursor-not-allowed border-white/80 bg-white/60 text-slate-400"
                          : "border-white bg-white/90 shadow-lg shadow-sky-100 hover:-translate-y-2 hover:rotate-[.4deg] hover:shadow-xl",
                        current && "border-sky-300 bg-gradient-to-b from-white to-sky-50 ring-4 ring-sky-100",
                        checkpoint.milestone && !locked && "border-amber-200 bg-gradient-to-b from-amber-50 to-white",
                        checkpoint.boss && !locked && "border-violet-300 bg-gradient-to-b from-violet-50 to-white",
                      )}
                    >
                      <span className={cn(
                        "absolute -left-2 -top-3 z-10 flex size-11 rotate-[-8deg] items-center justify-center rounded-2xl border-4 border-white bg-white text-2xl shadow-md transition group-hover:rotate-6 group-hover:scale-110",
                        locked && "saturate-75",
                      )} aria-hidden>
                        {checkpoint.sticker}
                      </span>
                      <span className="absolute right-3 top-3 rounded-full border border-white bg-white/90 px-2 py-1 text-[10px] font-black text-slate-500 shadow-sm">
                        +{checkpoint.xp} XP
                      </span>
                      <span className={cn(
                        "absolute bottom-2 right-3 text-xl opacity-70 transition group-hover:scale-125",
                        locked && "opacity-45",
                      )} aria-hidden>
                        {checkpoint.scenery}
                      </span>
                      <span className={cn(
                        "quest-shine flex size-17 items-center justify-center rounded-[24px] border-4 border-white shadow-[0_12px_24px_-10px_rgba(14,116,144,.55)]",
                        complete && "bg-emerald-500 text-white",
                        current && cn("scale-110 bg-gradient-to-br text-white ring-8 ring-sky-200/60", checkpoint.color),
                        locked && "bg-slate-200 text-slate-400",
                        !locked && !complete && !current && cn("bg-gradient-to-br text-white", checkpoint.color),
                      )}>
                        {complete ? <Check /> : locked ? <LockKeyhole /> : <checkpoint.icon />}
                      </span>
                      {current ? (
                        <span className="pointer-events-none absolute -bottom-9 left-1/2 z-20 hidden -translate-x-1/2 lg:block">
                          <MascotSprite mood="encourage" className="size-20" />
                        </span>
                      ) : null}
                      <span className="mt-2 text-sm font-black text-slate-800">{checkpoint.title}</span>
                      <span className="text-xs text-slate-500">{checkpoint.subtitle}</span>
                      {current ? (
                        <span className="rounded-full bg-sky-600 px-3 py-1 text-[10px] font-bold text-white">Học ngay</span>
                      ) : complete ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-700">Đã hoàn thành</span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                          <LockKeyhole className="size-3" /> Hoàn thành chặng trước
                        </span>
                      )}
                    </Link>
                  );
                })}
                </div>
                <div className="relative mt-10 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/90 bg-white/75 px-4 py-3 text-xs font-semibold text-slate-500 shadow-sm backdrop-blur-sm">
                  <span className="text-base" aria-hidden>🎒</span>
                  Bộ sưu tập sticker:
                  {checkpoints.slice(0, Math.max(1, currentCheckpoint + 1)).map((checkpoint, index) => (
                    <span
                      key={checkpoint.title}
                      title={checkpoint.title}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-xl border border-sky-100 bg-white text-lg shadow-sm",
                        index === currentCheckpoint && "sticker-pop ring-2 ring-sky-300",
                      )}
                    >
                      {checkpoint.sticker}
                    </span>
                  ))}
                  <span className="ml-1 text-sky-700">{Math.max(1, currentCheckpoint + 1)}/{checkpoints.length} đã khám phá</span>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <Progress value={routeProgress} className="flex-1" />
                <span className="text-sm font-semibold text-slate-600">{routeProgress}% hoàn thành</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <JourneySummary icon={Gem} label="Phần thưởng kế tiếp" value={`+${checkpoints[currentCheckpoint].xp} XP`} color="text-violet-600" />
                <JourneySummary icon={Flag} label="Checkpoint gần nhất" value={currentCheckpoint < 3 ? "Chặng 4" : currentCheckpoint < 7 ? "Chặng 8" : "Boss Level"} color="text-amber-600" />
                <JourneySummary icon={Rocket} label="Nhiệm vụ đề xuất" value={checkpoints[currentCheckpoint].title} color="text-sky-600" />
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

function JourneySummary({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Gem;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Link
      href="/roadmap"
      className="interactive-lift flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/90 p-3 shadow-sm"
    >
      <span className={cn("flex size-10 items-center justify-center rounded-xl bg-slate-50", color)}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <span className="block truncate text-sm font-black text-slate-800">{value}</span>
      </span>
    </Link>
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
