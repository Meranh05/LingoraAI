"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock3, Lock, Play, Target, Waypoints } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHero } from "@/components/page-hero";
import { useExperience } from "@/components/experience-provider";
import { useLocale } from "@/components/locale-provider";

type RoadmapData = {
  id: string;
  title: string;
  description: string;
  targetLevel: string;
  estimatedHours: number;
  progress: number;
  enrolled: boolean;
  currentUnitId: string | null;
  units: Array<{
    id: string;
    position: number;
    title: string;
    description: string;
    skill: string;
    level: string;
    estimatedMinutes: number;
    mastery: number;
    bestScore: number;
    attempts: number;
    passedQuestions: number;
    totalQuestions: number;
    completed: boolean;
    unlockMastery: number;
    mascot: string;
  }>;
};

export function Roadmap({ data }: { data: RoadmapData | null }) {
  const router = useRouter();
  const { play } = useExperience();
  const { t } = useLocale();
  if (!data) {
    return <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">{t("roadmap.noPath")}</div>;
  }
  const roadmap = data;

  async function enroll() {
    const response = await fetch("/api/roadmap/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathId: roadmap.id }),
    });
    if (!response.ok) return toast.error(t("roadmap.enrollFailed"));
    play("complete");
    toast.success(t("roadmap.enrolled"));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        icon={Waypoints}
        title={roadmap.title}
        description={roadmap.description}
        eyebrow={`${roadmap.targetLevel} · ${t("roadmap.hours", { count: roadmap.estimatedHours })}`}
        tone="cyan"
        aside={
          <div className="min-w-64 rounded-2xl bg-white/15 p-4 backdrop-blur">
            <div className="mb-2 flex justify-between text-sm">
              <span>{t("roadmap.savedProgress")}</span><strong>{roadmap.progress}%</strong>
            </div>
            <Progress value={roadmap.progress} />
            {!roadmap.enrolled ? (
              <Button className="mt-4 w-full bg-white text-sky-800" onClick={enroll}>
                <Waypoints /> {t("roadmap.enroll")}
              </Button>
            ) : null}
          </div>
        }
      />
      <div className="flex flex-col gap-4">
        {roadmap.units.map((unit, index) => {
          const done = unit.completed;
          const current = roadmap.currentUnitId === unit.id || (!roadmap.currentUnitId && index === 0);
          const previousCompleted = index === 0 || roadmap.units[index - 1]?.completed;
          const locked = !roadmap.enrolled || (!done && !current && !previousCompleted);
          return (
            <Card key={unit.id} className="glass-panel interactive-lift">
              <CardContent className="flex items-center gap-4 p-5">
                <span className={`flex size-12 items-center justify-center rounded-2xl ${done ? "bg-emerald-100 text-emerald-700" : current ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>{done ? <Check /> : locked ? <Lock /> : <Play />}</span>
                <div className="flex-1">
                  <p className="font-semibold">{unit.position}. {unit.title}</p>
                  <p className="text-sm text-muted-foreground">{unit.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline">{unit.level}</Badge><Badge variant="secondary">{unit.skill}</Badge><span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3" />{t("roadmap.minutes", { count: unit.estimatedMinutes })}</span>{current ? <Badge><Target /> {t("roadmap.current")}</Badge> : null}</div>
                  <div className="mt-3 flex items-center gap-3">
                    <Progress value={unit.mastery} className="max-w-64" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("roadmap.questionProgress", { passed: unit.passedQuestions, total: unit.totalQuestions, mastery: Math.round(unit.mastery), required: unit.unlockMastery })}
                    </span>
                  </div>
                </div>
                {!locked ? <Button nativeButton={false} render={<Link href={`/learn/${unit.id}`} />}>{t("roadmap.learn")}</Button> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
