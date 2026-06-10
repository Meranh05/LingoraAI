"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Headphones,
  Languages,
  Loader2,
  Mic2,
  PenLine,
  Plus,
  RotateCcw,
  Trash2,
  Volume2,
  Flame,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { readClientAiConfig } from "@/lib/client-ai-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/components/locale-provider";
import { navigationLabels } from "@/lib/i18n";
import { PageHero } from "@/components/page-hero";
import { useExperience } from "@/components/experience-provider";

type Vocabulary = {
  id: string;
  word: string;
  phonetic: string | null;
  meaning_vi: string;
  example_en: string | null;
  level: string | null;
  next_review_at: string | null;
};

type Question = {
  id: string;
  skill: string;
  question_type: string;
  prompt: Record<string, string>;
  passage: string | null;
  options: Array<{ id: string; text: string }> | null;
  difficulty: string;
};

type WorkspaceData = {
  vocabulary: Vocabulary[];
  questions: Question[];
  attempts: Array<{
    id: string;
    skill: string;
    score: number | null;
    created_at: string;
  }>;
  reviews: Array<{
    id: string;
    original_text: string;
    corrected_text: string;
    score: number | null;
    created_at: string;
  }>;
  quizResults: Array<{
    id: string;
    score: number;
    total: number;
    created_at: string;
  }>;
  progress: Array<{
    skill: string;
    level: string;
    mastery: number;
    total_minutes: number;
    total_attempts: number;
  }>;
};

const definitions = {
  vocabulary: ["vocabulary", "workspace.vocabularyDescription", BookOpen],
  flashcards: ["flashcards", "workspace.flashcardsDescription", BrainCircuit],
  reading: ["reading", "workspace.readingDescription", BookOpen],
  listening: ["listening", "workspace.listeningDescription", Headphones],
  speaking: ["speaking", "workspace.speakingDescription", Mic2],
  writing: ["writing", "workspace.writingDescription", PenLine],
  translation: ["translation", "workspace.translationDescription", Languages],
  quiz: ["quiz", "workspace.quizDescription", CheckCircle2],
  progress: ["progress", "workspace.progressDescription", BarChart3],
} as const;

function promptText(prompt: Record<string, string>, locale: string) {
  return prompt[locale] || prompt.en || prompt.vi || Object.values(prompt)[0] || "";
}

