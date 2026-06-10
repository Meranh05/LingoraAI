"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Cloud,
  Cookie,
  KeyRound,
  Mic2,
  RefreshCw,
  ShieldCheck,
  Speech,
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

type Check = {
  label: string;
  value: string;
  ok: boolean;
  icon: typeof ShieldCheck;
};

export function PermissionDiagnostics() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [checking, setChecking] = useState(false);

  async function runChecks() {
    setChecking(true);
    const speechWindow = window as typeof window & {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    let microphone = "prompt";
    try {
      if (navigator.permissions?.query) {
        const status = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        microphone = status.state;
      } else {
        microphone = "browser không hỗ trợ kiểm tra";
      }
    } catch {
      microphone = "chưa xác định";
    }

    let providers: Record<string, boolean> = {};
    try {
      const response = await fetch("/api/ai/providers", { cache: "no-store" });
      const payload = (await response.json()) as {
        configured?: Record<string, boolean>;
      };
      providers = payload.configured ?? {};
    } catch {
      providers = {};
    }
    const configuredProviders = Object.entries(providers)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name)
      .join(", ");

    setChecks([
      {
        label: "Kết nối mạng",
        value: navigator.onLine ? "Đang online" : "Đang offline",
        ok: navigator.onLine,
        icon: Cloud,
      },
      {
        label: "Secure context",
        value: window.isSecureContext ? "HTTPS/localhost hợp lệ" : "Cần HTTPS",
        ok: window.isSecureContext,
        icon: ShieldCheck,
      },
      {
        label: "Microphone",
        value: microphone,
        ok: microphone === "granted",
        icon: Mic2,
      },
      {
        label: "Speech Recognition",
        value:
          speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
            ? "Được hỗ trợ"
            : "Không được hỗ trợ",
        ok: Boolean(
          speechWindow.SpeechRecognition ||
            speechWindow.webkitSpeechRecognition,
        ),
        icon: Speech,
      },
      {
        label: "Cookie phiên đăng nhập",
        value: navigator.cookieEnabled ? "Được bật" : "Bị chặn",
        ok: navigator.cookieEnabled,
        icon: Cookie,
      },
      {
        label: "AI provider phía server",
        value: configuredProviders || "Chưa cấu hình",
        ok: Boolean(configuredProviders),
        icon: KeyRound,
      },
    ]);
    setChecking(false);
  }

  async function requestMicrophone() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      toast.success("Microphone đã được cấp quyền.");
      await runChecks();
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      toast.error(
        name === "NotAllowedError"
          ? "Quyền bị chặn. Mở biểu tượng ổ khóa cạnh URL, đặt Microphone thành Allow rồi tải lại."
          : "Không thể mở microphone.",
      );
      await runChecks();
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void runChecks(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Chẩn đoán quyền và kết nối</CardTitle>
        <CardDescription>
          Kiểm tra trực tiếp môi trường trình duyệt và cấu hình server hiện tại.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          {checks.map((check) => {
            const Icon = check.icon;
            return (
              <div
                key={check.label}
                className="flex items-center gap-3 rounded-2xl border bg-white/70 p-4"
              >
                <span
                  className={`flex size-10 items-center justify-center rounded-xl ${
                    check.ok
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{check.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {check.value}
                  </p>
                </div>
                <Badge variant={check.ok ? "secondary" : "outline"}>
                  {check.ok ? <CheckCircle2 /> : <CircleAlert />}
                  {check.ok ? "OK" : "Kiểm tra"}
                </Badge>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={requestMicrophone}>
            <Mic2 /> Xin quyền microphone
          </Button>
          <Button variant="outline" onClick={runChecks} disabled={checking}>
            <RefreshCw className={checking ? "animate-spin" : ""} />
            Kiểm tra lại
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
