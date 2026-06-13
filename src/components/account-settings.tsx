"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, useRef, useState } from "react";
import {
  BellRing,
  BrainCircuit,
  Camera,
  Clock3,
  Globe2,
  Headphones,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import type { Viewer } from "@/lib/auth";
import { localeNames, type Locale } from "@/lib/i18n";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/components/locale-provider";
import { Switch } from "@/components/ui/switch";

type Preferences = {
  emailReminders: boolean;
  dailyReminder: boolean;
  weeklySummary: boolean;
  autoPlayAudio: boolean;
  showMascot: boolean;
  compactMode: boolean;
};

export function AccountSettings({
  viewer,
  initial,
}: {
  viewer: Viewer;
  initial: {
    learningGoal: string;
    dailyGoalMinutes: number;
    aiTrainingConsent: boolean;
    preferences: Preferences;
  };
}) {
  const router = useRouter();
  const { setLocale: setAppLocale } = useLocale();
  const [fullName, setFullName] = useState(viewer.fullName);
  const [locale, setLocale] = useState<Locale>(viewer.locale as Locale);
  const [goal, setGoal] = useState(initial.learningGoal);
  const [minutes, setMinutes] = useState(initial.dailyGoalMinutes);
  const [consent, setConsent] = useState(initial.aiTrainingConsent);
  const [preferences, setPreferences] = useState(initial.preferences);
  const [avatarUrl, setAvatarUrl] = useState(viewer.avatarUrl);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updatePreference(key: keyof Preferences, value: boolean) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Chỉ hỗ trợ JPG, PNG, WebP hoặc GIF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh đại diện không được vượt quá 5 MB.");
      return;
    }
    const preview = URL.createObjectURL(file);
    setAvatarUrl(preview);
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.set("avatar", file);
    const response = await fetch("/api/profile/avatar", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json()) as { avatarUrl?: string; error?: string };
    setUploadingAvatar(false);
    URL.revokeObjectURL(preview);
    event.target.value = "";
    if (!response.ok || !data.avatarUrl) {
      setAvatarUrl(viewer.avatarUrl);
      return toast.error(data.error ?? "Không thể tải ảnh đại diện.");
    }
    setAvatarUrl(data.avatarUrl);
    toast.success("Đã cập nhật ảnh đại diện.");
    router.refresh();
  }

  async function save() {
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        locale,
        learningGoal: goal,
        dailyGoalMinutes: minutes,
        aiTrainingConsent: consent,
        preferences,
      }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) return toast.error(data.error ?? "Không thể lưu.");
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    setAppLocale(locale);
    toast.success("Đã lưu hồ sơ.");
    router.refresh();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <Card className="overflow-hidden border-white/80 bg-white/90 shadow-lg shadow-sky-100/70">
        <CardHeader className="border-b bg-gradient-to-r from-sky-50 to-white">
          <CardTitle className="flex items-center gap-2">
            <UserRound className="size-5 text-primary" /> Hồ sơ học tập
          </CardTitle>
          <CardDescription>
            Lingora dùng mục tiêu và thời gian để điều chỉnh lộ trình.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 p-5 md:p-6">
          <div className="flex flex-col gap-5 rounded-3xl border border-sky-100 bg-sky-50/60 p-5 sm:flex-row sm:items-center">
            <div className="relative size-28 shrink-0 overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-200 to-indigo-200 shadow-lg ring-4 ring-white">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={fullName}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-3xl font-black text-sky-800">
                  {fullName.slice(0, 1).toUpperCase()}
                </span>
              )}
              {uploadingAvatar ? (
                <span className="absolute inset-0 flex items-center justify-center bg-slate-950/45 text-white">
                  <Loader2 className="animate-spin" />
                </span>
              ) : null}
            </div>
            <div>
              <p className="text-lg font-black">Ảnh đại diện của bạn</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                JPG, PNG, WebP hoặc GIF. Kích thước tối đa 5 MB.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={uploadAvatar}
              />
              <Button
                type="button"
                variant="outline"
                className="mt-3 bg-white"
                disabled={uploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingAvatar ? <Loader2 className="animate-spin" /> : <Camera />}
                Chọn ảnh mới
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="full-name" className="text-sm font-medium">Họ và tên</label>
            <Input id="full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Ngôn ngữ hệ thống</label>
            <Select value={locale} onValueChange={(value) => setLocale((value ?? "vi") as Locale)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Language</SelectLabel>
                  {(Object.keys(localeNames) as Locale[]).map((item) => (
                    <SelectItem key={item} value={item}>{localeNames[item]}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          </div>
          <div className="grid gap-2">
            <label htmlFor="goal" className="text-sm font-medium">Mục tiêu</label>
            <Textarea id="goal" value={goal} onChange={(event) => setGoal(event.target.value)} />
          </div>
          <div className="grid gap-2 md:max-w-xs">
            <label htmlFor="minutes" className="text-sm font-medium">Phút học mỗi ngày</label>
            <Input
              id="minutes"
              type="number"
              min={5}
              max={240}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
            />
          </div>
          <Button className="self-start" onClick={save}><Save data-icon="inline-start" /> Lưu hồ sơ</Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-5">
        <Card className="overflow-hidden border-white/80 bg-white/90 shadow-lg shadow-sky-100/70">
          <CardHeader className="border-b bg-slate-50/70">
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="size-5 text-amber-500" /> Nhắc học và nội dung
            </CardTitle>
            <CardDescription>
              Chọn loại thông báo và cách phát nội dung trong quá trình học.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-5">
            <PreferenceToggle
              icon={Mail}
              title="Cho phép email nhắc học"
              description="Nhận thông báo học tập qua email tài khoản."
              checked={preferences.emailReminders}
              onChange={(value) => updatePreference("emailReminders", value)}
            />
            <PreferenceToggle
              icon={Clock3}
              title="Nhắc mục tiêu hằng ngày"
              description="Hiển thị lời nhắc khi chưa đạt số phút học."
              checked={preferences.dailyReminder}
              onChange={(value) => updatePreference("dailyReminder", value)}
            />
            <PreferenceToggle
              icon={BellRing}
              title="Báo cáo tiến độ hằng tuần"
              description="Tóm tắt XP, kỹ năng và chặng đã hoàn thành."
              checked={preferences.weeklySummary}
              onChange={(value) => updatePreference("weeklySummary", value)}
            />
            <PreferenceToggle
              icon={Headphones}
              title="Tự phát âm thanh bài nghe"
              description="Phát nội dung nghe khi mở câu hỏi mới."
              checked={preferences.autoPlayAudio}
              onChange={(value) => updatePreference("autoPlayAudio", value)}
            />
            <Button variant="outline" onClick={save}>
              <Save /> Lưu tùy chọn
            </Button>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-white/80 bg-white/90 shadow-lg shadow-sky-100/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BrainCircuit className="size-5 text-primary" /> Cải thiện Lingora AI
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <label className="flex items-start gap-3 rounded-2xl border bg-white/70 p-4">
              <Checkbox
                checked={consent}
                onCheckedChange={(checked) => setConsent(Boolean(checked))}
              />
              <span>
                <span className="block text-sm font-semibold">
                  Cho phép dùng feedback đã khử định danh
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  Chỉ feedback bạn chủ động gửi mới được xét vào dataset. Có thể
                  tắt bất kỳ lúc nào.
                </span>
              </span>
            </label>
            <Alert>
              <ShieldCheck />
              <AlertTitle>Privacy-first</AlertTitle>
              <AlertDescription>
                Email, user id và dữ liệu nhận dạng không được đưa vào training candidate.
              </AlertDescription>
            </Alert>
            <Button variant="outline" onClick={save}>Cập nhật consent</Button>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-white/80 bg-white/90 shadow-lg shadow-sky-100/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe2 className="size-5 text-primary" /> Hỗ trợ đa ngôn ngữ
            </CardTitle>
            <CardDescription>
              Tiếng Việt, English, 日本語 và ไทย cho điều hướng; nội dung học vẫn
              ưu tiên giải thích theo ngôn ngữ bạn chọn.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

function PreferenceToggle({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: typeof Mail;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border bg-white p-3.5 transition hover:border-sky-200">
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          <Icon className="size-4" />
        </span>
        <span>
          <span className="block text-sm font-semibold">{title}</span>
          <span className="block text-xs leading-5 text-muted-foreground">
            {description}
          </span>
        </span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
