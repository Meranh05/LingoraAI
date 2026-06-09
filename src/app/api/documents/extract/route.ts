import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { getOptionalViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const maxFileSize = 20 * 1024 * 1024;

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(request: Request) {
  try {
    const viewer = await getOptionalViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Chưa có file." }, { status: 400 });
    }
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: "File vượt quá giới hạn 20 MB." },
        { status: 413 },
      );
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (extension === "txt") {
      text = buffer.toString("utf8");
    } else if (extension === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (extension === "pdf") {
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        text = result.text;
      } finally {
        await parser.destroy();
      }
    } else {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ PDF, DOCX và TXT." },
        { status: 415 },
      );
    }

    const normalized = normalizeText(text);
    if (!normalized) {
      return NextResponse.json(
        { error: "Tài liệu không có nội dung văn bản có thể đọc." },
        { status: 422 },
      );
    }
    const supabase = await createClient();
    const documentId = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${viewer.id}/${documentId}/${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) throw uploadError;
    const { data: document, error: insertError } = await supabase
      .from("documents")
      .insert({
        id: documentId,
        user_id: viewer.id,
        file_name: file.name,
        storage_path: storagePath,
        file_type: extension,
        raw_text: normalized,
        status: "ready",
      })
      .select("id,file_name,file_type,status,created_at")
      .single();
    if (insertError) {
      await supabase.storage.from("documents").remove([storagePath]);
      throw insertError;
    }
    return NextResponse.json(
      {
        document,
        fileName: file.name,
        fileType: extension,
        characters: normalized.length,
        text: normalized,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể trích xuất nội dung file.",
      },
      { status: 400 },
    );
  }
}
