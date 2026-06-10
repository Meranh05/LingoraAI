"use client";

import Link from "next/link";
import { BookOpen, Headphones, Mic2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLocale } from "@/components/locale-provider";
import { navigationLabels } from "@/lib/i18n";

export function PracticeCenter({
  progress,
}: {
  progress: Array<{ skill: string; level: string; mastery: number; total_attempts: number }>;
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
    </div>
  );
}
