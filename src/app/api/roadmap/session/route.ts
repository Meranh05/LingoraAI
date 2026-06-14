import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    unitId: z.uuid(),
  }),
  z.object({
    action: z.literal("finalize"),
    sessionId: z.uuid(),
  }),
]);

export async function POST(request: Request) {
  const viewer = await getOptionalViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = requestSchema.parse(await request.json());
  const admin = createAdminClient();

  if (input.action === "start") {
    const { data, error } = await admin.rpc("start_learning_unit_session", {
      target_user_id: viewer.id,
      target_unit_id: input.unitId,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { sessionId: data },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const { data: result, error } = await admin.rpc(
    "finalize_learning_unit_session",
    {
      target_user_id: viewer.id,
      target_session_id: input.sessionId,
    },
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  let nextUnit: { id: string; title: Record<string, string> } | null = null;
  const nextUnitId = (result as { nextUnitId?: string | null } | null)
    ?.nextUnitId;
  if (nextUnitId) {
    const { data } = await admin
      .from("learning_units")
      .select("id,title")
      .eq("id", nextUnitId)
      .maybeSingle();
    nextUnit = data as typeof nextUnit;
  }

  return NextResponse.json(
    { result, nextUnit },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
