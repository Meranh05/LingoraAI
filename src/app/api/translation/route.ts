import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalViewer } from "@/lib/auth";
import { consumeAiQuota } from "@/lib/billing";
import { hasFeatureAccess } from "@/lib/economy";
import {
  MachineTranslationError,
  translateWithMachineProvider,
} from "@/lib/machine-translation";
import {
  isTranslationLanguage,
  translationLanguages,
} from "@/lib/translation-languages";
import { createClient } from "@/lib/supabase/server";

const languageCodes = translationLanguages.map((language) => language.code) as [
  string,
  ...string[],
];

const schema = z.object({
  text: z.string().trim().min(1).max(10_000),
  source: z.enum(languageCodes).nullable().optional(),
  target: z.enum(languageCodes),
});

const providerLabels = {
  azure: "Azure AI Translator",
  google: "Google Cloud Translation",
  libretranslate: "LibreTranslate",
} as const;

export async function POST(request: Request) {
  try {
    const viewer = await getOptionalViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await hasFeatureAccess(viewer.id, "translation", "basic"))) {
      return NextResponse.json(
        {
          error: "Dịch thuật yêu cầu gói Basic, Plus hoặc Pro.",
          code: "PLAN_UPGRADE_REQUIRED",
          requiredPlan: "basic",
        },
        { status: 403 },
      );
    }

    const input = schema.parse(await request.json());
    if (input.source && input.source === input.target) {
      return NextResponse.json(
        { error: "Ngôn ngữ nguồn và đích phải khác nhau." },
        { status: 400 },
      );
    }
    if (
      (input.source && !isTranslationLanguage(input.source)) ||
      !isTranslationLanguage(input.target)
    ) {
      return NextResponse.json(
        { error: "Ngôn ngữ chưa được hỗ trợ." },
        { status: 400 },
      );
    }

    const usage = await consumeAiQuota(viewer.id);
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: `Bạn đã dùng hết ${usage.quota} lượt AI hôm nay.`,
          code: "AI_QUOTA_EXCEEDED",
        },
        { status: 429 },
      );
    }

    const result = await translateWithMachineProvider({
      text: input.text,
      source: input.source ?? undefined,
      target: input.target,
    });
    const supabase = await createClient();
    await supabase.from("learning_events").insert({
      user_id: viewer.id,
      event_type: "translation",
      skill: "translation",
      duration_seconds: 0,
      metadata: {
        provider: result.provider,
        source: result.detectedSourceLanguage,
        target: input.target,
        characters: input.text.length,
      },
    });

    return NextResponse.json(
      {
        ...result,
        providerLabel: providerLabels[result.provider],
        usage: {
          used: usage.used,
          quota: usage.quota,
          remaining: Math.max(0, usage.quota - usage.used),
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? "Dữ liệu dịch không hợp lệ."
        : error instanceof Error
          ? error.message
          : "Không thể dịch nội dung.";
    const status =
      error instanceof MachineTranslationError
        ? error.status
        : error instanceof z.ZodError
          ? 400
          : 500;
    const code =
      error instanceof MachineTranslationError ? error.code : undefined;
    return NextResponse.json(
      { error: message, code },
      { status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
