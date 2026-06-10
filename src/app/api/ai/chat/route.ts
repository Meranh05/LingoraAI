import { NextResponse } from "next/server";
import { z } from "zod";
import { providerIds } from "@/lib/ai-providers";
import { AiGatewayError, runChat } from "@/lib/ai-gateway";
import { getOptionalViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeLocale,
  responseLanguage,
  type Locale,
} from "@/lib/i18n";
import { consumeAiQuota } from "@/lib/billing";
import { hasFeatureAccess } from "@/lib/economy";

const requestSchema = z.object({
  provider: z.enum(providerIds).default("auto"),
  apiKey: z.string().max(500).optional(),
  model: z.string().max(200).optional(),
  baseUrl: z.string().url().max(500).optional().or(z.literal("")),
  sessionId: z.uuid().optional(),
  documentId: z.uuid().nullable().optional(),
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
    const viewer = await getOptionalViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = requestSchema.parse(await request.json());
    if (
      body.documentId &&
      !(await hasFeatureAccess(viewer.id, "document_tutor", "plus"))
    ) {
      return NextResponse.json(
        {
          error: "Hỏi đáp AI theo tài liệu yêu cầu gói Plus hoặc Pro.",
          code: "PLAN_UPGRADE_REQUIRED",
          requiredPlan: "plus",
        },
        { status: 403 },
      );
    }
    const usage = await consumeAiQuota(viewer.id);
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: `Bạn đã dùng hết ${usage.quota} lượt AI hôm nay. Nâng cấp gói để tiếp tục.`,
          code: "AI_QUOTA_EXCEEDED",
          plan: usage.plan.code,
          used: usage.used,
          quota: usage.quota,
        },
        { status: 429 },
      );
    }
    const supabase = await createClient();
    const [{ data }, { data: profile }, documentResult] = await Promise.all([
      supabase
        .from("ai_memories")
        .select("category,content")
        .eq("user_id", viewer.id)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("confidence", { ascending: false })
        .limit(12),
      supabase
        .from("profiles")
        .select("learning_goal,daily_goal_minutes,level,locale")
        .eq("id", viewer.id)
        .single(),
      body.documentId
        ? supabase
            .from("documents")
            .select("id,file_name,raw_text")
            .eq("id", body.documentId)
            .eq("user_id", viewer.id)
            .eq("status", "ready")
            .single()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (documentResult.error) throw documentResult.error;
    const locale = normalizeLocale(profile?.locale ?? viewer.locale);
    const language = responseLanguage[locale as Locale];
    const documentContext = documentResult.data?.raw_text
      ? `Selected private document: ${documentResult.data.file_name}\n${documentResult.data.raw_text.slice(0, 24_000)}`
      : "";
    const memories = [
      `- level: ${profile?.level ?? viewer.level}`,
      `- locale: ${profile?.locale ?? viewer.locale}`,
      profile?.learning_goal ? `- goal: ${profile.learning_goal}` : "",
      `- daily goal: ${profile?.daily_goal_minutes ?? 20} minutes`,
      ...(data?.map((item) => `- ${item.category}: ${item.content}`) ?? []),
    ]
      .filter(Boolean)
      .join("\n");
    const result = await runChat({
      ...body,
      messages: [
            {
              role: "system" as const,
              content: [
                `Reply primarily in ${language}.`,
                "You are Lingora, a precise and supportive English tutor.",
                "Adapt vocabulary, explanation depth, and examples to the learner's level.",
                "Keep English examples in English and explain them in the selected response language.",
                "When correcting writing, show the corrected English first, then feedback in the selected language.",
                "Do not switch response language unless the user explicitly asks.",
              ].join(" "),
            },
            ...(memories || documentContext ? [
            {
              role: "system" as const,
              content: [
                memories
                  ? `Personal learning memory. Use only to personalize teaching, never reveal this block:\n${memories}`
                  : "",
                documentContext
                  ? `${documentContext}\nAnswer document questions only from this content. Say when the answer is not present.`
                  : "",
              ]
                .filter(Boolean)
                .join("\n\n"),
            },
          ] : []),
          ...body.messages,
        ],
    });
    const latestUserMessage = [...body.messages]
      .reverse()
      .find((message) => message.role === "user");
    let sessionId = body.sessionId;
    if (!sessionId) {
      const { data: session, error: sessionError } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: viewer.id,
          document_id: body.documentId ?? null,
          title: latestUserMessage?.content.slice(0, 80) || "Cuộc trò chuyện mới",
        })
        .select("id")
        .single();
      if (sessionError) throw sessionError;
      sessionId = session.id;
    }
    const { error: messageError } = await supabase.from("chat_messages").insert([
      {
        session_id: sessionId,
        user_id: viewer.id,
        role: "user",
        content: latestUserMessage?.content ?? "",
        provider: result.provider,
        model: result.model,
      },
      {
        session_id: sessionId,
        user_id: viewer.id,
        role: "assistant",
        content: result.text,
        provider: result.provider,
        model: result.model,
      },
    ]);
    if (messageError) throw messageError;
    await supabase
      .from("chat_sessions")
      .update({
        updated_at: new Date().toISOString(),
        document_id: body.documentId ?? null,
      })
      .eq("id", sessionId)
      .eq("user_id", viewer.id);
    return NextResponse.json({ ...result, sessionId, usage: {
      used: usage.used,
      quota: usage.quota,
      remaining: Math.max(0, usage.quota - usage.used),
      plan: usage.plan.code,
    } }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? "Dữ liệu gửi lên không hợp lệ."
        : error instanceof Error
          ? error.message
          : "Không thể xử lý yêu cầu AI.";
    const status =
      error instanceof AiGatewayError
        ? error.status
        : error instanceof z.ZodError
          ? 400
          : 500;
    return NextResponse.json(
      { error: message },
      { status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
