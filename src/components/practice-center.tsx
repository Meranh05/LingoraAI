"use client";

import Link from "next/link";
import { BookmarkCheck, BookOpen, Headphones, Mic2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLocale } from "@/components/locale-provider";
import { navigationLabels } from "@/lib/i18n";

export function PracticeCenter({
  progress,
  reviewQueue,
}: {
  progress: Array<{ skill: string; level: string; mastery: number; total_attempts: number }>;
  reviewQueue: Array<{
    question_id: string;
    source_unit_id: string | null;
    reason: string;
    last_score: number;
    practice_questions:
      | {
          prompt: Record<string, string>;
          skill: string;
          difficulty: string;
        }
      | Array<{
          prompt: Record<string, string>;
          skill: string;
          difficulty: string;
        }>
      | null;
  }>;
}) {
  const { locale, t } = useLocale();
  const modules = [
    [navigationLabels[locale].reading, "reading", BookOpen],
    [navigationLabels[locale].listening, "listening", Headphones],
    [navigationLabels[locale].speaking, "speaking", Mic2],
    [navigationLabels[locale].writing, "writing", PenLine],
  ] as const;
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-3xl font-bold tracking-tight">{t("practice.title")}</h1><p className="mt-2 text-muted-foreground">{t("practice.description")}</p></div>
      <div className="grid gap-4 md:grid-cols-2">
        {modules.map(([title, skill, Icon]) => {
          const item = progress.find((row) => row.skill === skill);
          return <Card key={skill} className="glass-panel"><CardHeader><CardTitle className="flex items-center gap-2"><Icon className="text-primary" /> {title}</CardTitle><CardDescription>{item ? `${item.level} · ${t("practice.attempts", { count: item.total_attempts })}` : t("practice.noData")}</CardDescription></CardHeader><CardContent><Progress value={Number(item?.mastery ?? 0)} /><Button nativeButton={false} className="mt-4" render={<Link href={`/${skill}`} />}>{t("common.start")}</Button></CardContent></Card>;
        })}
      </div>
      <Card className="glass-panel overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-orange-50">
          <CardTitle className="flex items-center gap-2">
            <BookmarkCheck className="text-amber-600" /> Câu cần ôn
          </CardTitle>
          <CardDescription>
            Câu trả lời sai hoặc được bạn đánh dấu khó sẽ nằm ở đây cho đến khi
            đạt mức thành thạo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 p-5 md:grid-cols-2">
          {reviewQueue.length ? (
            reviewQueue.map((item) => {
              const relation = Array.isArray(item.practice_questions)
                ? item.practice_questions[0]
                : item.practice_questions;
              const prompt =
                relation?.prompt?.[locale] ??
                relation?.prompt?.en ??
                relation?.prompt?.vi ??
                "Câu hỏi cần ôn lại";
              return (
                <div
                  key={item.question_id}
                  className="rounded-2xl border bg-white/80 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <span>{relation?.skill ?? "practice"} · {relation?.difficulty ?? "A1"}</span>
                    <span>{Math.round(Number(item.last_score))} điểm</span>
                  </div>
                  <p className="mt-2 line-clamp-2 font-bold">{prompt}</p>
                  <Button
                    nativeButton={false}
                    variant="outline"
                    className="mt-4"
                    render={
                      <Link
                        href={
                          item.source_unit_id
                            ? `/learn/${item.source_unit_id}`
                            : `/${relation?.skill ?? "practice"}`
                        }
                      />
                    }
                  >
                    Ôn lại câu này
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Chưa có câu khó. Các câu bạn đánh dấu sẽ xuất hiện tại đây.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
