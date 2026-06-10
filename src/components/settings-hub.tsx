"use client";

import type { Viewer } from "@/lib/auth";
import { AiSettings } from "@/components/ai-settings";
import { AccountSettings } from "@/components/account-settings";
import { PermissionDiagnostics } from "@/components/permission-diagnostics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/components/locale-provider";
import { useExperience } from "@/components/experience-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Volume2 } from "lucide-react";

export function SettingsHub({
  viewer,
  profile,
}: {
  viewer: Viewer;
  profile: {
    learningGoal: string;
    dailyGoalMinutes: number;
    aiTrainingConsent: boolean;
  };
}) {
  const { t } = useLocale();
  const {
    soundEnabled,
    motionEnabled,
    setSoundEnabled,
    setMotionEnabled,
    play,
  } = useExperience();
  return (
    <div className="flex flex-col gap-6">
      <Card className="glass-panel overflow-hidden">
        <CardHeader>
          <CardTitle>Trải nghiệm ứng dụng</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center justify-between gap-4 rounded-2xl border bg-white/70 p-4">
            <span className="flex items-center gap-3">
              <Volume2 className="size-5 text-primary" />
              <span>
                <span className="block text-sm font-semibold">Hiệu ứng âm thanh</span>
                <span className="text-xs text-muted-foreground">
                  Phản hồi khi hoàn thành, đúng hoặc có lỗi.
                </span>
              </span>
            </span>
            <Switch
              checked={soundEnabled}
              onCheckedChange={(checked) => {
                setSoundEnabled(checked);
                if (checked) window.setTimeout(() => play("success"), 0);
              }}
            />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-2xl border bg-white/70 p-4">
            <span className="flex items-center gap-3">
              <Sparkles className="size-5 text-primary" />
              <span>
                <span className="block text-sm font-semibold">Chuyển động giao diện</span>
                <span className="text-xs text-muted-foreground">
                  Animation nhẹ khi mở trang và tương tác.
                </span>
              </span>
            </span>
            <Switch checked={motionEnabled} onCheckedChange={setMotionEnabled} />
          </label>
        </CardContent>
      </Card>
      <Tabs defaultValue="account">
      <TabsList>
        <TabsTrigger value="account">{t("settings.account")}</TabsTrigger>
        <TabsTrigger value="ai">{t("settings.ai")}</TabsTrigger>
        <TabsTrigger value="diagnostics">{t("settings.diagnostics")}</TabsTrigger>
      </TabsList>
      <TabsContent value="account" className="pt-5">
        <AccountSettings viewer={viewer} initial={profile} />
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
