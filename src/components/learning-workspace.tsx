"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Headphones,
  Heart,
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
  Trophy,
  Zap,
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

function nowMs() {
  return Date.now();
}

export function LearningWorkspace({
  kind,
  data,
  challenge,
  lesson,
}: {
  kind: keyof typeof definitions;
  data: WorkspaceData;
  challenge?: {
    id: string;
    title: string;
    description: string;
    difficulty: string;
    target: number;
    minScore: number;
    progress: number;
    completed: boolean;
  };
  lesson?: {
    id: string;
    position: number;
    title: string;
    description: string;
    skill: string;
    level: string;
    estimatedMinutes: number;
    unlockMastery: number;
    mascot: string;
    mastery: number;
    bestScore: number;
    attempts: number;
    passedQuestions: number;
    totalQuestions: number;
    completed: boolean;
  };
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
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [rewards, setRewards] = useState({ xp: 0, tokens: 0 });
  const [rewardEligible, setRewardEligible] = useState(true);
  const [startedAt, setStartedAt] = useState(nowMs);
  const [cardIndex, setCardIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [hearts, setHearts] = useState(5);
  const [combo, setCombo] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [sessionAnswered, setSessionAnswered] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState(nowMs);
  const [sessionElapsedMinutes, setSessionElapsedMinutes] = useState(1);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
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
        challenge
          ? true
          : kind === "quiz"
          ? !["essay", "speaking"].includes(question.question_type)
          : question.skill === skill,
      ),
    [challenge, data.questions, kind, skill],
  );
  const [questionQueue, setQuestionQueue] = useState(() =>
    questions.map((item) => item.id),
  );
  const questionId = questionQueue[questionIndex];
  const question = questions.find((item) => item.id === questionId);
  const sessionAccuracy = sessionAnswered
    ? Math.round((sessionCorrect / sessionAnswered) * 100)
    : 0;

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
        durationSeconds: Math.max(1, Math.round((nowMs() - startedAt) / 1000)),
        module: challenge ? "competition" : kind === "quiz" ? "quiz" : "practice",
        challengeId: challenge?.id,
        idempotencyKey,
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      score?: number;
      explanation?: Record<string, string>;
      rewards?: { xp: number; tokens: number };
      rewardEligible?: boolean;
      correctAnswer?: string;
    };
    setLoading(false);
    if (!response.ok) return toast.error(payload.error ?? "Không thể lưu kết quả.");
    setScore(payload.score ?? null);
    setFeedback(
      payload.explanation?.[locale] ??
        payload.explanation?.vi ??
        payload.explanation?.en ??
        "",
    );
    setRewards(payload.rewards ?? { xp: 0, tokens: 0 });
    setRewardEligible(payload.rewardEligible ?? true);
    setCorrectAnswer(payload.correctAnswer ?? "");
    setSessionAnswered((current) => current + 1);
    setSessionXp((current) => current + (payload.rewards?.xp ?? 0));
    setSessionTokens((current) => current + (payload.rewards?.tokens ?? 0));
    if ((payload.score ?? 0) >= 70) {
      setCombo((current) => current + 1);
      setSessionCorrect((current) => current + 1);
    } else {
      setCombo(0);
      setHearts((current) => Math.max(0, current - 1));
      setQuestionQueue((current) =>
        current.filter((id) => id === question.id).length < 2
          ? [...current, question.id]
          : current,
      );
    }
    play((payload.score ?? 0) >= 70 ? "complete" : "error");
    toast.success("Đã lưu kết quả luyện tập.");
    router.refresh();
  }

  function nextQuestion() {
    if (hearts <= 0 || questionIndex >= questionQueue.length - 1) {
      setSessionElapsedMinutes(
        Math.max(1, Math.round((nowMs() - sessionStartedAt) / 60_000)),
      );
      setSessionComplete(true);
      play("complete");
      return;
    }
    setAnswer("");
    setScore(null);
    setFeedback("");
    setCorrectAnswer("");
    setRewards({ xp: 0, tokens: 0 });
    setRewardEligible(true);
    setSelectedOrderIds([]);
    setIdempotencyKey(crypto.randomUUID());
    setStartedAt(nowMs());
    setQuestionIndex((current) => current + 1);
  }

  function resetCurrentQuestion() {
    setAnswer("");
    setScore(null);
    setFeedback("");
    setCorrectAnswer("");
    setRewards({ xp: 0, tokens: 0 });
    setRewardEligible(true);
    setSelectedOrderIds([]);
    setIdempotencyKey(crypto.randomUUID());
    setStartedAt(nowMs());
  }

  function restartSession() {
    setQuestionQueue(questions.map((item) => item.id));
    setQuestionIndex(0);
    setHearts(5);
    setCombo(0);
    setSessionCorrect(0);
    setSessionXp(0);
    setSessionTokens(0);
    setSessionAnswered(0);
    setSessionComplete(false);
    setSessionStartedAt(nowMs());
    setSessionElapsedMinutes(1);
    resetCurrentQuestion();
  }

  function chooseOrderOption(optionId: string) {
    if (!question?.options || selectedOrderIds.includes(optionId) || score !== null) return;
    const nextIds = [...selectedOrderIds, optionId];
    setSelectedOrderIds(nextIds);
    setAnswer(
      nextIds
        .map((id) => question.options?.find((option) => option.id === id)?.text ?? "")
        .join(" "),
    );
  }

  function removeOrderOption(optionId: string) {
    if (!question?.options || score !== null) return;
    const index = selectedOrderIds.lastIndexOf(optionId);
    if (index < 0) return;
    const nextIds = selectedOrderIds.filter((_, itemIndex) => itemIndex !== index);
    setSelectedOrderIds(nextIds);
    setAnswer(
      nextIds
        .map((id) => question.options?.find((option) => option.id === id)?.text ?? "")
        .join(" "),
    );
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

  if (!lesson && kind === "vocabulary") {
    return (
      <Page title={title} description={description} icon={Icon}>
        <Card className="glass-panel interactive-lift">
          <CardHeader><CardTitle>{t("workspace.addWord")}</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <Input value={word} onChange={(event) => setWord(event.target.value)} placeholder={t("workspace.word")} />
            <Input value={meaning} onChange={(event) => setMeaning(event.target.value)} placeholder={t("workspace.meaning")} />
            <Button onClick={addWord} disabled={loading}><Plus /> {t("common.save")}</Button>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader><CardTitle>{t("workspace.savedWords", { count: data.vocabulary.length })}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.vocabulary.length ? data.vocabulary.map((item) => (
              <div key={item.id} className="interactive-lift flex items-center gap-3 rounded-2xl border bg-white/75 p-4">
                <div className="flex-1">
                  <p className="font-semibold">{item.word} <span className="font-normal text-muted-foreground">{item.phonetic}</span></p>
                  <p className="text-sm text-muted-foreground">{item.meaning_vi}</p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => deleteWord(item.id)}><Trash2 /></Button>
              </div>
            )) : <Empty text={t("workspace.noVocabulary")} />}
          </CardContent>
        </Card>
      </Page>
    );
  }

  if (!lesson && kind === "flashcards") {
    const card = data.vocabulary[cardIndex];
    return (
      <Page title={title} description={description} icon={Icon}>
        {card ? (
          <Card className="glass-panel interactive-lift mx-auto w-full max-w-2xl overflow-hidden">
            <CardContent className="wave-grid flex min-h-[390px] cursor-pointer flex-col items-center justify-center p-8 text-center" onClick={() => { play("tap"); setShowBack((value) => !value); }}>
              <Badge variant="secondary">{card.level || t("workspace.noLevel")}</Badge>
              <p className="mt-6 text-5xl font-bold tracking-tight">{card.word}</p>
              <p className="mt-3 text-muted-foreground">{showBack ? card.meaning_vi : t("workspace.tapMeaning")}</p>
              {showBack ? <div className="mt-8 flex flex-wrap justify-center gap-2">
                {(["again", "hard", "good", "easy"] as const).map((quality) => (
                  <Button key={quality} variant="outline" onClick={(event) => { event.stopPropagation(); reviewWord(card.id, quality); }}>{quality}</Button>
                ))}
              </div> : null}
            </CardContent>
          </Card>
        ) : <Empty text={t("workspace.flashcardEmpty")} />}
      </Page>
    );
  }

  if (!lesson && (kind === "writing" || kind === "translation")) {
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

  if (!lesson && kind === "progress") {
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
    <Page
      title={lesson?.title ?? title}
      description={lesson?.description ?? description}
      icon={Icon}
      compact={Boolean(lesson || challenge)}
    >
      {lesson ? (
        <Card className="overflow-hidden border-0 bg-gradient-to-r from-sky-600 via-cyan-500 to-blue-600 text-white">
          <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_280px] md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-sky-100">
                Checkpoint {lesson.position} · {lesson.level}
              </p>
              <h2 className="mt-1 text-2xl font-black">{lesson.title}</h2>
              <p className="mt-2 text-sm text-sky-50">{lesson.description}</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <div className="flex justify-between text-sm">
                <span>{t("workspace.mastery")}</span>
                <strong>{Math.round(lesson.mastery)}% / {lesson.unlockMastery}%</strong>
              </div>
              <Progress value={lesson.mastery} className="mt-2" />
              <p className="mt-2 text-xs text-sky-50">
                {t("workspace.passed", { passed: lesson.passedQuestions, total: Math.max(lesson.totalQuestions, questions.length), best: Math.round(lesson.bestScore) })}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
      {challenge ? (
        <Card className="overflow-hidden border-0 bg-gradient-to-r from-indigo-950 via-violet-900 to-indigo-800 text-white">
          <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-violet-200">Competition Arena</p>
              <h2 className="mt-1 text-2xl font-black">{challenge.title}</h2>
              <p className="mt-2 text-sm text-violet-100">{challenge.description}</p>
            </div>
            <div className="min-w-52 rounded-2xl bg-white/10 p-4 backdrop-blur">
              <div className="flex justify-between text-sm"><span>Tiến độ</span><strong>{challenge.progress}/{challenge.target}</strong></div>
              <Progress value={(challenge.progress / challenge.target) * 100} className="mt-2" />
              <p className="mt-2 text-xs text-violet-200">Cần tối thiểu {challenge.minScore} điểm mỗi câu.</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
      {sessionComplete ? (
        <Card className="relative mx-auto w-full max-w-4xl overflow-hidden border-0 bg-white/90 shadow-[0_28px_80px_-36px_rgba(14,116,144,0.55)]">
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500" />
          <CardContent className="grid gap-8 p-6 md:grid-cols-[1fr_260px] md:p-10">
            <div className="flex flex-col justify-center">
              <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Trophy className="size-7" />
              </div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
                {t("workspace.sessionComplete")}
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
                {sessionAccuracy >= 80
                  ? t("workspace.completeExcellent")
                  : sessionAccuracy >= 60
                    ? t("workspace.completeGood")
                    : t("workspace.completePractice")}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                {t("workspace.completeDescription")}
              </p>
              <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SessionMetric icon={Target} label={t("workspace.accuracy")} value={`${sessionAccuracy}%`} tone="sky" />
                <SessionMetric icon={CheckCircle2} label={t("workspace.correctAnswers")} value={`${sessionCorrect}/${sessionAnswered}`} tone="emerald" />
                <SessionMetric icon={Zap} label="XP" value={`+${sessionXp}`} tone="amber" />
                <SessionMetric icon={Clock3} label={t("workspace.studyTime")} value={t("roadmap.minutes", { count: sessionElapsedMinutes })} tone="violet" />
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button size="lg" onClick={restartSession}>
                  <RotateCcw /> {t("workspace.practiceAgain")}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push(lesson ? "/roadmap" : "/practice")}
                >
                  {lesson ? t("workspace.backRoadmap") : t("workspace.backPractice")}
                  <ArrowRight />
                </Button>
              </div>
            </div>
            <div className="quest-shine relative flex min-h-64 flex-col items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-100 via-cyan-50 to-indigo-100 p-6 text-center">
              <Image
                src={sessionAccuracy >= 70 ? "/mascot/lumo-celebration.gif" : "/mascot/lumo-encourage.png"}
                alt={t(sessionAccuracy >= 70 ? "mascot.celebrate" : "mascot.encourage")}
                width={180}
                height={180}
                unoptimized={sessionAccuracy >= 70}
                className="size-40 object-contain"
              />
              <p className="mt-2 text-sm font-bold text-sky-900">
                +{sessionTokens} Lingora Token
              </p>
              <p className="mt-1 text-xs text-sky-700">
                {t("workspace.savedProgressHint")}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : question ? (
        <Card className="mx-auto w-full max-w-4xl gap-0 overflow-hidden border border-white/80 bg-white/90 py-0 shadow-[0_24px_70px_-38px_rgba(14,116,144,0.65)] backdrop-blur-xl">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b bg-slate-50/90 px-5 py-4 md:px-7">
            <Progress
              value={Math.min(100, ((questionIndex + (score !== null ? 1 : 0)) / Math.max(questionQueue.length, 1)) * 100)}
            />
            <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-sm font-black text-rose-500">
              <Heart className="size-4 fill-current" /> {hearts}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-black text-amber-500">
              <Zap className="size-4 fill-current" /> {combo}
            </span>
          </div>
          <CardHeader className="px-5 pt-6 md:px-8 md:pt-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{question.difficulty}</Badge>
              <Badge variant="outline">{question.question_type}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                {t("workspace.question", { current: questionIndex + 1, total: questionQueue.length })}
              </span>
            </div>
            <CardTitle className="pt-4 text-xl font-black leading-snug md:text-2xl">
              {promptText(question.prompt, locale)}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 px-5 pb-7 md:px-8 md:pb-8">
            {question.passage ? <blockquote className="rounded-3xl border border-sky-100 bg-sky-50/80 p-5 leading-7">{question.passage}</blockquote> : null}
            {question.skill === "listening" ? <Button variant="outline" onClick={speakPassage}><Volume2 /> {t("workspace.playAudio")}</Button> : null}
            {question.skill === "speaking" ? (
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
            {question.question_type === "sentence_order" && question.options?.length ? (
              <div className="flex flex-col gap-4">
                <div className="flex min-h-20 flex-wrap content-start gap-2 rounded-3xl border-2 border-dashed border-sky-200 bg-sky-50/60 p-4 font-medium">
                  {selectedOrderIds.length
                    ? selectedOrderIds.map((id, index) => {
                        const option = question.options?.find((item) => item.id === id);
                        return (
                          <button
                            key={`${id}-${index}`}
                            type="button"
                            onClick={() => removeOrderOption(id)}
                            className="rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground shadow-sm"
                          >
                            {option?.text}
                          </button>
                        );
                      })
                    : <span className="text-sm font-normal text-muted-foreground">{t("workspace.orderHint")}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {question.options.map((option) => (
                    <Button
                      key={option.id}
                      variant="outline"
                      disabled={selectedOrderIds.includes(option.id) || score !== null}
                      onClick={() => chooseOrderOption(option.id)}
                    >
                      {option.text}
                    </Button>
                  ))}
                  <Button variant="ghost" disabled={score !== null} onClick={() => { setSelectedOrderIds([]); setAnswer(""); }}><RotateCcw /> {t("workspace.reorder")}</Button>
                </div>
              </div>
            ) : question.options?.length ? (
              <RadioGroup value={answer} onValueChange={(value) => setAnswer(value ?? "")}>
                {question.options.map((option) => (
                  <label key={option.id} className="interactive-lift flex cursor-pointer items-center gap-3 rounded-2xl border bg-white/75 p-4 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5">
                    <RadioGroupItem value={option.id} /> {option.text}
                  </label>
                ))}
              </RadioGroup>
            ) : (
              <Textarea value={answer} onChange={(event) => setAnswer(event.target.value)} className="min-h-32 bg-white/80" placeholder={question.skill === "speaking" ? t("workspace.voiceTranscript") : t("workspace.answer")} />
            )}
            {score !== null ? (
              <div className={`relative overflow-hidden rounded-3xl border p-5 ${score >= 70 ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-rose-200 bg-rose-50 text-rose-950"}`}>
                <div className="flex items-center gap-4">
                  <Image
                    src={score >= 70 ? "/mascot/lumo-celebration.gif" : "/mascot/lumo-encourage.png"}
                    alt={t(score >= 70 ? "mascot.celebrate" : "mascot.encourage")}
                    width={88}
                    height={88}
                    unoptimized={score >= 70}
                    className="size-20 object-contain"
                  />
                  <div>
                    <p className="text-lg font-black">
                      {score >= 70 ? t("workspace.correctFeedback") : t("workspace.incorrectFeedback")}
                    </p>
                    <p className="mt-1 text-sm">{t("workspace.savedScore", { score })}</p>
                    <p className="mt-1 text-sm font-semibold">
                      +{rewards.xp} XP · +{rewards.tokens} Lingora Token
                    </p>
                    {!rewardEligible ? (
                      <p className="mt-1 text-xs font-semibold text-amber-700">
                        {t("workspace.rewardLimited")}
                      </p>
                    ) : null}
                    {score < 70 && correctAnswer ? (
                      <p className="mt-2 text-sm font-semibold">
                        {t("workspace.correctAnswer", { answer: correctAnswer })}
                      </p>
                    ) : null}
                    {feedback ? <p className="mt-2 text-sm font-normal leading-6 opacity-80">{feedback}</p> : null}
                  </div>
                </div>
              </div>
            ) : null}
            <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center">
              {score === null ? (
                <>
                  <Button variant="outline" size="lg" onClick={resetCurrentQuestion}>
                    <RotateCcw /> {t("common.retry")}
                  </Button>
                  <Button className="sm:ml-auto sm:min-w-44" size="lg" onClick={submitAttempt} disabled={!answer.trim() || loading || hearts <= 0}>
                    {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                    {t("workspace.submit")}
                  </Button>
                </>
              ) : (
                <Button className="sm:ml-auto sm:min-w-44" size="lg" onClick={nextQuestion}>
                  {hearts <= 0 || questionIndex >= questionQueue.length - 1
                    ? t("workspace.finishSession")
                    : t("workspace.next")}
                  <ArrowRight />
                </Button>
              )}
            </div>
            <p className="text-center text-xs text-muted-foreground sm:text-left">
              {t("workspace.sessionCorrect", {
                correct: sessionCorrect,
                total: sessionAnswered,
              })}
            </p>
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
  compact = false,
}: {
  title: string;
  description: string;
  icon: typeof BookOpen;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const { t } = useLocale();
  if (compact) {
    return <div className="flex flex-col gap-6">{children}</div>;
  }
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
              {t("workspace.dailyHabit")}
            </span>
            <span className="rounded-2xl bg-white/15 px-4 py-3 text-sm backdrop-blur">
              <Target className="mb-1 size-4" />
              {t("workspace.dataProgress")}
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

function SessionMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  tone: "sky" | "emerald" | "amber" | "violet";
}) {
  const tones = {
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <div className={`rounded-2xl p-3 ${tones[tone]}`}>
      <Icon className="size-4" />
      <strong className="mt-2 block text-lg">{value}</strong>
      <span className="text-[11px] font-medium opacity-75">{label}</span>
    </div>
  );
}
