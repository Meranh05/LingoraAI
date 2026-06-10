import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("join_leaderboard") }),
  z.object({ action: z.literal("leave_leaderboard") }),
  z.object({ action: z.literal("join_challenge"), challengeId: z.uuid() }),
  z.object({ action: z.literal("leave_challenge"), challengeId: z.uuid() }),
]);

export async function POST(request: Request) {
  const viewer = await getOptionalViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = schema.parse(await request.json());
  const supabase = await createClient();

  if (input.action === "join_challenge") {
    const { error } = await supabase.from("challenge_participants").insert({
      challenge_id: input.challengeId,
      user_id: viewer.id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (input.action === "leave_challenge") {
    const { error } = await supabase
      .from("challenge_participants")
      .delete()
      .eq("challenge_id", input.challengeId)
      .eq("user_id", viewer.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  if (input.action === "leave_leaderboard") {
    await admin.from("leaderboard_entries").delete().eq("user_id", viewer.id);
    await admin
      .from("profiles")
      .update({ leaderboard_opt_in: false })
      .eq("id", viewer.id);
    return NextResponse.json({ ok: true });
  }

  const { data: events } = await admin
    .from("learning_events")
    .select("duration_seconds,score,created_at")
    .eq("user_id", viewer.id);
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const points = (events ?? []).map((event) => ({
    value: Math.max(
      1,
      Math.floor((event.duration_seconds ?? 0) / 60) +
        Math.round(Number(event.score ?? 0) / 10),
    ),
    createdAt: new Date(event.created_at),
  }));
  const { error } = await admin.from("leaderboard_entries").upsert({
    user_id: viewer.id,
    display_name: viewer.fullName,
    weekly_points: points
      .filter((item) => item.createdAt >= weekStart)
      .reduce((sum, item) => sum + item.value, 0),
    total_points: points.reduce((sum, item) => sum + item.value, 0),
    week_start: weekStart.toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin
    .from("profiles")
    .update({ leaderboard_opt_in: true })
    .eq("id", viewer.id);
  return NextResponse.json({ ok: true });
}
