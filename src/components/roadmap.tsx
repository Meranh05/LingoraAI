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
  }>;
};

export function Roadmap({ data }: { data: RoadmapData | null }) {
  const router = useRouter();
  const { play } = useExperience();
  if (!data) {
    return <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Chưa có lộ trình nào được xuất bản.</div>;
  }
  const roadmap = data;

  async function enroll() {
    const response = await fetch("/api/roadmap/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathId: roadmap.id }),
    });
    if (!response.ok) return toast.error("Không thể đăng ký lộ trình.");
    play("complete");
    toast.success("Đã đăng ký lộ trình.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        icon={Waypoints}
        title={roadmap.title}
        description={roadmap.description}
        eyebrow={`${roadmap.targetLevel} · ${roadmap.estimatedHours} giờ`}
        tone="cyan"
        aside={
          <div className="min-w-64 rounded-2xl bg-white/15 p-4 backdrop-blur">
            <div className="mb-2 flex justify-between text-sm">
              <span>Tiến độ đã lưu</span><strong>{roadmap.progress}%</strong>
            </div>
            <Progress value={roadmap.progress} />
            {!roadmap.enrolled ? (
              <Button className="mt-4 w-full bg-white text-sky-800" onClick={enroll}>
                <Waypoints /> Đăng ký lộ trình
              </Button>
            ) : null}
          </div>
        }
      />
      <div className="flex flex-col gap-4">
        {roadmap.units.map((unit, index) => {
          const doneThreshold = roadmap.units.length ? (index / roadmap.units.length) * 100 : 0;
          const done = roadmap.progress > doneThreshold;
          const current = roadmap.currentUnitId === unit.id || (!roadmap.currentUnitId && index === 0);
          const locked = !roadmap.enrolled || (!done && !current);
          return (
            <Card key={unit.id} className="glass-panel interactive-lift">
              <CardContent className="flex items-center gap-4 p-5">
                <span className={`flex size-12 items-center justify-center rounded-2xl ${done ? "bg-emerald-100 text-emerald-700" : current ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>{done ? <Check /> : locked ? <Lock /> : <Play />}</span>
                <div className="flex-1"><p className="font-semibold">{unit.position}. {unit.title}</p><p className="text-sm text-muted-foreground">{unit.description}</p><div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline">{unit.level}</Badge><Badge variant="secondary">{unit.skill}</Badge><span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3" />{unit.estimatedMinutes} phút</span>{current ? <Badge><Target /> Đang học</Badge> : null}</div></div>
                {!locked ? <Button nativeButton={false} render={<Link href={`/${unit.skill}`} />}>Học</Button> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
