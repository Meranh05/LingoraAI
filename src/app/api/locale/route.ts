import { NextResponse } from "next/server";
import { z } from "zod";

export async function POST(request: Request) {
  const { locale } = z
    .object({ locale: z.enum(["vi", "en", "ja", "th"]) })
    .parse(await request.json());
  const response = NextResponse.json({ ok: true });
  response.cookies.set("lingora_locale", locale, {
    path: "/",
    maxAge: 31_536_000,
    sameSite: "lax",
    httpOnly: false,
  });
  return response;
}
