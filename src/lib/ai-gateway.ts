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

export class AiGatewayError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "AiGatewayError";
  }
}

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

function providerError(
  payload: unknown,
  status: number,
  providerName: string,
) {
  const response = payload as {
    error?: { message?: string };
    message?: string;
  };
  const detail =
    response.error?.message ??
    response.message ??
    `${providerName} trả về HTTP ${status}`;
  const retryable = [429, 500, 502, 503, 504].includes(status);
  const prefix =
    status === 503
      ? "Dịch vụ đang quá tải. Lingora đã thử lại và chuyển model dự phòng."
      : status === 429
        ? "Đã vượt hạn mức API. Hãy chờ quota được làm mới hoặc bật billing."
        : status === 401 || status === 403
          ? "API key không hợp lệ hoặc chưa có quyền sử dụng model."
          : "";
  return new AiGatewayError(
    prefix ? `${prefix} ${detail}` : detail,
    status,
    retryable,
  );
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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

  let lastError: AiGatewayError | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
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
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = providerError(payload, response.status, provider.name);
        if (!error.retryable || attempt === 2) throw error;
        lastError = error;
        await sleep(500 * 2 ** attempt + Math.floor(Math.random() * 250));
        continue;
      }
      const text = extractOpenAIText(payload);
      if (!text) {
        throw new AiGatewayError(
          `${provider.name} không trả về nội dung.`,
          502,
          true,
        );
      }
      return text;
    } catch (error) {
      if (error instanceof AiGatewayError) throw error;
      if (attempt === 2) {
        throw new AiGatewayError(
          error instanceof Error ? error.message : "Không thể kết nối model.",
          502,
          true,
        );
      }
      await sleep(500 * 2 ** attempt);
    }
  }
  throw lastError ?? new AiGatewayError("Không thể kết nối model.", 502, true);
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
    throw providerError(payload, response.status, "Anthropic");
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

  let resolvedModel = model;
  let text: string;
  if (detected === "anthropic") {
    text = await anthropicChat(apiKey, model, request.messages);
  } else if (detected === "gemini") {
    const candidates = [
      model,
      "gemini-3.5-flash",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
    ].filter((item, index, list) => list.indexOf(item) === index);
    let lastError: unknown;
    text = "";
    for (const candidate of candidates) {
      try {
        text = await openAICompatibleChat(
          provider,
          apiKey,
          candidate,
          baseUrl,
          request.messages,
        );
        resolvedModel = candidate;
        break;
      } catch (error) {
        lastError = error;
        if (!(error instanceof AiGatewayError) || !error.retryable) throw error;
      }
    }
    if (!text) throw lastError;
  } else {
    text = await openAICompatibleChat(
      provider,
      apiKey,
      model,
      baseUrl,
      request.messages,
    );
  }

  if (!text) throw new Error("Model không trả về nội dung.");
  return { text, provider: detected, model: resolvedModel };
}
