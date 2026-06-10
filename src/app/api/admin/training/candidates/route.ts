import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  id: z.uuid(),
  status: z.enum(["approved", "rejected", "pending"]),
});

export async function PATCH(request: Request) {
  const viewer = await getOptionalViewer();
  if (viewer?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const input = schema.parse(await request.json());
  const admin = createAdminClient();
  const { error } = await admin
    .from("training_candidates")
    .update({
      review_status: input.status,
      reviewed_by: input.status === "pending" ? null : viewer.id,
      reviewed_at: input.status === "pending" ? null : new Date().toISOString(),
    })
    .eq("id", input.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin.from("admin_audit_logs").insert({
    admin_id: viewer.id,
    action: "training_candidate.review",
    target_type: "training_candidate",
    target_id: input.id,
    metadata: { status: input.status },
  });
  return NextResponse.json({ ok: true });
}