export function LearningWorkspace({
  kind,
  data,
}: {
  kind: keyof typeof definitions;
  data: WorkspaceData;
}) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const { play } = useExperience();
  const [loading, setLoading] = useState(false);
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [microphoneStatus, setMicrophoneStatus] = useState<
    "idle" | "requesting" | "listening" | "granted" | "denied" | "unsupported"
  >("idle");
  const [navigationKey, descriptionKey, Icon] = definitions[kind];
  const title = navigationLabels[locale][navigationKey];
  const description = t(descriptionKey);
  const skill = kind === "quiz" ? null : kind;
  const questions = useMemo(
    () =>
      data.questions.filter((question) =>
        kind === "quiz"
          ? ["multiple_choice", "true_false"].includes(question.question_type)
          : question.skill === skill,
      ),
    [data.questions, kind, skill],
  );
  const question = questions[questionIndex % Math.max(questions.length, 1)];

  async function addWord() {
    if (!word.trim() || !meaning.trim()) return toast.error("Nhập từ và nghĩa.");
    setLoading(true);
    const response = await fetch("/api/vocabulary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, meaningVi: meaning }),
    });
    const payload = (await response.json()) as { error?: string };
    setLoading(false);
    if (!response.ok) return toast.error(payload.error ?? "Không thể lưu từ.");
    setWord("");
    setMeaning("");
    play("success");
    toast.success("Đã lưu từ vựng.");
    router.refresh();
  }

  async function deleteWord(id: string) {
    const response = await fetch("/api/vocabulary", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) return toast.error("Không thể xóa từ.");
    play("tap");
    router.refresh();
  }

  async function reviewWord(id: string, quality: "again" | "hard" | "good" | "easy") {
    const response = await fetch("/api/vocabulary", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, quality }),
    });
    if (!response.ok) return toast.error("Không thể lưu lần ôn.");
    play(quality === "again" ? "error" : quality === "easy" ? "complete" : "success");
    setShowBack(false);
    setCardIndex((current) => (current + 1) % Math.max(data.vocabulary.length, 1));
    router.refresh();
  }

  async function submitAttempt() {
    if (!question || !answer.trim()) return;
    setLoading(true);
    const response = await fetch("/api/practice/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: question.id,
        answer,
        durationSeconds: 60,
        module: kind === "quiz" ? "quiz" : "practice",
      }),
    });
    const payload = (await response.json()) as { error?: string; score?: number };
    setLoading(false);
    if (!response.ok) return toast.error(payload.error ?? "Không thể lưu kết quả.");
    setScore(payload.score ?? null);
    play((payload.score ?? 0) >= 70 ? "complete" : "error");
    toast.success("Đã lưu kết quả luyện tập.");
    router.refresh();
  }

  function nextQuestion() {
    setAnswer("");
    setScore(null);
    setQuestionIndex((current) => (current + 1) % Math.max(questions.length, 1));
  }

  async function runAi(mode: "writing" | "translation") {
    if (!text.trim()) return toast.error("Nhập nội dung trước khi gửi.");
    setLoading(true);
    try {
      const instruction =
        mode === "writing"
          ? "Correct this English writing. Return the corrected English first, then concise feedback in the response language selected by the server."
          : "Translate naturally based on the source language and the user's selected interface language. Explain three important phrases.";
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...readClientAiConfig(),
          messages: [
            { role: "system", content: "You are Lingora, a precise English learning assistant." },
            { role: "user", content: `${instruction}\n\n${text}` },
          ],
        }),
      });
      const payload = (await response.json()) as { text?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Model không phản hồi.");
      const output = payload.text ?? "";
      setResult(output);
      if (mode === "writing") {
        const saveResponse = await fetch("/api/writing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalText: text,
            correctedText: output,
            feedbackVi: output,
          }),
        });
        if (!saveResponse.ok) throw new Error("AI đã trả lời nhưng không thể lưu bài sửa.");
      }
      toast.success(mode === "writing" ? "Đã sửa và lưu bài viết." : "Đã dịch bằng model API.");
      play("complete");
      router.refresh();
    } catch (error) {
      play("error");
      toast.error(error instanceof Error ? error.message : "Không thể xử lý.");
    } finally {
      setLoading(false);
    }
  }

  function speakPassage() {
    const content =
      question?.question_type === "dictation"
        ? "Good study habits are more important than studying for many hours without a plan."
        : promptText(question?.prompt ?? {}, locale);
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }

  async function startRecognition() {
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setMicrophoneStatus("unsupported");
      toast.error("Microphone yêu cầu HTTPS hoặc localhost.");
      return;
    }

    type Recognition = {
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      start(): void;
      stop(): void;
      onstart: () => void;
      onend: () => void;
      onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void;
      onerror: (event: { error: string }) => void;
    };
    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const SpeechRecognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition || !navigator.mediaDevices?.getUserMedia) {
      setMicrophoneStatus("unsupported");
      toast.error(
        "Trình duyệt chưa hỗ trợ nhận giọng nói. Hãy dùng Chrome hoặc Edge mới nhất.",
      );
      return;
    }

    setMicrophoneStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicrophoneStatus("granted");
    } catch (error) {
      setMicrophoneStatus("denied");
      const name = error instanceof DOMException ? error.name : "";
      toast.error(
        name === "NotAllowedError"
          ? "Quyền microphone đang bị chặn. Mở biểu tượng ổ khóa trên thanh địa chỉ và chọn Allow."
          : name === "NotFoundError"
            ? "Không tìm thấy microphone trên thiết bị."
            : "Không thể truy cập microphone. Kiểm tra thiết bị và quyền trình duyệt.",
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setMicrophoneStatus("listening");
    recognition.onend = () =>
      setMicrophoneStatus((current) =>
        current === "denied" ? "denied" : "granted",
      );
    recognition.onresult = (event) => {
      setAnswer(event.results[0][0].transcript);
      play("success");
      toast.success("Đã nhận giọng nói.");
    };
    recognition.onerror = (event) => {
      const errors: Record<string, string> = {
        "not-allowed":
          "Quyền microphone bị từ chối. Cho phép microphone trong cài đặt trang.",
        "service-not-allowed":
          "Dịch vụ nhận giọng nói bị trình duyệt hoặc hệ điều hành chặn.",
        "audio-capture": "Không thu được âm thanh từ microphone.",
        "no-speech": "Không nghe thấy giọng nói. Hãy nói gần microphone hơn.",
        network: "Dịch vụ nhận giọng nói cần kết nối mạng.",
        aborted: "Phiên nhận giọng nói đã bị dừng.",
      };
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setMicrophoneStatus("denied");
      }
      toast.error(errors[event.error] ?? `Lỗi microphone: ${event.error}`);
    };
    recognition.start();
  }

  if (kind === "vocabulary") {
    return (
      <Page title={title} description={description} icon={Icon}>
        <Card className="glass-panel interactive-lift">
          <CardHeader><CardTitle>Thêm từ mới</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <Input value={word} onChange={(event) => setWord(event.target.value)} placeholder="English word" />
            <Input value={meaning} onChange={(event) => setMeaning(event.target.value)} placeholder="Nghĩa tiếng Việt" />
            <Button onClick={addWord} disabled={loading}><Plus /> Lưu</Button>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader><CardTitle>Từ đã lưu ({data.vocabulary.length})</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.vocabulary.length ? data.vocabulary.map((item) => (
              <div key={item.id} className="interactive-lift flex items-center gap-3 rounded-2xl border bg-white/75 p-4">
                <div className="flex-1">
                  <p className="font-semibold">{item.word} <span className="font-normal text-muted-foreground">{item.phonetic}</span></p>
                  <p className="text-sm text-muted-foreground">{item.meaning_vi}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => deleteWord(item.id)}><Trash2 /></Button>
              </div>
            )) : <Empty text="Bạn chưa lưu từ vựng nào." />}
          </CardContent>
        </Card>
      </Page>
    );
  }

  if (kind === "flashcards") {
    const card = data.vocabulary[cardIndex];
    return (
      <Page title={title} description={description} icon={Icon}>
        {card ? (
          <Card className="glass-panel interactive-lift mx-auto w-full max-w-2xl overflow-hidden">
            <CardContent className="wave-grid flex min-h-[390px] cursor-pointer flex-col items-center justify-center p-8 text-center" onClick={() => { play("tap"); setShowBack((value) => !value); }}>
              <Badge variant="secondary">{card.level || "Chưa đặt level"}</Badge>
              <p className="mt-6 text-5xl font-bold tracking-tight">{card.word}</p>
              <p className="mt-3 text-muted-foreground">{showBack ? card.meaning_vi : "Nhấn để xem nghĩa"}</p>
              {showBack ? <div className="mt-8 flex flex-wrap justify-center gap-2">
                {(["again", "hard", "good", "easy"] as const).map((quality) => (
                  <Button key={quality} variant="outline" onClick={(event) => { event.stopPropagation(); reviewWord(card.id, quality); }}>{quality}</Button>
                ))}
              </div> : null}
            </CardContent>
          </Card>
        ) : <Empty text="Hãy thêm từ ở trang Từ vựng trước khi ôn flashcard." />}
      </Page>
    );
  }

  if (kind === "writing" || kind === "translation") {
    return (
      <Page title={title} description={description} icon={Icon}>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="glass-panel interactive-lift">
            <CardHeader><CardTitle>{t("workspace.input")}</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Textarea className="min-h-80 bg-white/80" value={text} onChange={(event) => setText(event.target.value)} />
              <Button onClick={() => runAi(kind)} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <Languages />} {kind === "writing" ? t("workspace.correct") : t("workspace.translate")}</Button>
            </CardContent>
          </Card>
          <Card className="glass-panel interactive-lift">
            <CardHeader><CardTitle>{t("workspace.result")}</CardTitle></CardHeader>
            <CardContent className="min-h-80 whitespace-pre-wrap text-sm leading-7">
              {result || <Empty text={t("workspace.noResult")} />}
            </CardContent>
          </Card>
        </div>
      </Page>
    );
  }

  if (kind === "progress") {
    return (
      <Page title={title} description={description} icon={Icon}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.progress.length ? data.progress.map((item) => (
            <Card key={item.skill} className="glass-panel interactive-lift overflow-hidden">
              <CardHeader><CardTitle className="capitalize">{item.skill}</CardTitle><CardDescription>{item.level} · {item.total_attempts} lượt luyện</CardDescription></CardHeader>
              <CardContent><Progress value={Number(item.mastery)} /><p className="mt-3 text-sm">{Number(item.mastery).toFixed(0)}% · {item.total_minutes} phút</p></CardContent>
            </Card>
          )) : <Empty text="Chưa có kết quả luyện tập để tổng hợp." />}
        </div>
      </Page>
    );
  }

  return (
    <Page title={title} description={description} icon={Icon}>
      {question ? (
        <Card className="glass-panel interactive-lift max-w-4xl overflow-hidden">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{question.difficulty}</Badge>
              <Badge variant="outline">{question.question_type}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                {t("workspace.question", { current: questionIndex + 1, total: questions.length })}
              </span>
            </div>
            <CardTitle className="pt-3">{promptText(question.prompt, locale)}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {question.passage ? <blockquote className="rounded-2xl bg-secondary/60 p-5 leading-7">{question.passage}</blockquote> : null}
            {kind === "listening" ? <Button variant="outline" onClick={speakPassage}><Volume2 /> Phát audio</Button> : null}
            {kind === "speaking" ? (
              <>
                <p className="rounded-2xl bg-secondary/60 p-5 text-lg">{question.prompt.model}</p>
                <Button
                  variant="outline"
                  onClick={startRecognition}
                  disabled={
                    microphoneStatus === "requesting" ||
                    microphoneStatus === "listening"
                  }
                >
                  {microphoneStatus === "requesting" ||
                  microphoneStatus === "listening" ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Mic2 />
                  )}
                  {microphoneStatus === "requesting"
                    ? t("workspace.requesting")
                    : microphoneStatus === "listening"
                      ? t("workspace.listening")
                      : t("workspace.startRecording")}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Trạng thái microphone:{" "}
                  {microphoneStatus === "idle"
                    ? "chưa kiểm tra"
                    : microphoneStatus === "granted"
                      ? "đã cấp quyền"
                      : microphoneStatus === "denied"
                        ? "bị chặn"
                        : microphoneStatus === "unsupported"
                          ? "không được hỗ trợ"
                          : microphoneStatus === "listening"
                            ? "đang nghe"
                            : "đang yêu cầu quyền"}
                </p>
              </>
            ) : null}
            {question.options ? (
              <RadioGroup value={answer} onValueChange={(value) => setAnswer(value ?? "")}>
                {question.options.map((option) => (
                  <label key={option.id} className="interactive-lift flex cursor-pointer items-center gap-3 rounded-2xl border bg-white/75 p-4 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5">
                    <RadioGroupItem value={option.id} /> {option.text}
                  </label>
                ))}
              </RadioGroup>
            ) : (
              <Textarea value={answer} onChange={(event) => setAnswer(event.target.value)} className="min-h-32 bg-white/80" placeholder={kind === "speaking" ? t("workspace.voiceTranscript") : t("workspace.answer")} />
            )}
            {score !== null ? <div className={`rounded-2xl border p-4 font-semibold ${score >= 70 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{t("workspace.savedScore", { score })}</div> : null}
            <div className="flex gap-3">
              <Button onClick={submitAttempt} disabled={!answer.trim() || loading}>{loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} {t("workspace.submit")}</Button>
              {score !== null && questions.length > 1 ? (
                <Button variant="outline" onClick={nextQuestion}>
                  {t("workspace.next")}
                </Button>
              ) : (
                <Button variant="outline" onClick={() => { setAnswer(""); setScore(null); }}><RotateCcw /> {t("common.retry")}</Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : <Empty text={t("workspace.noQuestions")} />}
    </Page>
  );
}

function Page({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof BookOpen;
  children: React.ReactNode;
}) {
  const tone =
    title.toLowerCase().includes("quiz") || title.toLowerCase().includes("kiểm tra")
      ? "amber"
      : title.toLowerCase().includes("progress") ||
          title.toLowerCase().includes("tiến độ")
        ? "emerald"
        : title.toLowerCase().includes("writing") ||
            title.toLowerCase().includes("viết") ||
            title.toLowerCase().includes("translation") ||
            title.toLowerCase().includes("dịch")
          ? "indigo"
          : "cyan";
  return (
    <div className="flex flex-col gap-6">
      <PageHero
        icon={Icon}
        title={title}
        description={description}
        eyebrow="Lingora Learning Studio"
        tone={tone}
        aside={
          <div className="grid grid-cols-2 gap-2">
            <span className="rounded-2xl bg-white/15 px-4 py-3 text-sm backdrop-blur">
              <Flame className="mb-1 size-4" />
              Học đều mỗi ngày
            </span>
            <span className="rounded-2xl bg-white/15 px-4 py-3 text-sm backdrop-blur">
              <Target className="mb-1 size-4" />
              Tiến bộ theo dữ liệu
            </span>
          </div>
        }
      />
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
