import {
  detectProvider,
  getProvider,
  type ProviderDefinition,
  type ProviderId,
} from "@/lib/ai-providers";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GatewayRequest = {
  provider: ProviderId;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  messages: ChatMessage[];
};

const envKeys: Partial<Record<ProviderDefinition["id"], string | undefined>> = {
  gemini: process.env.GEMINI_API_KEY,
  groq: process.env.GROQ_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
};

function detectConfiguredProvider() {
  const priority: ProviderDefinition["id"][] = [
    "gemini",
    "groq",
    "openai",
    "openrouter",
    "anthropic",
  ];
  return priority.find((provider) => Boolean(envKeys[provider]?.trim())) ?? null;
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function extractOpenAIText(payload: unknown): string {
  const response = payload as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (response.error?.message) throw new Error(response.error.message);
  return response.choices?.[0]?.message?.content?.trim() ?? "";
}

async function openAICompatibleChat(
  provider: ProviderDefinition,
  apiKey: string,
  model: string,
  baseUrl: string,
  messages: ChatMessage[],
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (provider.id === "openrouter") {
    headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    headers["X-Title"] = "Lingora";
  }

  const response = await fetch(
    `${normalizeBaseUrl(baseUrl)}/chat/completions`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.5,
        max_tokens: 1200,
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );

  const payload = await response.json();
  if (!response.ok) {
    const error = payload as { error?: { message?: string }; message?: string };
    throw new Error(
      error.error?.message ?? error.message ?? `API trả về HTTP ${response.status}`,
    );
  }
  return extractOpenAIText(payload);
}

async function anthropicChat(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
) {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const conversation = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({ role: message.role, content: message.content }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      system,
      messages: conversation,
      max_tokens: 1200,
      temperature: 0.5,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `API trả về HTTP ${response.status}`);
  }
  return (
    payload.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("\n")
      .trim() ?? ""
  );
}

export async function runChat(request: GatewayRequest) {
  const detected =
    request.provider === "auto"
      ? detectProvider(request.apiKey ?? "", request.model, request.baseUrl) ??
        detectConfiguredProvider()
      : request.provider;

  if (!detected) {
    throw new Error(
      "Không nhận diện được provider. Hãy chọn provider hoặc nhập Base URL tùy chỉnh.",
    );
  }

  const provider = getProvider(detected);
  if (!provider) throw new Error("Provider chưa được hỗ trợ.");

  const apiKey = request.apiKey?.trim() || envKeys[detected]?.trim();
  if (!apiKey) {
    throw new Error(
      `Thiếu API key cho ${provider.name}. Nhập khóa trong giao diện hoặc cấu hình biến môi trường.`,
    );
  }

  const model = request.model?.trim() || provider.defaultModel;
  const baseUrl = request.baseUrl?.trim() || provider.baseUrl;
  if (!model) throw new Error("Vui lòng nhập tên model.");
  if (!baseUrl) throw new Error("Vui lòng nhập Base URL.");

  const text =
    detected === "anthropic"
      ? await anthropicChat(apiKey, model, request.messages)
      : await openAICompatibleChat(
          provider,
          apiKey,
          model,
          baseUrl,
          request.messages,
        );

  if (!text) throw new Error("Model không trả về nội dung.");
  return { text, provider: detected, model };
}
