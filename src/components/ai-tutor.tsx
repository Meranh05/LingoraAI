"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Check,
  FileText,
  RotateCcw,
  Send,
  Settings2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  User,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { readClientAiConfig } from "@/lib/client-ai-config";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/components/locale-provider";
import { useExperience } from "@/components/experience-provider";
import { MascotSprite } from "@/components/lingora-mascot";

type Message = { role: "user" | "assistant"; content: string };

const quickPrompts = [
  "Luyện hội thoại tiếng Anh hằng ngày",
  "Sửa ngữ pháp câu tôi vừa viết",
  "Cho tôi 5 từ vựng theo chủ đề",
];

export function AiTutor({
  initial,
}: {
  initial: {
    documents: Array<{ id: string; file_name: string; status: string }>;
    sessionId: string | null;
    documentId: string | null;
    messages: Message[];
  };
}) {
  const { t } = useLocale();
  const { play } = useExperience();
  const welcomeMessage: Message = {
    role: "assistant",
    content: t("tutor.welcome"),
  };
  const [messages, setMessages] = useState(
    initial.messages.length ? initial.messages : [welcomeMessage],
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(
    initial.sessionId ?? undefined,
  );
  const [documentId, setDocumentId] = useState(initial.documentId ?? "general");
  const [lastError, setLastError] = useState("");
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const container = messagesRef.current;
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: messages.length > 1 ? "smooth" : "auto",
        });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, loading, lastError]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setLastError("");
    setUpgradeRequired(false);

    try {
      const config = readClientAiConfig();
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          sessionId,
          documentId: documentId === "general" ? null : documentId,
          messages: [
            {
              role: "system",
              content: t("tutor.clientInstruction"),
            },
            ...nextMessages,
          ],
        }),
      });
      const data = (await response.json()) as {
        text?: string;
        error?: string;
        code?: string;
        sessionId?: string;
      };
      if (!response.ok) {
        setUpgradeRequired(
          data.code === "PLAN_UPGRADE_REQUIRED" ||
            data.code === "AI_QUOTA_EXCEEDED",
        );
        throw new Error(data.error ?? "Không thể gọi AI.");
      }
      setSessionId(data.sessionId);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.text ?? "" },
      ]);
      play("success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
      setLastError(message);
      toast.error(message);
      play("error");
    } finally {
      setLoading(false);
    }
  }

  async function rate(index: number, rating: -1 | 1) {
    const output = messages[index];
    const input = [...messages.slice(0, index)]
      .reverse()
      .find((message) => message.role === "user");
    const response = await fetch("/api/ai/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputText: input?.content,
        outputText: output.content,
        rating,
        category: "tutor_chat",
      }),
    });
    if (response.ok) {
      play("tap");
      toast.success("Cảm ơn bạn. Feedback đã được ghi nhận.");
    } else {
      play("error");
      toast.error("Không thể lưu feedback.");
    }
  }

  function resetConversation() {
    setMessages([welcomeMessage]);
    setSessionId(undefined);
    setLastError("");
    setUpgradeRequired(false);
    setInput("");
    play("tap");
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <Card className="flex h-[calc(100dvh-7.5rem)] min-h-[560px] flex-col overflow-hidden border-white/80 bg-white/90 py-0 shadow-[0_30px_90px_-45px_rgba(14,116,144,0.55)] backdrop-blur-xl">
        <CardHeader className="relative shrink-0 overflow-hidden border-b border-sky-100 bg-gradient-to-r from-white via-sky-50/90 to-cyan-50/80 px-5 py-4 md:px-6">
          <div className="pointer-events-none absolute -right-12 -top-20 size-44 rounded-full bg-cyan-200/25 blur-3xl" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 shadow-sm ring-1 ring-sky-200">
                <MascotSprite mood="think" className="size-11" />
                <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-emerald-500" />
              </span>
              <div className="min-w-0">
                <CardTitle className="truncate text-base font-black md:text-lg">
                  {t("tutor.title")}
                </CardTitle>
                <CardDescription className="mt-0.5 flex items-center gap-1.5 truncate text-xs">
                  <span className="font-semibold text-emerald-600">Đang trực tuyến</span>
                  <span>·</span>
                  {t("tutor.subtitle")}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="hidden border-sky-200 bg-white/80 text-sky-700 sm:flex" variant="outline">
                <Sparkles data-icon="inline-start" />
                {t("tutor.autoModel")}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={resetConversation}
                aria-label="Bắt đầu cuộc trò chuyện mới"
              >
                <RotateCcw />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <div
            ref={messagesRef}
            className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top_right,rgba(186,230,253,0.22),transparent_32%),linear-gradient(to_bottom,rgba(248,252,255,0.96),rgba(255,255,255,0.92))] p-4 md:p-6"
          >
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex items-end gap-3 ${message.role === "user" ? "justify-end" : ""}`}
              >
                {message.role === "assistant" ? (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 shadow-sm ring-1 ring-sky-200">
                    <MascotSprite mood="think" className="size-9" />
                  </span>
                ) : null}
                <div className={`max-w-[86%] md:max-w-[76%] ${message.role === "user" ? "text-right" : ""}`}>
                  <div
                    className={`whitespace-pre-wrap px-4 py-3 text-left text-sm leading-6 shadow-sm ${
                      message.role === "user"
                        ? "rounded-3xl rounded-br-md bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sky-200/70"
                        : "rounded-3xl rounded-bl-md border border-slate-200/80 bg-white text-slate-700"
                    }`}
                  >
                    {!initial.messages.length &&
                    index === 0 &&
                    message.role === "assistant"
                      ? t("tutor.welcome")
                      : message.content}
                    {message.role === "assistant" && index > 0 ? (
                      <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-2">
                        <span className="mr-1 text-[11px] text-slate-400">Hữu ích?</span>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => rate(index, 1)}
                        >
                          <ThumbsUp />
                          <span className="sr-only">{t("tutor.helpful")}</span>
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => rate(index, -1)}
                        >
                          <ThumbsDown />
                          <span className="sr-only">{t("tutor.notHelpful")}</span>
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <p className={`mt-1 px-1 text-[10px] text-slate-400 ${message.role === "user" ? "text-right" : "text-left"}`}>
                    {message.role === "user" ? "Bạn" : "Lumo AI"}
                  </p>
                </div>
                {message.role === "user" ? (
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                    <User className="size-4" />
                  </span>
                ) : null}
              </div>
            ))}
            {messages.length === 1 && !loading ? (
              <div className="ml-13 flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="rounded-full border border-sky-200 bg-white px-3 py-2 text-left text-xs font-semibold text-sky-800 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50"
                  >
                    <WandSparkles className="mr-1.5 inline size-3.5" />
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}
            {loading ? (
              <div className="flex items-end gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 ring-1 ring-sky-200">
                  <MascotSprite mood="think" className="size-9" />
                </span>
                <div className="flex items-center gap-1 rounded-3xl rounded-bl-md border bg-white px-4 py-3 shadow-sm">
                  <span className="size-2 animate-bounce rounded-full bg-sky-400 [animation-delay:-0.3s]" />
                  <span className="size-2 animate-bounce rounded-full bg-sky-400 [animation-delay:-0.15s]" />
                  <span className="size-2 animate-bounce rounded-full bg-sky-400" />
                  <span className="ml-2 text-xs text-muted-foreground">{t("tutor.thinking")}</span>
                </div>
              </div>
            ) : null}
            {lastError ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                <span>{lastError}</span>
                {upgradeRequired ? (
                  <Button
                    size="sm"
                    nativeButton={false}
                    render={<Link href="/pricing" />}
                  >
                    Xem gói nâng cấp
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
          <form
            onSubmit={submit}
            className="shrink-0 border-t border-sky-100 bg-white/90 p-3 md:p-4"
          >
            <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_12px_35px_-20px_rgba(14,116,144,0.45)] focus-within:border-sky-300 focus-within:ring-4 focus-within:ring-sky-100/70">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={t("tutor.placeholder")}
                maxLength={4000}
                className="max-h-36 min-h-16 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <div className="flex items-center justify-between gap-3 px-1 pb-1">
                <p className="text-[11px] text-muted-foreground">
                  {t("tutor.keyboardHint")}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] tabular-nums text-slate-400">
                    {input.length}/4000
                  </span>
                  <Button type="submit" size="icon" className="rounded-2xl" disabled={loading || !input.trim()}>
                    <Send />
                    <span className="sr-only">{t("common.send")}</span>
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <aside className="flex flex-col gap-4 xl:sticky xl:top-20">
        <Card className="overflow-hidden border-white/80 bg-white/85 shadow-lg shadow-sky-100/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-sky-600" />
              {t("tutor.context")}
            </CardTitle>
            <CardDescription>{t("tutor.contextDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Select
              value={documentId}
              onValueChange={(value) => {
                setDocumentId(value ?? "general");
                setSessionId(undefined);
                setMessages([welcomeMessage]);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn ngữ cảnh" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>{t("tutor.answerSource")}</SelectLabel>
                  <SelectItem value="general">{t("tutor.generalKnowledge")}</SelectItem>
                  {initial.documents.map((document) => (
                    <SelectItem key={document.id} value={document.id}>
                      {document.file_name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <FileText className="mt-0.5 size-4 shrink-0" />
              {documentId === "general"
                ? t("tutor.generalContext")
                : t("tutor.documentContext")}
            </p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-white/80 bg-white/85 shadow-lg shadow-sky-100/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4 text-violet-600" />
              {t("tutor.aiSettings")}
            </CardTitle>
            <CardDescription>
              {t("tutor.aiSettingsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              variant="outline"
              nativeButton={false}
              render={<Link href="/settings" />}
            >
              <Settings2 data-icon="inline-start" />
              {t("common.openSettings")}
            </Button>
          </CardContent>
        </Card>
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-cyan-50 p-4 text-sm">
          <p className="flex items-center gap-2 font-bold text-emerald-800">
            <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="size-3.5" />
            </span>
            Hội thoại được lưu tự động
          </p>
          <p className="mt-2 text-xs leading-5 text-emerald-700/80">
            Lumo ghi nhớ ngữ cảnh trong phiên này để phản hồi liền mạch hơn.
          </p>
        </div>
      </aside>
    </div>
  );
}
