"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Medal, ShieldCheck, Trophy, Users } from "lucide-react";
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

type CompetitionData = {
  optedIn: boolean;
  entries: Array<{
    user_id: string;
    display_name: string;
    weekly_points: number;
    total_points: number;
    rank: number;
    isViewer: boolean;
  }>;
  challenges: Array<{
    id: string;
    title: string;
    description: string;
    target: number;
    reward: number;
    endsAt: string;
    progress: number;
    completed: boolean;
    joined: boolean;
  }>;
};

export function CompetitionCenter({ data }: { data: CompetitionData }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [loading, setLoading] = useState<string>();
  const { play } = useExperience();

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
          <div className="grid gap-4 lg:grid-cols-2">
            {data.challenges.map((challenge) => (
              <Card key={challenge.id} className="glass-panel interactive-lift">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{challenge.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {challenge.description}
                      </CardDescription>
                    </div>
                    <Badge variant={challenge.completed ? "secondary" : "outline"}>
                      +{challenge.reward} {t("competition.points")}
                    </Badge>
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
                  <Button
                    variant={challenge.joined ? "outline" : "default"}
                    disabled={challenge.completed || loading === challenge.id}
                    onClick={() =>
                      action(
                        challenge.joined
                          ? "leave_challenge"
                          : "join_challenge",
                        challenge.id,
                      )
                    }
                  >
                    <ShieldCheck />
                    {challenge.completed
                      ? t("competition.completed")
                      : challenge.joined
                        ? t("competition.leaveChallenge")
                        : t("competition.join")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
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
