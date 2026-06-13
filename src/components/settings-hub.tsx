"use client";

import { useState } from "react";
import type { Viewer } from "@/lib/auth";
import { AiSettings } from "@/components/ai-settings";
import { AccountSettings } from "@/components/account-settings";
import { PermissionDiagnostics } from "@/components/permission-diagnostics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/components/locale-provider";
import { useExperience } from "@/components/experience-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  BellRing,
  LayoutPanelTop,
  Sparkles,
  Volume2,
  WandSparkles,
} from "lucide-react";

type Preferences = {
  emailReminders: boolean;
  dailyReminder: boolean;
  weeklySummary: boolean;
  autoPlayAudio: boolean;
  showMascot: boolean;
  compactMode: boolean;
};

export function SettingsHub({
  viewer,
  profile,
}: {
  viewer: Viewer;
  profile: {
    learningGoal: string;
    dailyGoalMinutes: number;
    aiTrainingConsent: boolean;
    preferences: Preferences;
  };
}) {
  const { t } = useLocale();
  const {
    soundEnabled,
    motionEnabled,
    setSoundEnabled,
    setMotionEnabled,
    showMascot,
    compactMode,
    setShowMascot,
    setCompactMode,
    play,
  } = useExperience();
  const [experiencePreferences, setExperiencePreferences] = useState(
    profile.preferences,
  );

  async function persistExperiencePreference(
    key: "showMascot" | "compactMode",
    value: boolean,
  ) {
    const next = { ...experiencePreferences, [key]: value };
    setExperiencePreferences(next);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferences: next,
      }),
    });
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-r from-sky-600 via-cyan-500 to-blue-600 p-6 text-white shadow-xl shadow-sky-200/50">
        <p className="text-sm font-semibold text-sky-100">Trung tâm cá nhân hóa</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Cài đặt Lingora</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-50">
          Tùy chỉnh hồ sơ, trải nghiệm học, quyền trình duyệt và mô hình AI theo cách bạn muốn.
        </p>
      </div>
      <Card className="overflow-hidden border-white/80 bg-white/85 shadow-lg shadow-sky-100/60">
        <CardHeader className="border-b bg-slate-50/70">
          <CardTitle>{t("settings.experience")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-5 md:grid-cols-2">
          <SettingToggle
            icon={Volume2}
            title={t("settings.sound")}
            description={t("settings.soundDescription")}
            checked={soundEnabled}
            onCheckedChange={(checked) => {
              setSoundEnabled(checked);
              if (checked) window.setTimeout(() => play("success"), 0);
            }}
          />
          <SettingToggle
            icon={Sparkles}
            title={t("settings.motion")}
            description={t("settings.motionDescription")}
            checked={motionEnabled}
            onCheckedChange={setMotionEnabled}
          />
          <SettingToggle
            icon={WandSparkles}
            title="Hiển thị linh vật Lumo"
            description="Cho phép Lumo đồng hành và mở chat nhanh ở các màn học."
            checked={showMascot}
            onCheckedChange={(checked) => {
              setShowMascot(checked);
              void persistExperiencePreference("showMascot", checked);
            }}
          />
          <SettingToggle
            icon={LayoutPanelTop}
            title="Giao diện thu gọn"
            description="Giảm khoảng cách để hiển thị nhiều nội dung hơn."
            checked={compactMode}
            onCheckedChange={(checked) => {
              setCompactMode(checked);
              void persistExperiencePreference("compactMode", checked);
            }}
          />
        </CardContent>
      </Card>
      <Tabs defaultValue="account">
      <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-2xl bg-white/80 p-1.5 shadow-sm">
        <TabsTrigger value="account">Hồ sơ & tùy chọn</TabsTrigger>
        <TabsTrigger value="ai">{t("settings.ai")}</TabsTrigger>
        <TabsTrigger value="diagnostics">{t("settings.diagnostics")}</TabsTrigger>
      </TabsList>
      <TabsContent value="account" className="pt-5">
        <AccountSettings
          viewer={viewer}
          initial={{
            ...profile,
            preferences: {
            ...profile.preferences,
              ...experiencePreferences,
              showMascot,
              compactMode,
            },
          }}
        />
      </TabsContent>
      <TabsContent value="ai" className="pt-5">
        <AiSettings />
      </TabsContent>
      <TabsContent value="diagnostics" className="pt-5">
        <PermissionDiagnostics />
      </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingToggle({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  icon: typeof BellRing;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-200 hover:shadow-sm">
            <span className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          <Icon className="size-5" />
        </span>
              <span>
          <span className="block text-sm font-semibold">{title}</span>
                <span className="text-xs text-muted-foreground">
            {description}
                </span>
              </span>
            </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}
