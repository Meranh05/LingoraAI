import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const viewer = await getOptionalViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { pathId } = z.object({ pathId: z.uuid() }).parse(await request.json());
  const supabase = await createClient();
  const { data: firstUnit } = await supabase
    .from("learning_units")
    .select("id")
    .eq("path_id", pathId)
    .order("position")
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("user_path_enrollments")
    .upsert(
      {
        user_id: viewer.id,
        path_id: pathId,
        status: "active",
        current_unit_id: firstUnit?.id ?? null,
      },
      { onConflict: "user_id,path_id" },
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ enrollment: data });
}
