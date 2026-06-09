"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ServerCog,
  WandSparkles,
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
import { Separator } from "@/components/ui/separator";
import {
  billingLabels,
  detectProvider,
  getProvider,
  providers,
  type ProviderId,
} from "@/lib/ai-providers";
import {
  defaultClientAiConfig,
  readClientAiConfig,
  writeClientAiConfig,
} from "@/lib/client-ai-config";

export function AiSettings() {
  const [provider, setProvider] = useState<ProviderId>("auto");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [serverGeminiConfigured, setServerGeminiConfigured] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const config = readClientAiConfig();
      setProvider(config.provider);
      setApiKey(config.apiKey);
      setModel(config.model);
      setBaseUrl(config.baseUrl);
    });
    fetch("/api/ai/providers")
      .then((response) => response.json())
      .then((data: { configured?: { gemini?: boolean } }) =>
        setServerGeminiConfigured(Boolean(data.configured?.gemini)),
      )
      .catch(() => setServerGeminiConfigured(false));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const detected = useMemo(
    () => detectProvider(apiKey, model, baseUrl),
    [apiKey, model, baseUrl],
  );
  const effectiveId = provider === "auto" ? detected : provider;
  const effectiveProvider = effectiveId ? getProvider(effectiveId) : undefined;
  const modelOptions = effectiveProvider?.models ?? [];

  function selectProvider(value: ProviderId | null) {
    const next = value ?? "auto";
    setProvider(next);
    if (next !== "auto") {
      const definition = getProvider(next);
      if (definition) {
        setModel(definition.defaultModel);
        setBaseUrl(definition.baseUrl);
      }
    }
  }

  function save() {
    writeClientAiConfig({ provider, apiKey, model, baseUrl });
    toast.success("Đã lưu cấu hình trong phiên trình duyệt này.");
  }

  async function testConnection() {
    setTesting(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey,
          model,
          baseUrl,
          messages: [
            {
              role: "user",
              content: "Reply with exactly: Lingora connection successful",
            },
          ],
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        provider?: string;
        model?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Kết nối thất bại.");
      writeClientAiConfig({ provider, apiKey, model, baseUrl });
      toast.success(`Kết nối thành công: ${data.provider} / ${data.model}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kết nối thất bại.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cài đặt AI</h1>
        <p className="mt-2 text-muted-foreground">
          Dùng nhiều model miễn phí hoặc trả phí, tự nhận diện API khi có thể.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ServerCog className="size-5 text-primary" />
              Provider và model
            </CardTitle>
            <CardDescription>
              Lingora hỗ trợ API chuẩn OpenAI-compatible và Anthropic Messages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-5"
              onSubmit={(event) => event.preventDefault()}
            >
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="provider">
                Nhà cung cấp
              </label>
              <Select value={provider} onValueChange={selectProvider}>
                <SelectTrigger id="provider" className="w-full bg-white/80">
                  <SelectValue placeholder="Chọn provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Tự động</SelectLabel>
                    <SelectItem value="auto">Auto Detect</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Provider hỗ trợ</SelectLabel>
                    {providers.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="api-key">
                API key
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="Nhập API key..."
                  className="bg-white/80 pl-9 pr-11"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowKey((current) => !current)}
                >
                  {showKey ? <EyeOff /> : <Eye />}
                  <span className="sr-only">Ẩn hoặc hiện API key</span>
                </Button>
              </div>
              {provider === "auto" ? (
                <div className="flex items-center gap-2 text-xs">
                  <WandSparkles className="size-4 text-primary" />
                  {detected ? (
                    <span>
                      Đã nhận diện:{" "}
                      <strong>{getProvider(detected)?.name}</strong>
                    </span>
                  ) : serverGeminiConfigured ? (
                    <span>
                      Server đã cấu hình: <strong>Google Gemini</strong>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Nhập key, model hoặc Base URL để nhận diện.
                    </span>
                  )}
                </div>
              ) : null}
              {provider === "gemini" && !apiKey && serverGeminiConfigured ? (
                <p className="text-xs text-emerald-700">
                  Đang dùng GEMINI_API_KEY được bảo vệ trên server.
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="model">
                  Model
                </label>
                {modelOptions.length ? (
                  <Select
                    value={model}
                    onValueChange={(value) => setModel(value ?? "")}
                  >
                    <SelectTrigger id="model" className="w-full bg-white/80">
                      <SelectValue placeholder="Chọn model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Model gợi ý</SelectLabel>
                        {modelOptions.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="model"
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                    placeholder="Tên model"
                    className="bg-white/80"
                  />
                )}
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="base-url">
                  Base URL
                </label>
                <Input
                  id="base-url"
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder="https://.../v1"
                  className="bg-white/80"
                />
              </div>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={save}>
                <CheckCircle2 data-icon="inline-start" />
                Lưu cấu hình
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={testConnection}
                disabled={testing}
              >
                <RefreshCw
                  data-icon="inline-start"
                  className={testing ? "animate-spin" : ""}
                />
                {testing ? "Đang kiểm tra..." : "Kiểm tra kết nối"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setProvider(defaultClientAiConfig.provider);
                  setApiKey("");
                  setModel("");
                  setBaseUrl("");
                  writeClientAiConfig(defaultClientAiConfig);
                  toast.success("Đã xóa cấu hình trong phiên.");
                }}
              >
                Xóa cấu hình
              </Button>
            </div>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-base">Trạng thái nhận diện</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {effectiveProvider ? (
                <>
                  <div className="flex items-center justify-between rounded-2xl bg-secondary/65 p-4">
                    <div>
                      <p className="font-semibold">{effectiveProvider.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {model || effectiveProvider.defaultModel || "Model tùy chỉnh"}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {billingLabels[effectiveProvider.billing]}
                    </Badge>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Chính sách giá và hạn mức phụ thuộc tài khoản provider tại
                    thời điểm sử dụng.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Chưa đủ thông tin để nhận diện provider.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LockKeyhole className="size-4 text-primary" />
                Quyền riêng tư
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              API key chỉ được lưu trong <strong>sessionStorage</strong> của tab
              hiện tại và gửi đến Route Handler khi gọi model. Server không ghi
              key vào log hoặc database. Khi triển khai cho nhiều người dùng,
              nên dùng secret manager phía server.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
