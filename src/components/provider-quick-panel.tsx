"use client";

import Link from "next/link";
import { CheckCircle2, Cpu, Settings2, WandSparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocale } from "@/components/locale-provider";

export function ProviderQuickPanel() {
  const { t } = useLocale();
  return (
    <Card className="glass-panel">
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Cpu className="size-5" />
          </span>
          <Badge variant="secondary">
            <CheckCircle2 data-icon="inline-start" />
            Auto Detect
          </Badge>
        </div>
        <CardTitle>{t("provider.title")}</CardTitle>
        <CardDescription>
          {t("provider.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-2xl border bg-white/75 p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <WandSparkles className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">{t("provider.auto")}</p>
              <p className="text-xs text-muted-foreground">
                Gemini · Groq · OpenAI · OpenRouter · Anthropic
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          {t("provider.privacy")}
        </p>
        <Button nativeButton={false} variant="outline" render={<Link href="/settings" />}>
          <Settings2 data-icon="inline-start" />
          {t("provider.configure")}
        </Button>
      </CardContent>
    </Card>
  );
}
