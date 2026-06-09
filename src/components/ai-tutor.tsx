"use client";

import { FormEvent, useState } from "react";
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

type Message = { role: "user" | "assistant"; content: string };

const initialMessages: Message[] = [
  {
    role: "assistant",
    content:
      "Chào bạn! Mình là gia sư Lingora. Bạn có thể hỏi về ngữ pháp, từ vựng, bài viết hoặc nội dung tài liệu. Mình sẽ giải thích bằng tiếng Việt trước.",
  },
];

export function AiTutor() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const config = readClientAiConfig();
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          sessionId,
          messages: [
            {
              role: "system",
              content:
                "You are Lingora, a professional English tutor for Vietnamese learners. Explain in Vietnamese first, then give natural English examples. Be clear, accurate and encouraging.",
            },
            ...nextMessages,
          ],
        }),
      });
      const data = (await response.json()) as { text?: string; error?: string; sessionId?: string };
      if (!response.ok) throw new Error(data.error ?? "Không thể gọi AI.");
      setSessionId(data.sessionId);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.text ?? "" },
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Đã có lỗi xảy ra.");
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
    if (response.ok) toast.success("Cảm ơn bạn. Feedback đã được ghi nhận.");
    else toast.error("Không thể lưu feedback.");
  }

  return (
    <div className="grid min-h-[calc(100vh-7.5rem)] gap-5 xl:grid-cols-[1fr_310px]">
      <Card className="glass-panel flex min-h-[650px] flex-col overflow-hidden">
        <CardHeader className="border-b bg-white/45">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="size-5 text-primary" />
                Gia sư Lingora
              </CardTitle>
              <CardDescription>
                Giải thích tiếng Việt · Ví dụ tiếng Anh tự nhiên
              </CardDescription>
            </div>
            <Badge variant="secondary">
              <Sparkles data-icon="inline-start" />
              Auto model
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col p-0">
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
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
                  {message.content}
                  {message.role === "assistant" && index > 0 ? (
                    <div className="mt-3 flex gap-1 border-t pt-2">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => rate(index, 1)}
                      >
                        <ThumbsUp />
                        <span className="sr-only">Câu trả lời hữu ích</span>
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => rate(index, -1)}
                      >
                        <ThumbsDown />
                        <span className="sr-only">Câu trả lời chưa tốt</span>
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
                Lingora đang suy nghĩ...
              </div>
            ) : null}
          </div>
          <form onSubmit={submit} className="border-t bg-white/55 p-4">
            <div className="flex items-end gap-3">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ví dụ: Giải thích sự khác nhau giữa present perfect và past simple..."
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
                <span className="sr-only">Gửi</span>
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Enter để gửi · Shift + Enter để xuống dòng
            </p>
          </form>
        </CardContent>
      </Card>

      <aside className="flex flex-col gap-4">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-base">Ngữ cảnh</CardTitle>
            <CardDescription>Chọn nguồn để Lingora trả lời sát hơn.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button variant="outline" className="justify-start">
              <FileText data-icon="inline-start" />
              Kiến thức chung
            </Button>
            <Button variant="ghost" className="justify-start text-muted-foreground">
              <FileText data-icon="inline-start" />
              Chưa chọn tài liệu
            </Button>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-base">Cấu hình AI</CardTitle>
            <CardDescription>
              Chọn provider, model và nhập API key.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              variant="outline"
              render={<Link href="/settings" />}
            >
              <Settings2 data-icon="inline-start" />
              Mở cài đặt
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
