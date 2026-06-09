import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

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
    return NextResponse.json(
      {
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
