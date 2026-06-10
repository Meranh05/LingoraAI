import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalViewer } from "@/lib/auth";
import { spendTokens } from "@/lib/economy";

export async function POST(request: Request) {
  const viewer = await getOptionalViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { catalogCode } = z
      .object({ catalogCode: z.string().min(1).max(100) })
      .parse(await request.json());
    const unlock = await spendTokens(viewer.id, catalogCode);
    return NextResponse.json({ unlock });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể mở khóa.";
    return NextResponse.json(
      {
        error: message.includes("Insufficient tokens")
          ? "Bạn không đủ Lingora Tokens."
          : message,
      },
      { status: message.includes("Insufficient tokens") ? 409 : 400 },
    );
  }
}
