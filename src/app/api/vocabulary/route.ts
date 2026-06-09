import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({
  word: z.string().trim().min(1).max(120),
  phonetic: z.string().trim().max(120).optional(),
  meaningVi: z.string().trim().min(1).max(500),
  exampleEn: z.string().trim().max(1000).optional(),
  exampleVi: z.string().trim().max(1000).optional(),
  level: z.string().trim().max(20).optional(),
});

export async function POST(request: Request) {
  const viewer = await getOptionalViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = createSchema.parse(await request.json());
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vocabulary")
    .upsert(
      {
        user_id: viewer.id,
        word: input.word,
        phonetic: input.phonetic || null,
        meaning_vi: input.meaningVi,
        example_en: input.exampleEn || null,
        example_vi: input.exampleVi || null,
        level: input.level || null,
        next_review_at: new Date().toISOString(),
      },
      { onConflict: "user_id,word" },
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ item: data });
}

const patchSchema = z.object({
  id: z.uuid(),
  quality: z.enum(["again", "hard", "good", "easy"]),
});

export async function PATCH(request: Request) {
  const viewer = await getOptionalViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const input = patchSchema.parse(await request.json());
  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("vocabulary")
    .select("review_interval_days,review_count")
    .eq("id", input.id)
    .eq("user_id", viewer.id)
    .single();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 404 });

  const previous = current.review_interval_days;
  const intervals = {
    again: 0,
    hard: Math.max(1, Math.round(previous * 1.2) || 1),
    good: Math.max(1, Math.round(previous * 2.2) || 1),
    easy: Math.max(3, Math.round(previous * 3.5) || 3),
  };
  const interval = intervals[input.quality];
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);
  const { data, error } = await supabase
    .from("vocabulary")
    .update({
      review_interval_days: interval,
      review_count: current.review_count + 1,
      last_reviewed_at: new Date().toISOString(),
      next_review_at: nextReview.toISOString(),
    })
    .eq("id", input.id)
    .eq("user_id", viewer.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ item: data });
}

export async function DELETE(request: Request) {
  const viewer = await getOptionalViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = z.object({ id: z.uuid() }).parse(await request.json());
  const supabase = await createClient();
  const { error } = await supabase
    .from("vocabulary")
    .delete()
    .eq("id", id)
    .eq("user_id", viewer.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
