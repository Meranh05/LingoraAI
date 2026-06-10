"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  Flag,
  Layers3,
  Loader2,
  Plus,
  Route,
  Sparkles,
  Trash2,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Localized = Record<string, string>;
type StudioData = {
  paths: Array<{ id: string; slug: string; title: Localized; target_level: string; is_published: boolean; estimated_hours: number }>;
  units: Array<{ id: string; path_id: string; position: number; title: Localized; skill: string; level: string; estimated_minutes: number }>;
  questions: Array<{ id: string; unit_id: string | null; skill: string; question_type: string; prompt: Localized; difficulty: string; is_public: boolean }>;
  challenges: Array<{ id: string; slug: string; title: Localized; challenge_type: string; difficulty: string; target_value: number; points_reward: number; token_reward: number; badge_icon: string; level_required: number; is_published: boolean; starts_at: string; ends_at: string }>;
};

const skills = ["reading", "writing", "listening", "speaking", "vocabulary", "grammar"];
const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

function text(value: Localized) {
  return value?.vi ?? value?.en ?? "";
}

export function AdminContentStudio({
  stats,
  studio,
}: {
  stats: { paths: number; units: number; questions: number; documents: number };
  studio: StudioData;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<string>();

  async function create(kind: string, payload: Record<string, unknown>) {
    setSaving(kind);
    const response = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, ...payload }),
    });
    const result = (await response.json()) as { error?: string };
    setSaving(undefined);
    if (!response.ok) return toast.error(result.error ?? "Không thể lưu nội dung.");
    toast.success("Đã tạo và lưu vào Supabase.");
    router.refresh();
  }

  async function toggle(table: string, id: string, published: boolean) {
    const response = await fetch("/api/admin/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, id, published }),
    });
    if (!response.ok) return toast.error("Không thể cập nhật trạng thái.");
    toast.success(published ? "Đã xuất bản." : "Đã chuyển về bản nháp.");
    router.refresh();
  }

  async function remove(table: string, id: string, label: string) {
    if (!window.confirm(`Xóa "${label}"? Dữ liệu liên quan có thể bị xóa theo.`)) return;
    const response = await fetch("/api/admin/content", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, id }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) return toast.error(result.error ?? "Không thể xóa nội dung.");
    toast.success("Đã xóa nội dung.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-indigo-950 to-cyan-900 p-7 text-white">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-cyan-300"><Sparkles className="size-4" /> Content Studio</p>
            <h1 className="mt-2 text-3xl font-bold">Thiết kế hành trình học</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Tạo level, checkpoint, câu hỏi và thử thách thật. Nội dung chỉ xuất hiện với user sau khi admin bật xuất bản.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <HeroMetric value={stats.paths} label="Lộ trình" />
            <HeroMetric value={stats.units} label="Checkpoint" />
            <HeroMetric value={stats.questions} label="Câu hỏi" />
          </div>
        </div>
      </section>

      <Tabs defaultValue="paths">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="paths"><Route /> Lộ trình</TabsTrigger>
          <TabsTrigger value="units"><Flag /> Checkpoint</TabsTrigger>
          <TabsTrigger value="questions"><BrainCircuit /> Câu hỏi</TabsTrigger>
          <TabsTrigger value="challenges"><Trophy /> Thử thách</TabsTrigger>
        </TabsList>

        <TabsContent value="paths" className="pt-5">
          <TwoColumn>
            <CreatePathForm saving={saving === "path"} onCreate={(payload) => create("path", payload)} />
            <ContentList
              title="Lộ trình hiện có"
              empty="Chưa có lộ trình."
              rows={studio.paths.map((path) => ({
                id: path.id,
                title: text(path.title),
                subtitle: `${path.target_level} · ${path.estimated_hours} giờ · ${path.slug}`,
                published: path.is_published,
                table: "learning_paths",
              }))}
              onToggle={toggle}
              onDelete={remove}
            />
          </TwoColumn>
        </TabsContent>

        <TabsContent value="units" className="pt-5">
          <TwoColumn>
            <CreateUnitForm paths={studio.paths} saving={saving === "unit"} onCreate={(payload) => create("unit", payload)} />
            <Card>
              <CardHeader><CardTitle>Checkpoint theo lộ trình</CardTitle></CardHeader>
              <CardContent className="flex max-h-[620px] flex-col gap-2 overflow-y-auto">
                {studio.units.map((unit) => (
                  <div key={unit.id} className="flex items-center gap-3 rounded-xl border p-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-cyan-50 font-bold text-cyan-700">{unit.position}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{text(unit.title)}</p>
                      <p className="text-xs text-muted-foreground">{unit.skill} · {unit.level} · {unit.estimated_minutes} phút</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove("learning_units", unit.id, text(unit.title))}
                      aria-label={`Xóa ${text(unit.title)}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TwoColumn>
        </TabsContent>

        <TabsContent value="questions" className="pt-5">
          <TwoColumn>
            <CreateQuestionForm units={studio.units} paths={studio.paths} saving={saving === "question"} onCreate={(payload) => create("question", payload)} />
            <ContentList
              title="Ngân hàng câu hỏi"
              empty="Chưa có câu hỏi."
              rows={studio.questions.map((question) => ({
                id: question.id,
                title: text(question.prompt),
                subtitle: `${question.skill} · ${question.question_type} · ${question.difficulty}`,
                published: question.is_public,
                table: "practice_questions",
              }))}
              onToggle={toggle}
              onDelete={remove}
            />
          </TwoColumn>
        </TabsContent>

        <TabsContent value="challenges" className="pt-5">
          <TwoColumn>
            <CreateChallengeForm saving={saving === "challenge"} onCreate={(payload) => create("challenge", payload)} />
            <ContentList
              title="Thử thách đang cấu hình"
              empty="Chưa có thử thách."
              rows={studio.challenges.map((challenge) => ({
                id: challenge.id,
                title: text(challenge.title),
                subtitle: `${challenge.challenge_type} · ${challenge.difficulty} · ${challenge.target_value} mục tiêu · +${challenge.points_reward} XP · +${challenge.token_reward} token`,
                published: challenge.is_published,
                table: "learning_challenges",
              }))}
              onToggle={toggle}
              onDelete={remove}
            />
          </TwoColumn>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreatePathForm({ saving, onCreate }: { saving: boolean; onCreate: (value: Record<string, unknown>) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onCreate({
      slug: data.get("slug"), titleVi: data.get("titleVi"), titleEn: data.get("titleEn"),
      descriptionVi: data.get("descriptionVi"), targetLevel: data.get("targetLevel"),
      estimatedHours: data.get("estimatedHours"), published: data.get("published") === "on",
    });
  }
  return <FormCard title="Tạo lộ trình mới" description="Khung lớn chứa nhiều checkpoint theo level."><form onSubmit={submit} className="grid gap-4"><Field label="Slug"><Input name="slug" placeholder="english-adventure-b1" required /></Field><Field label="Tên tiếng Việt"><Input name="titleVi" required /></Field><Field label="Tên tiếng Anh"><Input name="titleEn" /></Field><Field label="Mô tả"><Textarea name="descriptionVi" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Level đích"><NativeSelect name="targetLevel" values={levels} /></Field><Field label="Số giờ"><Input name="estimatedHours" type="number" defaultValue="20" min="1" /></Field></div><PublishSwitch /><Submit saving={saving} label="Tạo lộ trình" /></form></FormCard>;
}

function CreateUnitForm({ paths, saving, onCreate }: { paths: StudioData["paths"]; saving: boolean; onCreate: (value: Record<string, unknown>) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    onCreate({ pathId: data.get("pathId"), position: data.get("position"), titleVi: data.get("titleVi"), descriptionVi: data.get("descriptionVi"), skill: data.get("skill"), level: data.get("level"), estimatedMinutes: data.get("estimatedMinutes") });
  }
  return <FormCard title="Thêm checkpoint / level" description="Mỗi checkpoint nằm trong một lộ trình và có kỹ năng riêng."><form onSubmit={submit} className="grid gap-4"><Field label="Lộ trình"><select name="pathId" required className="h-9 rounded-md border bg-transparent px-3 text-sm">{paths.map((path) => <option key={path.id} value={path.id}>{text(path.title)}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Vị trí"><Input name="position" type="number" min="1" required /></Field><Field label="Level"><NativeSelect name="level" values={levels} /></Field></div><Field label="Tên checkpoint"><Input name="titleVi" required /></Field><Field label="Mô tả"><Textarea name="descriptionVi" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Kỹ năng"><NativeSelect name="skill" values={skills} /></Field><Field label="Số phút"><Input name="estimatedMinutes" type="number" defaultValue="15" min="1" /></Field></div><Submit saving={saving} label="Thêm checkpoint" /></form></FormCard>;
}

function CreateQuestionForm({ units, paths, saving, onCreate }: { units: StudioData["units"]; paths: StudioData["paths"]; saving: boolean; onCreate: (value: Record<string, unknown>) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    onCreate({ unitId: data.get("unitId"), promptVi: data.get("promptVi"), explanationVi: data.get("explanationVi"), passage: data.get("passage"), audioUrl: data.get("audioUrl"), skill: data.get("skill"), questionType: data.get("questionType"), difficulty: data.get("difficulty"), options: String(data.get("options") || "").split("\n").map((item) => item.trim()).filter(Boolean), answer: data.get("answer"), published: data.get("published") === "on" });
  }
  return <FormCard title="Custom câu hỏi theo level" description="Gắn trực tiếp câu hỏi vào checkpoint và tự thêm vào pool thử thách phù hợp."><form onSubmit={submit} className="grid gap-4"><Field label="Checkpoint"><select name="unitId" required className="h-9 rounded-md border bg-transparent px-3 text-sm">{units.map((unit) => <option key={unit.id} value={unit.id}>{text(paths.find((path) => path.id === unit.path_id)?.title ?? {})} / {unit.position}. {text(unit.title)}</option>)}</select></Field><div className="grid grid-cols-3 gap-3"><Field label="Level"><NativeSelect name="difficulty" values={levels} /></Field><Field label="Kỹ năng"><NativeSelect name="skill" values={skills} /></Field><Field label="Loại"><NativeSelect name="questionType" values={["multiple_choice","true_false","fill_blank","match_meaning","sentence_order","short_answer","essay","dictation","speaking"]} /></Field></div><Field label="Câu hỏi"><Textarea name="promptVi" required /></Field><Field label="Đoạn đọc / ngữ cảnh"><Textarea name="passage" /></Field><Field label="Audio URL"><Input name="audioUrl" type="url" placeholder="https://..." /></Field><Field label="Lựa chọn, mỗi dòng một đáp án"><Textarea name="options" placeholder={"Option A\nOption B\nOption C"} /></Field><Field label="Đáp án đúng / câu hoàn chỉnh"><Input name="answer" required /></Field><Field label="Giải thích"><Textarea name="explanationVi" /></Field><PublishSwitch /><Submit saving={saving} label="Thêm câu hỏi" /></form></FormCard>;
}

function CreateChallengeForm({ saving, onCreate }: { saving: boolean; onCreate: (value: Record<string, unknown>) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    onCreate({ slug: data.get("slug"), titleVi: data.get("titleVi"), descriptionVi: data.get("descriptionVi"), challengeType: data.get("challengeType"), difficulty: data.get("difficulty"), eventType: data.get("eventType") || undefined, skill: data.get("skill") || undefined, target: data.get("target"), pointsReward: data.get("pointsReward"), tokenReward: data.get("tokenReward"), levelRequired: data.get("levelRequired"), badgeIcon: data.get("badgeIcon"), durationDays: data.get("durationDays"), published: data.get("published") === "on" });
  }
  return <FormCard title="Tạo thử thách mới" description="Daily, weekly, boss hoặc thử thách cộng đồng."><form onSubmit={submit} className="grid gap-4"><Field label="Slug"><Input name="slug" placeholder="boss-speaking-master" required /></Field><Field label="Tên thử thách"><Input name="titleVi" required /></Field><Field label="Mô tả"><Textarea name="descriptionVi" required /></Field><div className="grid grid-cols-2 gap-3"><Field label="Loại"><NativeSelect name="challengeType" values={["daily","weekly","boss","community"]} /></Field><Field label="Độ khó"><NativeSelect name="difficulty" values={["easy","normal","hard","legendary"]} /></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Event type"><Input name="eventType" placeholder="practice_attempt" /></Field><Field label="Kỹ năng"><NativeSelect name="skill" values={["", ...skills]} /></Field></div><div className="grid grid-cols-3 gap-3"><Field label="Mục tiêu"><Input name="target" type="number" defaultValue="5" min="1" /></Field><Field label="XP"><Input name="pointsReward" type="number" defaultValue="100" min="0" /></Field><Field label="Token"><Input name="tokenReward" type="number" defaultValue="10" min="0" /></Field></div><div className="grid grid-cols-3 gap-3"><Field label="Level yêu cầu"><Input name="levelRequired" type="number" defaultValue="1" min="1" /></Field><Field label="Số ngày"><Input name="durationDays" type="number" defaultValue="7" min="1" /></Field><Field label="Icon"><NativeSelect name="badgeIcon" values={["trophy","crown","headphones","microphone","cards","book","flame","star"]} /></Field></div><PublishSwitch /><Submit saving={saving} label="Tạo thử thách" /></form></FormCard>;
}

function ContentList({ title, empty, rows, onToggle, onDelete }: { title: string; empty: string; rows: Array<{ id: string; title: string; subtitle: string; published: boolean; table: string }>; onToggle: (table: string, id: string, published: boolean) => void; onDelete: (table: string, id: string, label: string) => void }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{rows.length} mục</CardDescription></CardHeader><CardContent className="flex max-h-[680px] flex-col gap-2 overflow-y-auto">{rows.length ? rows.map((row) => <div key={row.id} className="flex items-center gap-3 rounded-xl border p-3"><span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${row.published ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>{row.published ? <CheckCircle2 className="size-4" /> : <Layers3 className="size-4" />}</span><div className="min-w-0 flex-1"><p className="line-clamp-2 font-semibold">{row.title}</p><p className="text-xs text-muted-foreground">{row.subtitle}</p></div><div className="flex items-center gap-2"><Badge variant={row.published ? "secondary" : "outline"}>{row.published ? "Published" : "Draft"}</Badge><Switch checked={row.published} onCheckedChange={(checked) => onToggle(row.table, row.id, checked)} /><Button variant="ghost" size="icon-sm" onClick={() => onDelete(row.table, row.id, row.title)} aria-label={`Xóa ${row.title}`}><Trash2 /></Button></div></div>) : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{empty}</p>}</CardContent></Card>;
}

function HeroMetric({ value, label }: { value: number; label: string }) { return <div className="rounded-2xl bg-white/10 px-4 py-3"><p className="text-2xl font-bold">{value}</p><p className="text-[11px] text-cyan-200">{label}</p></div>; }
function TwoColumn({ children }: { children: React.ReactNode }) { return <div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]">{children}</div>; }
function FormCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) { return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="size-5 text-cyan-600" />{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{children}</CardContent></Card>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-sm font-medium">{label}{children}</label>; }
function NativeSelect({ name, values }: { name: string; values: string[] }) { return <select name={name} className="h-9 rounded-md border bg-transparent px-3 text-sm">{values.map((value) => <option key={value || "all"} value={value}>{value || "Tất cả"}</option>)}</select>; }
function PublishSwitch() { return <label className="flex items-center justify-between rounded-xl border p-3 text-sm"><span><strong className="block">Xuất bản ngay</strong><span className="text-xs text-muted-foreground">User có thể sử dụng sau khi lưu.</span></span><Switch name="published" defaultChecked /></label>; }
function Submit({ saving, label }: { saving: boolean; label: string }) { return <Button type="submit" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <BookOpenCheck />}{label}</Button>; }
