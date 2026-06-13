import { NextResponse } from "next/server";
import { getOptionalViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

function hasValidImageSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (type === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }
  const header = new TextDecoder().decode(bytes.slice(0, 12));
  if (type === "image/gif") return header.startsWith("GIF8");
  if (type === "image/webp") {
    return header.startsWith("RIFF") && header.slice(8, 12) === "WEBP";
  }
  return false;
}

export async function POST(request: Request) {
  const viewer = await getOptionalViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Vui lòng chọn một ảnh." }, { status: 400 });
  }
  const extension = allowedTypes.get(file.type);
  if (!extension) {
    return NextResponse.json(
      { error: "Chỉ hỗ trợ JPG, PNG, WebP hoặc GIF." },
      { status: 400 },
    );
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Ảnh đại diện không được vượt quá 5 MB." },
      { status: 400 },
    );
  }
  const fileBuffer = await file.arrayBuffer();
  if (!hasValidImageSignature(file.type, new Uint8Array(fileBuffer))) {
    return NextResponse.json(
      { error: "Nội dung file không phải ảnh hợp lệ." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const path = `${viewer.id}/avatar.${extension}`;
  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(path, fileBuffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: true,
    });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data } = admin.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
  const { error: profileError } = await admin
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", viewer.id);
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ avatarUrl });
}
