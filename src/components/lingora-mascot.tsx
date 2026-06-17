"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Loader2,
  MessageCircle,
  Send,
  Settings2,
  X,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { readClientAiConfig } from "@/lib/client-ai-config";
import type { MascotMood } from "@/lib/gamification";
import { canShowMascotCompanion } from "@/lib/mascot-visibility";
import { cn } from "@/lib/utils";
import { useExperience } from "@/components/experience-provider";

type Message = { role: "user" | "assistant"; content: string };

const openMascotChatEvent = "lingora:open-mascot-chat";

const messages: Array<[RegExp, MascotMood, string]> = [
  [/^\/$/, "wave", "mascot.home"],
  [/ai-tutor/, "think", "mascot.tutor"],
  [/roadmap/, "champion", "mascot.roadmap"],
  [/reading|documents/, "read", "mascot.read"],
  [/listening/, "listen", "mascot.listen"],
  [/flashcards|vocabulary/, "cards", "mascot.cards"],
  [/quiz|practice/, "encourage", "mascot.practice"],
  [/competition/, "champion", "mascot.competition"],
  [/writing/, "write", "mascot.write"],
  [/speaking/, "speak", "mascot.speak"],
];

export function MascotSprite({
  mood,
  className,
}: {
  mood: MascotMood;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={`Lumo ${mood}`}
      className={cn("lumo-sprite block shrink-0", className)}
      style={{ backgroundImage: `url("/mascot/lumo-${mood}.png")` }}
    />
  );
}

export function openMascotChat() {
  window.dispatchEvent(new Event(openMascotChatEvent));
}

export function MascotCompanion() {
  const pathname = usePathname();
  const { t } = useLocale();
  const { showMascot } = useExperience();
  const [open, setOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState<string>();
  const messagesRef = useRef<HTMLDivElement>(null);
  const state = useMemo(
    () =>
      messages.find(([pattern]) => pattern.test(pathname)) ?? [
        /.*/,
        "idle",
        "mascot.default",
      ],
    [pathname],
  );

  useEffect(() => {
    const showChat = () => setOpen(true);
    window.addEventListener(openMascotChatEvent, showChat);
    return () => window.removeEventListener(openMascotChatEvent, showChat);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const container = messagesRef.current;
      if (container) container.scrollTop = container.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chatMessages, loading, error]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading) return;

    const nextMessages = [
      ...chatMessages,
      { role: "user" as const, content },
    ];
    setChatMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...readClientAiConfig(),
          sessionId,
          documentId: null,
          messages: [
            { role: "system", content: t("tutor.clientInstruction") },
            ...nextMessages,
          ],
        }),
      });
      const data = (await response.json()) as {
        text?: string;
        error?: string;
        sessionId?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? t("mascot.chatError"));
      }
      setSessionId(data.sessionId);
      setChatMessages((current) => [
        ...current,
        { role: "assistant", content: data.text ?? "" },
      ]);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : t("mascot.chatError"),
      );
    } finally {
      setLoading(false);
    }
  }

  if (!canShowMascotCompanion(pathname, showMascot)) {
    return null;
  }

  return (
    <div className="fixed bottom-3 right-3 z-40 flex flex-col items-end gap-3 sm:bottom-5 sm:right-5">
      {open ? (
        <section
          aria-label={t("mascot.chatTitle")}
          className="flex h-[min(560px,calc(100dvh-7rem))] w-[min(400px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 shadow-[0_32px_90px_-30px_rgba(14,116,144,0.5)] backdrop-blur-xl"
        >
          <header className="relative flex items-center gap-3 overflow-hidden border-b border-sky-100 bg-gradient-to-r from-sky-50 via-cyan-50 to-indigo-50 px-4 py-3.5">
            <span className="relative size-12 shrink-0 rounded-2xl bg-white shadow-sm">
              <MascotSprite
                mood={state[1] as MascotMood}
                className="absolute inset-0 size-full"
              />
            </span>
            <div className="min-w-0 flex-1">
              <strong className="flex items-center gap-2 text-sm text-sky-950">
                {t("mascot.chatTitle")}
                <span className="size-2 rounded-full bg-emerald-500" />
              </strong>
              <span className="block truncate text-xs text-sky-700">
                {t("mascot.chatSubtitle")}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen(false)}
            >
              <X />
              <span className="sr-only">{t("mascot.closeChat")}</span>
            </Button>
          </header>

          <div
            ref={messagesRef}
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(186,230,253,0.24),transparent_34%)] p-4"
          >
            <div className="flex items-end gap-2">
              <MascotSprite
                mood={state[1] as MascotMood}
                className="size-9"
              />
              <p className="max-w-[82%] rounded-3xl rounded-bl-md border border-sky-100 bg-white px-3.5 py-2.5 text-sm leading-5 text-slate-700 shadow-sm">
                {chatMessages.length
                  ? t("mascot.welcomeBack")
                  : t(state[2] as string)}
              </p>
            </div>
            {chatMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  "flex items-end gap-2",
                  message.role === "user" && "justify-end",
                )}
              >
                {message.role === "assistant" ? (
                  <MascotSprite mood="think" className="size-9" />
                ) : null}
                <p
                  className={cn(
                    "max-w-[82%] whitespace-pre-wrap rounded-3xl px-3.5 py-2.5 text-sm leading-5 shadow-sm",
                    message.role === "user"
                      ? "rounded-br-md bg-gradient-to-br from-sky-500 to-blue-600 text-white"
                      : "rounded-bl-md border border-sky-100 bg-white text-slate-700",
                  )}
                >
                  {message.content}
                </p>
              </div>
            ))}
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MascotSprite mood="think" className="size-9" />
                <Loader2 className="size-3.5 animate-spin" />
                {t("tutor.thinking")}
              </div>
            ) : null}
            {error ? (
              <p className="rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <form onSubmit={submit} className="border-t border-sky-100 bg-white/95 p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm focus-within:border-sky-300 focus-within:ring-4 focus-within:ring-sky-100/70">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder={t("mascot.chatPlaceholder")}
                className="max-h-28 min-h-11 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              <Button
                type="submit"
                size="icon"
                className="shrink-0 rounded-xl"
                disabled={loading || !input.trim()}
              >
                <Send />
                <span className="sr-only">{t("common.send")}</span>
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <Link
                href="/settings"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Settings2 className="size-3.5" />
                {t("common.openSettings")}
              </Link>
              <Link
                href="/ai-tutor"
                className="flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-900"
              >
                {t("mascot.fullChat")}
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="group relative size-16 rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 shadow-xl shadow-sky-300/40 transition hover:-translate-y-1 md:size-20"
        aria-label={open ? t("mascot.closeChat") : t("mascot.openChat")}
        aria-expanded={open}
      >
        <MascotSprite
          mood={state[1] as MascotMood}
          className="absolute inset-0 size-full"
        />
        <span className="absolute -left-1 top-0 flex size-6 items-center justify-center rounded-full bg-white text-sky-600 shadow">
          {open ? (
            <X className="size-3.5" />
          ) : (
            <MessageCircle className="size-3.5" />
          )}
        </span>
      </button>
    </div>
  );
}
