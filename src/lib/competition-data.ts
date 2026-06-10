import "server-only";
import type { Viewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLevelState } from "@/lib/gamification";

type Localized = Record<string, string>;

function text(value: Localized, locale: string) {
  return value?.[locale] ?? value?.vi ?? value?.en ?? "";
}

export async function getCompetitionData(viewer: Viewer) {
  const supabase = await createClient();
  const [{ data: profile }, { data: wallet }, { data: entries, error: entriesError }, { data: challenges, error: challengesError }, { data: participants, error: participantsError }, { data: pool, error: poolError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("leaderboard_opt_in")
        .eq("id", viewer.id)
        .single(),
      supabase.from("user_wallets").select("xp").eq("user_id", viewer.id).maybeSingle(),
      supabase
        .from("leaderboard_entries")
        .select("user_id,display_name,weekly_points,total_points,updated_at")
        .order("weekly_points", { ascending: false })
        .order("total_points", { ascending: false })
        .limit(100),
      supabase
        .from("learning_challenges")
        .select("id,title,description,target_value,points_reward,token_reward,ends_at,challenge_type,difficulty,badge_icon,level_required,min_score,season_code,metadata")
        .eq("is_published", true)
        .lte("starts_at", new Date().toISOString())
        .gte("ends_at", new Date().toISOString())
        .order("ends_at"),
      supabase
        .from("challenge_participants")
        .select("challenge_id,progress,completed_at")
        .eq("user_id", viewer.id),
      supabase.from("challenge_question_pool").select("challenge_id,question_id"),
    ]);
  const error = entriesError ?? challengesError ?? participantsError ?? poolError;
  if (error) throw new Error(error.message);
  const participation = new Map(
    (participants ?? []).map((item) => [item.challenge_id, item]),
  );
  const learnerLevel = getLevelState(Number(wallet?.xp ?? 0)).level;
  const questionCounts = new Map<string, number>();
  (pool ?? []).forEach((item) => {
    questionCounts.set(item.challenge_id, (questionCounts.get(item.challenge_id) ?? 0) + 1);
  });
  const rankedEntries = (entries ?? []).map((entry, index) => ({
    ...entry,
    rank: index + 1,
    isViewer: entry.user_id === viewer.id,
    league:
      entry.weekly_points >= 1500
        ? "Diamond"
        : entry.weekly_points >= 800
          ? "Gold"
          : entry.weekly_points >= 300
            ? "Silver"
            : "Bronze",
  }));
  return {
    optedIn: Boolean(profile?.leaderboard_opt_in),
    seasonCode: challenges?.[0]?.season_code ?? "",
    viewerRank: rankedEntries.find((entry) => entry.isViewer)?.rank ?? null,
    entries: rankedEntries,
    challenges: (challenges ?? []).map((challenge) => {
      const joined = participation.get(challenge.id);
      return {
        id: challenge.id,
        title: text(challenge.title as Localized, viewer.locale),
        description: text(challenge.description as Localized, viewer.locale),
        target: challenge.target_value,
        reward: challenge.points_reward,
        tokenReward: challenge.token_reward,
        endsAt: challenge.ends_at,
        type: challenge.challenge_type,
        difficulty: challenge.difficulty,
        badgeIcon: challenge.badge_icon,
        levelRequired: challenge.level_required,
        minScore: challenge.min_score,
        questionCount: questionCounts.get(challenge.id) ?? 0,
        locked: learnerLevel < challenge.level_required,
        mascot: String((challenge.metadata as { mascot?: string } | null)?.mascot ?? "champion"),
        progress: joined?.progress ?? 0,
        completed: Boolean(joined?.completed_at),
        joined: Boolean(joined),
      };
    }),
  };
}
