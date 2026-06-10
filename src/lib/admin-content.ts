import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getAdminContentStudioData() {
  const admin = createAdminClient();
  const [paths, units, questions, challenges] = await Promise.all([
    admin
      .from("learning_paths")
      .select("id,slug,title,target_level,is_published,estimated_hours")
      .order("created_at", { ascending: false }),
    admin
      .from("learning_units")
      .select("id,path_id,position,title,skill,level,estimated_minutes")
      .order("position"),
    admin
      .from("practice_questions")
      .select("id,unit_id,skill,question_type,prompt,difficulty,is_public,created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("learning_challenges")
      .select("id,slug,title,challenge_type,difficulty,target_value,points_reward,token_reward,badge_icon,level_required,is_published,starts_at,ends_at")
      .order("created_at", { ascending: false }),
  ]);
  const error = paths.error ?? units.error ?? questions.error ?? challenges.error;
  if (error) throw new Error(error.message);
  return {
    paths: paths.data ?? [],
    units: units.data ?? [],
    questions: questions.data ?? [],
    challenges: challenges.data ?? [],
  };
}
