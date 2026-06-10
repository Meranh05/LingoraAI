"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, FileText, Send, Settings2, Sparkles, ThumbsDown, ThumbsUp, User } from "lucide-react";
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

type Message = { role: "user" | "assistant"; content: string };

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

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
      <Card className="glass-panel flex h-[calc(100dvh-7.5rem)] min-h-[520px] flex-col overflow-hidden">
        <CardHeader className="shrink-0 border-b bg-white/45">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="size-5 text-primary" />
                {t("tutor.title")}
              </CardTitle>
              <CardDescription>
                {t("tutor.subtitle")}
              </CardDescription>
            </div>
            <Badge variant="secondary">
              <Sparkles data-icon="inline-start" />
              {t("tutor.autoModel")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <div
            ref={messagesRef}
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4 md:p-6"
          >
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
              >
                {message.role === "assistant" ? (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <Bot className="size-4" />
                  </span>
                ) : null}
                <div
                  className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border bg-white/85"
                  }`}
                >
                  {!initial.messages.length &&
                  index === 0 &&
                  message.role === "assistant"
                    ? t("tutor.welcome")
                    : message.content}
                  {message.role === "assistant" && index > 0 ? (
                    <div className="mt-3 flex gap-1 border-t pt-2">
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
                {message.role === "user" ? (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                    <User className="size-4" />
                  </span>
                ) : null}
              </div>
            ))}
            {loading ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Bot className="size-4" />
                </span>
                {t("tutor.thinking")}
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
            className="shrink-0 border-t bg-white/55 p-4"
          >
            <div className="flex items-end gap-3">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={t("tutor.placeholder")}
                className="min-h-20 resize-none bg-white/85"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                <Send />
                <span className="sr-only">{t("common.send")}</span>
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("tutor.keyboardHint")}
            </p>
          </form>
        </CardContent>
      </Card>

      <aside className="flex flex-col gap-4 xl:sticky xl:top-20">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-base">{t("tutor.context")}</CardTitle>
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
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-base">{t("tutor.aiSettings")}</CardTitle>
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
      </aside>
    </div>
  );
}
