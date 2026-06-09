import { NextResponse } from "next/server";
import { z } from "zod";
import { providerIds } from "@/lib/ai-providers";
import { runChat } from "@/lib/ai-gateway";

const requestSchema = z.object({
  provider: z.enum(providerIds).default("auto"),
  apiKey: z.string().max(500).optional(),
  model: z.string().max(200).optional(),
  baseUrl: z.string().url().max(500).optional().or(z.literal("")),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().min(1).max(30_000),
      }),
    )
    .min(1)
    .max(30),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const result = await runChat(body);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? "Dữ liệu gửi lên không hợp lệ."
        : error instanceof Error
          ? error.message
          : "Không thể xử lý yêu cầu AI.";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
