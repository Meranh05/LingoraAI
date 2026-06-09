"use client";

import { ChangeEvent, useState } from "react";
import {
  BookOpen,
  FileText,
  HelpCircle,
  Languages,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { readClientAiConfig } from "@/lib/client-ai-config";

type AiResult = {
  summary: string;
  questions: string;
  vocabulary: string;
};

type DocumentRow = {
  id: string;
  file_name: string;
  file_type: string;
  status: string;
  summary_vi: string | null;
  summary_en: string | null;
  created_at: string;
};

export function DocumentStudio({
  initialDocuments,
}: {
  initialDocuments: DocumentRow[];
}) {
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult>({
    summary: "",
    questions: "",
    vocabulary: "",
  });

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/documents/extract", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as {
        text?: string;
        error?: string;
        document?: DocumentRow;
      };
      if (!response.ok) throw new Error(data.error ?? "Không thể đọc file.");
      setFileName(file.name);
      setText(data.text ?? "");
      setDocumentId(data.document?.id ?? "");
      toast.success("Đã tải lên và lưu tài liệu.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể đọc file.");
    } finally {
      setLoading(false);
    }
  }

  async function analyze(kind: keyof AiResult) {
    if (!text.trim()) return toast.error("Hãy tải file hoặc nhập nội dung.");
    setLoading(true);
    try {
      const prompts = {
        summary:
          "Tóm tắt nội dung sau bằng tiếng Việt có cấu trúc: ý chính, luận điểm, kết luận. Sau đó thêm bản tóm tắt tiếng Anh ngắn.",
        questions:
          "Tạo 8 câu hỏi từ nội dung sau: 4 trắc nghiệm có đáp án, 2 đúng/sai, 2 câu trả lời ngắn. Giải thích đáp án bằng tiếng Việt.",
        vocabulary:
          "Chọn 12 từ/cụm từ tiếng Anh hữu ích từ nội dung, cho IPA, nghĩa tiếng Việt theo ngữ cảnh và ví dụ song ngữ.",
      };
      const config = readClientAiConfig();
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          messages: [
            {
              role: "system",
              content:
                "You are Lingora, an English learning document analyst. Never invent facts outside the provided document.",
            },
            {
              role: "user",
              content: `${prompts[kind]}\n\nDOCUMENT:\n${text.slice(0, 24_000)}`,
            },
          ],
        }),
      });
      const data = (await response.json()) as {
        text?: string;
        error?: string;
        provider?: string;
        model?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Không thể phân tích.");
      const output = data.text ?? "";
      setResult((current) => ({ ...current, [kind]: output }));
      if (documentId) {
        const saveResponse = await fetch("/api/documents/analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId,
            kind,
            content: output,
            provider: data.provider,
            model: data.model,
          }),
        });
        if (!saveResponse.ok) throw new Error("Đã phân tích nhưng không thể lưu kết quả.");
      }
      toast.success("Đã phân tích và lưu kết quả.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể phân tích.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Document Studio</h1>
        <p className="mt-2 text-muted-foreground">
          Đọc PDF, DOCX, TXT; tóm tắt, tạo câu hỏi và trích từ vựng.
        </p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Nội dung tài liệu</CardTitle>
            <CardDescription>{fileName || "Chưa chọn tài liệu"}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-white/50 p-6 hover:bg-secondary/50">
              <Upload className="size-5 text-primary" />
              <span>Chọn PDF, DOCX hoặc TXT</span>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                className="sr-only"
                onChange={upload}
              />
            </label>
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="min-h-[440px] bg-white/80"
              placeholder="Nội dung được trích xuất sẽ xuất hiện tại đây..."
            />
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>AI Learning Tools</CardTitle>
              <Badge variant="secondary"><Sparkles /> Theo tài liệu</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="summary"><FileText /> Tóm tắt</TabsTrigger>
                <TabsTrigger value="questions"><HelpCircle /> Câu hỏi</TabsTrigger>
                <TabsTrigger value="vocabulary"><BookOpen /> Từ vựng</TabsTrigger>
              </TabsList>
              {(["summary", "questions", "vocabulary"] as const).map((kind) => (
                <TabsContent key={kind} value={kind}>
                  <div className="flex min-h-[430px] flex-col gap-4 pt-4">
                    <Button onClick={() => analyze(kind)} disabled={loading}>
                      {loading ? <Loader2 className="animate-spin" /> : kind === "summary" ? <Languages /> : kind === "questions" ? <HelpCircle /> : <BookOpen />}
                      {kind === "summary" ? "Tạo tóm tắt song ngữ" : kind === "questions" ? "Tạo bộ câu hỏi" : "Trích từ vựng"}
                    </Button>
                    <div className="flex-1 whitespace-pre-wrap rounded-2xl border bg-white/75 p-4 text-sm leading-7">
                      {result[kind] || "Kết quả AI sẽ xuất hiện tại đây."}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Tài liệu đã lưu ({initialDocuments.length})</CardTitle>
          <CardDescription>
            Danh sách này được đọc từ tài khoản hiện tại qua RLS.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {initialDocuments.length ? initialDocuments.map((document) => (
            <div key={document.id} className="rounded-2xl border bg-white/70 p-4">
              <p className="truncate font-semibold">{document.file_name}</p>
              <div className="mt-2 flex gap-2">
                <Badge variant="outline">{document.file_type.toUpperCase()}</Badge>
                <Badge variant="secondary">{document.status}</Badge>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(document.created_at))}
              </p>
            </div>
          )) : (
            <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Chưa có tài liệu nào trong tài khoản.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
