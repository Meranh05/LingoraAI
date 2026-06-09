"use client";

import type { Viewer } from "@/lib/auth";
import { AiSettings } from "@/components/ai-settings";
import { AccountSettings } from "@/components/account-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  return (
    <Tabs defaultValue="account">
      <TabsList>
        <TabsTrigger value="account">Tài khoản & quyền riêng tư</TabsTrigger>
        <TabsTrigger value="ai">Model AI</TabsTrigger>
      </TabsList>
      <TabsContent value="account" className="pt-5">
        <AccountSettings viewer={viewer} initial={profile} />
      </TabsContent>
      <TabsContent value="ai" className="pt-5">
        <AiSettings />
      </TabsContent>
    </Tabs>
  );
}
