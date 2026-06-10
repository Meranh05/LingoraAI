import "server-only";
import type { Viewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Localized = Record<string, string>;

function text(value: Localized, locale: string) {
  return value?.[locale] ?? value?.vi ?? value?.en ?? "";
}

export async function getCompetitionData(viewer: Viewer) {
  const supabase = await createClient();
  const [{ data: profile }, { data: entries, error: entriesError }, { data: challenges, error: challengesError }, { data: participants, error: participantsError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("leaderboard_opt_in")
        .eq("id", viewer.id)
        .single(),
      supabase
        .from("leaderboard_entries")
        .select("user_id,display_name,weekly_points,total_points,updated_at")
        .order("weekly_points", { ascending: false })
        .order("total_points", { ascending: false })
        .limit(100),
      supabase
        .from("learning_challenges")
        .select("id,title,description,target_value,points_reward,ends_at")
        .eq("is_published", true)
        .lte("starts_at", new Date().toISOString())
        .gte("ends_at", new Date().toISOString())
        .order("ends_at"),
      supabase
        .from("challenge_participants")
        .select("challenge_id,progress,completed_at")
        .eq("user_id", viewer.id),
    ]);
  const error = entriesError ?? challengesError ?? participantsError;
  if (error) throw new Error(error.message);
  const participation = new Map(
    (participants ?? []).map((item) => [item.challenge_id, item]),
  );
  return {
    optedIn: Boolean(profile?.leaderboard_opt_in),
    entries: (entries ?? []).map((entry, index) => ({
      ...entry,
      rank: index + 1,
      isViewer: entry.user_id === viewer.id,
    })),
    challenges: (challenges ?? []).map((challenge) => {
      const joined = participation.get(challenge.id);
      return {
        id: challenge.id,
        title: text(challenge.title as Localized, viewer.locale),
        description: text(challenge.description as Localized, viewer.locale),
        target: challenge.target_value,
        reward: challenge.points_reward,
        endsAt: challenge.ends_at,
        progress: joined?.progress ?? 0,
        completed: Boolean(joined?.completed_at),
        joined: Boolean(joined),
      };
    }),
  };
}
