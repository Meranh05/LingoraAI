import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminOverview } from "@/lib/admin-data";

async function authorize() {
  const viewer = await getOptionalViewer();
  return viewer?.role === "admin" ? viewer : null;
}

export async function GET() {
  if (!(await authorize())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(await getAdminOverview());
}

const updateSchema = z.object({
  userId: z.uuid(),
  role: z.enum(["user", "admin"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

export async function PATCH(request: Request) {
  const viewer = await authorize();
  if (!viewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const input = updateSchema.parse(await request.json());
  if (input.userId === viewer.id && (input.role === "user" || input.status === "suspended")) {
    return NextResponse.json(
      { error: "Admin không thể tự hạ quyền hoặc khóa chính mình." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const changes = {
    ...(input.role ? { role: input.role } : {}),
    ...(input.status ? { status: input.status } : {}),
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin
    .from("profiles")
    .update(changes)
    .eq("id", input.userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from("admin_audit_logs").insert({
    admin_id: viewer.id,
    action: "user.update",
    target_type: "user",
    target_id: input.userId,
    metadata: changes,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const viewer = await authorize();
  if (!viewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = z
    .object({ userId: z.uuid() })
    .parse(await request.json());
  if (userId === viewer.id) {
    return NextResponse.json(
      { error: "Admin không thể tự xóa tài khoản đang dùng." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin.from("admin_audit_logs").insert({
    admin_id: viewer.id,
    action: "user.delete",
    target_type: "user",
    target_id: userId,
  });
  return NextResponse.json({ ok: true });
}
