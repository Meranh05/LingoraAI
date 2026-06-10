"use client";

import { useState } from "react";
import { BrainCircuit, Globe2, Save, ShieldCheck, UserRound } from "lucide-react";
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

export function AccountSettings({
  viewer,
  initial,
}: {
  viewer: Viewer;
  initial: {
    learningGoal: string;
    dailyGoalMinutes: number;
    aiTrainingConsent: boolean;
  };
}) {
  const { setLocale: setAppLocale } = useLocale();
  const [fullName, setFullName] = useState(viewer.fullName);
  const [locale, setLocale] = useState<Locale>(viewer.locale as Locale);
  const [goal, setGoal] = useState(initial.learningGoal);
  const [minutes, setMinutes] = useState(initial.dailyGoalMinutes);
  const [consent, setConsent] = useState(initial.aiTrainingConsent);

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
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="size-5 text-primary" /> Hồ sơ học tập
          </CardTitle>
          <CardDescription>
            Lingora dùng mục tiêu và thời gian để điều chỉnh lộ trình.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
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
          <div className="grid gap-2">
            <label htmlFor="goal" className="text-sm font-medium">Mục tiêu</label>
            <Textarea id="goal" value={goal} onChange={(event) => setGoal(event.target.value)} />
          </div>
          <div className="grid gap-2">
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
          <Button onClick={save}><Save data-icon="inline-start" /> Lưu hồ sơ</Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-5">
        <Card className="glass-panel">
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
        <Card className="glass-panel">
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
