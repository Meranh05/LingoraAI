"use client";

import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  FileText,
  GraduationCap,
  Languages,
  Mic2,
  PenLine,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

export type FeatureDefinition = {
  title: string;
  description: string;
  action: string;
  placeholder: string;
  icon: LucideIcon;
  accent: string;
  sampleTitle: string;
  sampleBody: string;
};

export const featureDefinitions: Record<string, FeatureDefinition> = {
  documents: {
    title: "Tài liệu",
    description: "Đọc PDF, DOCX, TXT và hỏi đáp theo đúng nội dung.",
    action: "Tải tài liệu",
    placeholder: "Kéo thả file vào đây hoặc chọn từ máy tính",
    icon: FileText,
    accent: "bg-sky-100 text-sky-700",
    sampleTitle: "Technology in Education.pdf",
    sampleBody: "Đã trích xuất 18 trang · 24 đoạn nội dung · sẵn sàng hỏi đáp",
  },
  vocabulary: {
    title: "Từ vựng",
    description: "Lưu từ, nghĩa sát ngữ cảnh, IPA và ví dụ song ngữ.",
    action: "Thêm từ mới",
    placeholder: "Nhập một từ hoặc cụm từ tiếng Anh...",
    icon: BookOpen,
    accent: "bg-cyan-100 text-cyan-700",
    sampleTitle: "contextual /kənˈteks.tʃu.əl/",
    sampleBody: "theo ngữ cảnh · Contextual clues help readers infer meaning.",
  },
  flashcards: {
    title: "Flashcards",
    description: "Ôn từ bằng thẻ lật và lặp lại ngắt quãng.",
    action: "Bắt đầu ôn",
    placeholder: "Chọn bộ từ vựng",
    icon: BrainCircuit,
    accent: "bg-indigo-100 text-indigo-700",
    sampleTitle: "coherence",
    sampleBody: "Nhấn vào thẻ để xem nghĩa và ví dụ.",
  },
  reading: {
    title: "Đọc hiểu",
    description: "Tạo câu hỏi, giải thích đáp án và phân tích từ khó.",
    action: "Tạo bài đọc",
    placeholder: "Dán đoạn văn hoặc chọn tài liệu...",
    icon: GraduationCap,
    accent: "bg-blue-100 text-blue-700",
    sampleTitle: "The future of remote learning",
    sampleBody: "Bài đọc B1 · 420 từ · 6 câu hỏi",
  },
  speaking: {
    title: "Luyện nói",
    description: "Thu âm, chuyển giọng nói thành chữ và nhận góp ý.",
    action: "Bắt đầu thu âm",
    placeholder: "Chọn câu mẫu hoặc nhập câu muốn luyện...",
    icon: Mic2,
    accent: "bg-violet-100 text-violet-700",
    sampleTitle: "I would like to improve my pronunciation.",
    sampleBody: "Độ rõ 84% · Nhấn trọng âm tốt ở “pronunciation”.",
  },
  writing: {
    title: "Sửa bài viết",
    description: "Sửa grammar, vocabulary, coherence và giải thích bằng tiếng Việt.",
    action: "Chấm bài",
    placeholder: "Nhập đoạn văn tiếng Anh của bạn...",
    icon: PenLine,
    accent: "bg-emerald-100 text-emerald-700",
    sampleTitle: "Điểm gợi ý: 7.5 / 10",
    sampleBody: "Ý rõ ràng. Cần thống nhất thì và dùng từ nối tự nhiên hơn.",
  },
  translation: {
    title: "Dịch thuật",
    description: "Dịch Anh ↔ Việt tự nhiên, kèm giải thích cụm từ.",
    action: "Dịch ngay",
    placeholder: "Nhập nội dung cần dịch...",
    icon: Languages,
    accent: "bg-teal-100 text-teal-700",
    sampleTitle: "It slipped my mind.",
    sampleBody: "Tôi quên mất. · Cụm dùng khi vô tình quên điều gì.",
  },
  quiz: {
    title: "Bài kiểm tra",
    description: "Quiz thích ứng theo từ vựng và kỹ năng đang học.",
    action: "Tạo bài kiểm tra",
    placeholder: "Chọn chủ đề, trình độ hoặc tài liệu...",
    icon: CheckCircle2,
    accent: "bg-amber-100 text-amber-700",
    sampleTitle: "Mixed Skills · B1",
    sampleBody: "15 câu · khoảng 12 phút · điểm gần nhất 82%",
  },
  progress: {
    title: "Tiến độ",
    description: "Theo dõi thời gian học, điểm số và kỹ năng cần cải thiện.",
    action: "Xem báo cáo tuần",
    placeholder: "Chọn khoảng thời gian",
    icon: BarChart3,
    accent: "bg-rose-100 text-rose-700",
    sampleTitle: "Mục tiêu tuần: 5 giờ",
    sampleBody: "Đã hoàn thành 4 giờ 12 phút · còn 48 phút",
  },
};

export function FeatureWorkspace({ feature }: { feature: FeatureDefinition }) {
  const [value, setValue] = useState("");
  const [progress, setProgress] = useState(68);
  const Icon = feature.icon;

  function runAction() {
    setProgress((current) => Math.min(100, current + 7));
    toast.success(`${feature.action}: bản demo tương tác đã được kích hoạt.`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <span className={`flex size-12 items-center justify-center rounded-2xl ${feature.accent}`}>
              <Icon className="size-6" />
            </span>
            <h1 className="text-3xl font-bold tracking-tight">{feature.title}</h1>
          </div>
          <p className="max-w-2xl text-muted-foreground">{feature.description}</p>
        </div>
        <Badge variant="secondary">
          <Sparkles data-icon="inline-start" />
          AI hỗ trợ tiếng Việt
        </Badge>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="glass-panel min-h-[480px]">
          <CardHeader>
            <CardTitle>Không gian làm việc</CardTitle>
            <CardDescription>{feature.placeholder}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {feature.title === "Tài liệu" ? (
              <button
                type="button"
                onClick={runAction}
                className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-primary/40 bg-white/50 p-8 text-center transition-colors hover:bg-secondary/50"
              >
                <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Upload className="size-6" />
                </span>
                <span>
                  <span className="block font-semibold">PDF, DOCX hoặc TXT</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Tối đa 20 MB trong bản khởi tạo
                  </span>
                </span>
              </button>
            ) : feature.title === "Từ vựng" ? (
              <div className="flex gap-3">
                <Input
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder={feature.placeholder}
                  className="bg-white/80"
                />
                <Button onClick={runAction}>
                  <Plus data-icon="inline-start" />
                  Thêm
                </Button>
              </div>
            ) : (
              <Textarea
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={feature.placeholder}
                className="min-h-64 resize-none bg-white/80"
              />
            )}
            <div className="flex flex-wrap gap-3">
              <Button onClick={runAction}>
                <Send data-icon="inline-start" />
                {feature.action}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setValue("");
                  toast.info("Đã làm mới không gian làm việc.");
                }}
              >
                <RotateCcw data-icon="inline-start" />
                Làm mới
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-base">Kết quả gần nhất</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl bg-secondary/65 p-4">
                <p className="font-semibold">{feature.sampleTitle}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {feature.sampleBody}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-base">Tiến độ kỹ năng</CardTitle>
              <CardDescription>Mục tiêu cá nhân trong tuần</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Progress value={progress} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Đang tiến bộ đều</span>
                <span>{progress}%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
