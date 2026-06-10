"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Coins, LockKeyhole, Medal, ShieldCheck, Sparkles, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/components/locale-provider";
import { PageHero } from "@/components/page-hero";
import { useExperience } from "@/components/experience-provider";
import { MascotSprite } from "@/components/lingora-mascot";
import type { MascotMood } from "@/lib/gamification";
import { cn } from "@/lib/utils";

type CompetitionData = {
  optedIn: boolean;
  entries: Array<{
    user_id: string;
    display_name: string;
    weekly_points: number;
    total_points: number;
    rank: number;
    isViewer: boolean;
    league: string;
  }>;
  challenges: Array<{
    id: string;
    title: string;
    description: string;
    target: number;
    reward: number;
    tokenReward: number;
    endsAt: string;
    type: string;
    difficulty: string;
    badgeIcon: string;
    levelRequired: number;
    minScore: number;
    questionCount: number;
    locked: boolean;
    mascot: string;
    progress: number;
    completed: boolean;
    joined: boolean;
  }>;
  seasonCode: string;
  viewerRank: number | null;
};

export function CompetitionCenter({ data }: { data: CompetitionData }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [loading, setLoading] = useState<string>();
  const [challengeFilter, setChallengeFilter] = useState("daily");
  const { play } = useExperience();
  const visibleChallenges = data.challenges.filter(
    (challenge) => challengeFilter === "all" || challenge.type === challengeFilter,
  );

  async function action(
    name:
      | "join_leaderboard"
      | "leave_leaderboard"
      | "join_challenge"
      | "leave_challenge",
    challengeId?: string,
  ) {
    setLoading(challengeId ?? name);
    const response = await fetch("/api/competition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: name, challengeId }),
    });
    const payload = (await response.json()) as { error?: string };
    setLoading(undefined);
    if (!response.ok) {
      toast.error(payload.error ?? t("competition.updateFailed"));
      play("error");
      return;
    }
    toast.success(t("competition.updated"));
    play(name.includes("join") ? "complete" : "tap");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        icon={Trophy}
        title={t("competition.title")}
        description={t("competition.description")}
        eyebrow="Lingora League"
        tone="indigo"
        aside={
          <Button
            className="bg-white text-indigo-800 hover:bg-indigo-50"
            onClick={() =>
              action(data.optedIn ? "leave_leaderboard" : "join_leaderboard")
            }
            disabled={Boolean(loading)}
          >
            <Users />
            {data.optedIn ? t("competition.leaveBoard") : t("competition.joinBoard")}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Mùa giải" value={data.seasonCode || "Hiện tại"} />
        <Stat label="Thứ hạng của bạn" value={data.viewerRank ? `#${data.viewerRank}` : "Chưa xếp hạng"} />
        <Stat label="Cơ chế điểm" value="Đúng + nhanh + combo" />
      </div>

      <Tabs defaultValue="leaderboard">
        <TabsList>
          <TabsTrigger value="leaderboard">{t("competition.leaderboard")}</TabsTrigger>
          <TabsTrigger value="challenges">{t("competition.challenges")}</TabsTrigger>
        </TabsList>
        <TabsContent value="leaderboard" className="pt-4">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="text-amber-500" /> {t("competition.top")}
              </CardTitle>
              <CardDescription>
                {t("competition.optInOnly")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.entries.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("competition.rank")}</TableHead>
                      <TableHead>{t("competition.learner")}</TableHead>
                      <TableHead>{t("competition.weekPoints")}</TableHead>
                      <TableHead>{t("competition.totalPoints")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.entries.map((entry) => (
                      <TableRow
                        key={entry.user_id}
                        className={entry.isViewer ? "bg-primary/5" : ""}
                      >
                        <TableCell className="font-bold">
                          #{entry.rank}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{entry.display_name}</span>
                          {entry.isViewer ? <Badge className="ml-2">{t("competition.you")}</Badge> : null}
                          <Badge variant="outline" className="ml-2">{entry.league}</Badge>
                        </TableCell>
                        <TableCell>{entry.weekly_points.toLocaleString()}</TableCell>
                        <TableCell>{entry.total_points.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Empty text={t("competition.noEntries")} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="challenges" className="pt-4">
          <div className="mb-4 flex flex-wrap gap-2">
            {["daily", "weekly", "boss", "community", "all"].map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={challengeFilter === filter ? "default" : "outline"}
                onClick={() => setChallengeFilter(filter)}
              >
                {filter === "all" ? "Tất cả" : filter}
                <Badge variant="secondary">
                  {filter === "all"
                    ? data.challenges.length
                    : data.challenges.filter((challenge) => challenge.type === filter).length}
                </Badge>
              </Button>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {visibleChallenges.map((challenge) => (
              <Card
                key={challenge.id}
                className={cn(
                  "interactive-lift overflow-hidden border-0",
                  challenge.type === "boss"
                    ? "bg-slate-950 text-white"
                    : challenge.type === "daily"
                      ? "bg-gradient-to-br from-cyan-50 to-white"
                      : "glass-panel",
                )}
              >
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge variant={challenge.type === "boss" ? "secondary" : "outline"}>{challenge.type}</Badge>
                      <Badge variant="outline">{challenge.difficulty}</Badge>
                    </div>
                    <MascotSprite mood={challenge.mascot as MascotMood} className="size-16" />
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{challenge.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {challenge.description}
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1 text-right text-xs font-bold">
                      <span className="text-amber-500">+{challenge.reward} XP</span>
                      <span className="flex items-center justify-end gap-1 text-cyan-600"><Coins className="size-3" />+{challenge.tokenReward}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <Progress
                    value={Math.min(100, (challenge.progress / challenge.target) * 100)}
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span>{challenge.progress} / {challenge.target}</span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <CalendarClock className="size-4" />
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "short",
                      }).format(new Date(challenge.endsAt))}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {challenge.questionCount} câu trong pool · yêu cầu {challenge.minScore}+ điểm
                  </p>
                  {challenge.joined && !challenge.completed ? (
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <Button nativeButton={false} render={<Link href={`/competition/${challenge.id}`} />}>
                        <Sparkles /> Vào thi đấu
                      </Button>
                      <Button variant="outline" onClick={() => action("leave_challenge", challenge.id)} disabled={loading === challenge.id}>
                        Rời
                      </Button>
                    </div>
                  ) : (
                    <Button
                      disabled={challenge.locked || challenge.completed || loading === challenge.id}
                      onClick={() => action("join_challenge", challenge.id)}
                    >
                      {challenge.locked ? <LockKeyhole /> : <ShieldCheck />}
                      {challenge.locked
                        ? `Mở ở Level ${challenge.levelRequired}`
                        : challenge.completed
                          ? t("competition.completed")
                          : t("competition.join")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
