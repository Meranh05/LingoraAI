"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Clock3,
  FileText,
  Headphones,
  PenLine,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { motion } from "framer-motion";
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

const weeklyData = [
  { day: "T2", minutes: 24 },
  { day: "T3", minutes: 42 },
  { day: "T4", minutes: 30 },
  { day: "T5", minutes: 56 },
  { day: "T6", minutes: 38 },
  { day: "T7", minutes: 68 },
  { day: "CN", minutes: 48 },
];

const modules = [
  {
    title: "Đọc hiểu theo tài liệu",
    description: "Technology in Education",
    progress: 68,
    meta: "12 phút còn lại",
    href: "/learn/reading",
    icon: FileText,
    color: "bg-sky-100 text-sky-700",
  },
  {
    title: "Từ vựng B1",
    description: "Daily communication",
    progress: 45,
    meta: "18 / 40 từ",
    href: "/learn/vocabulary",
    icon: BookOpen,
    color: "bg-cyan-100 text-cyan-700",
  },
  {
    title: "Luyện phát âm",
    description: "Connected speech",
    progress: 82,
    meta: "Bài 7 / 9",
    href: "/learn/speaking",
    icon: Headphones,
    color: "bg-indigo-100 text-indigo-700",
  },
];

const words = [
  ["contextual", "theo ngữ cảnh", "B2"],
  ["coherence", "tính mạch lạc", "C1"],
  ["accurate", "chính xác", "B1"],
  ["fluency", "độ trôi chảy", "B2"],
];

export function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(120deg,#075985,#0ea5e9_58%,#22d3ee)] p-6 text-white shadow-xl shadow-sky-200/70 md:p-8"
      >
        <div className="relative z-10 max-w-2xl">
          <p className="mb-2 text-sm font-medium text-sky-100">
            Chuỗi học 7 ngày · 320 phút tuần này
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Hôm nay bạn muốn học gì?
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-sky-50 md:text-base">
            Hỏi gia sư AI, luyện một kỹ năng hoặc tiếp tục bài học gần nhất.
            Lingora sẽ giải thích bằng tiếng Việt và đưa ví dụ tự nhiên.
          </p>
          <Button
            className="mt-6 bg-white text-sky-800 hover:bg-sky-50"
            render={<Link href="/ai-tutor" />}
          >
            <Bot data-icon="inline-start" />
            Bắt đầu với gia sư AI
          </Button>
        </div>
        <Sparkles className="absolute -right-8 -top-10 size-56 rotate-12 text-white/10" />
        <svg
          className="absolute inset-x-0 bottom-0 h-24 w-full opacity-20"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,68 C180,15 280,108 460,60 C650,8 780,110 950,52 C1050,20 1120,30 1200,16"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
          />
        </svg>
      </motion.section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Tiếp tục học</h2>
            <p className="text-sm text-muted-foreground">
              Quay lại đúng vị trí bạn đã dừng.
            </p>
          </div>
          <Button variant="ghost" size="sm">
            Xem tất cả <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {modules.map((module, index) => {
            const Icon = module.icon;
            return (
              <motion.div
                key={module.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <Card className="glass-panel h-full transition-transform hover:-translate-y-0.5">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex size-11 items-center justify-center rounded-2xl ${module.color}`}
                      >
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <CardTitle className="text-base">{module.title}</CardTitle>
                        <CardDescription>{module.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <Progress value={module.progress} />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{module.meta}</span>
                      <span>{module.progress}%</span>
                    </div>
                    <Button
                      variant="outline"
                      className="mt-1 w-full bg-white/70"
                      render={<Link href={module.href} />}
                    >
                      Tiếp tục
                      <ArrowRight data-icon="inline-end" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <Card className="glass-panel">
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Tiến độ tuần này</CardTitle>
              <CardDescription>Phút học chủ động mỗi ngày</CardDescription>
            </div>
            <Badge variant="secondary">+18% so với tuần trước</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                initialDimension={{ width: 760, height: 250 }}
              >
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="minutes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} opacity={0.25} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 14,
                      borderColor: "#bae6fd",
                      boxShadow: "0 12px 30px rgba(14,116,144,.12)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="minutes"
                    stroke="#0ea5e9"
                    strokeWidth={3}
                    fill="url(#minutes)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-secondary/60 p-3">
                <Clock3 className="mb-2 size-4 text-primary" />
                <p className="text-lg font-bold">306</p>
                <p className="text-xs text-muted-foreground">phút học</p>
              </div>
              <div className="rounded-xl bg-secondary/60 p-3">
                <Target className="mb-2 size-4 text-primary" />
                <p className="text-lg font-bold">84%</p>
                <p className="text-xs text-muted-foreground">mục tiêu</p>
              </div>
              <div className="rounded-xl bg-secondary/60 p-3">
                <Trophy className="mb-2 size-4 text-primary" />
                <p className="text-lg font-bold">7</p>
                <p className="text-xs text-muted-foreground">ngày liên tục</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <ProviderQuickPanel />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Từ vựng gần đây</CardTitle>
            <CardDescription>Ôn nhanh những từ vừa lưu</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {words.map(([word, meaning, level]) => (
              <div
                key={word}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary/60"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
                  <BookOpen className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{word}</p>
                  <p className="truncate text-xs text-muted-foreground">{meaning}</p>
                </div>
                <Badge variant="outline">{level}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-panel wave-grid overflow-hidden">
          <CardHeader>
            <CardTitle>Luyện viết cùng Lingora</CardTitle>
            <CardDescription>
              Nhận bản sửa, giải thích lỗi và phiên bản tự nhiên hơn.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border bg-white/80 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <PenLine className="size-4 text-primary" />
                Gợi ý hôm nay
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Write 120 words about how technology has changed the way you
                learn. Include one advantage and one concern.
              </p>
              <Button
                className="mt-4"
                render={<Link href="/learn/writing" />}
              >
                Viết ngay
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
