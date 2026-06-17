import "server-only";
import { translateWithGoogle } from "@/lib/google-cloud-translate";

export type MachineTranslationProvider = "azure" | "google" | "libretranslate";

type AzureTranslationResponse = Array<{
  detectedLanguage?: {
    language?: string;
    score?: number;
  };
  translations?: Array<{
    text?: string;
    to?: string;
  }>;
}>;

type AzureErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

type LibreTranslateResponse = {
  translatedText?: string;
  detectedLanguage?:
    | string
    | {
        language?: string;
        confidence?: number;
      };
  error?: string;
};

export class MachineTranslationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code:
      | "NOT_CONFIGURED"
      | "INVALID_KEY"
      | "QUOTA_EXCEEDED"
      | "UPSTREAM_ERROR",
    public readonly provider?: MachineTranslationProvider,
  ) {
    super(message);
    this.name = "MachineTranslationError";
  }
}

function normalizeEndpoint(endpoint: string) {
  return endpoint.replace(/\/+$/, "");
}

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: '"',
  };

  return value.replace(
    /&(#x[\da-f]+|#\d+|amp|apos|gt|lt|quot);/gi,
    (entity, token: string) => {
      if (token.startsWith("#x")) {
        return String.fromCodePoint(Number.parseInt(token.slice(2), 16));
      }
      if (token.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(token.slice(1), 10));
      }
      return named[token.toLowerCase()] ?? entity;
    },
  );
}

function providerError(
  provider: MachineTranslationProvider,
  status: number,
  detail: string,
) {
  const normalized = detail.toLowerCase();
  const code =
    status === 401 ||
    status === 403 ||
    normalized.includes("api key") ||
    normalized.includes("subscription key") ||
    normalized.includes("unauthorized")
      ? "INVALID_KEY"
      : status === 429 ||
          normalized.includes("quota") ||
          normalized.includes("billing") ||
          normalized.includes("rate")
        ? "QUOTA_EXCEEDED"
        : "UPSTREAM_ERROR";
  return new MachineTranslationError(detail, status, code, provider);
}

async function translateWithAzure({
  text,
  source,
  target,
}: {
  text: string;
  source?: string;
  target: string;
}) {
  const key = process.env.AZURE_TRANSLATOR_KEY?.trim();
  if (!key) {
    throw new MachineTranslationError(
      "Azure Translator chưa được cấu hình.",
      503,
      "NOT_CONFIGURED",
      "azure",
    );
  }

  const endpoint = normalizeEndpoint(
    process.env.AZURE_TRANSLATOR_ENDPOINT?.trim() ||
      "https://api.cognitive.microsofttranslator.com",
  );
  const region = process.env.AZURE_TRANSLATOR_REGION?.trim();
  const url = new URL(`${endpoint}/translate`);
  url.searchParams.set("api-version", "3.0");
  url.searchParams.append("to", target);
  if (source) url.searchParams.set("from", source);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Ocp-Apim-Subscription-Key": key,
    "X-ClientTraceId": crypto.randomUUID(),
  };
  if (region) headers["Ocp-Apim-Subscription-Region"] = region;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify([{ text }]),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as
    | AzureTranslationResponse
    | AzureErrorResponse;

  if (!response.ok) {
    const detail =
      !Array.isArray(payload) && payload.error?.message
        ? payload.error.message
        : `Azure Translator trả về HTTP ${response.status}.`;
    throw providerError("azure", response.status, detail);
  }

  const item = Array.isArray(payload) ? payload[0] : undefined;
  const translatedText = item?.translations?.[0]?.text;
  if (!translatedText) {
    throw new MachineTranslationError(
      "Azure Translator không trả về nội dung.",
      502,
      "UPSTREAM_ERROR",
      "azure",
    );
  }

  return {
    text: decodeHtmlEntities(translatedText),
    detectedSourceLanguage: item?.detectedLanguage?.language ?? source ?? null,
    provider: "azure" as const,
  };
}

async function translateWithLibreTranslate({
  text,
  source,
  target,
}: {
  text: string;
  source?: string;
  target: string;
}) {
  const endpoint = process.env.LIBRETRANSLATE_URL?.trim();
  if (!endpoint) {
    throw new MachineTranslationError(
      "LibreTranslate chưa được cấu hình.",
      503,
      "NOT_CONFIGURED",
      "libretranslate",
    );
  }

  const apiKey = process.env.LIBRETRANSLATE_API_KEY?.trim();
  const response = await fetch(`${normalizeEndpoint(endpoint)}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      source: source ?? "auto",
      target,
      format: "text",
      ...(apiKey ? { api_key: apiKey } : {}),
    }),
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as LibreTranslateResponse;

  if (!response.ok) {
    throw providerError(
      "libretranslate",
      response.status,
      payload.error ?? `LibreTranslate trả về HTTP ${response.status}.`,
    );
  }
  if (!payload.translatedText) {
    throw new MachineTranslationError(
      "LibreTranslate không trả về nội dung.",
      502,
      "UPSTREAM_ERROR",
      "libretranslate",
    );
  }

  const detected =
    typeof payload.detectedLanguage === "string"
      ? payload.detectedLanguage
      : payload.detectedLanguage?.language;

  return {
    text: decodeHtmlEntities(payload.translatedText),
    detectedSourceLanguage: detected ?? source ?? null,
    provider: "libretranslate" as const,
  };
}

async function translateWithGoogleProvider(input: {
  text: string;
  source?: string;
  target: string;
}) {
  const result = await translateWithGoogle(input);
  return {
    ...result,
    provider: "google" as const,
  };
}

export async function translateWithMachineProvider(input: {
  text: string;
  source?: string;
  target: string;
}) {
  const candidates: Array<() => Promise<{
    text: string;
    detectedSourceLanguage: string | null;
    provider: MachineTranslationProvider;
  }>> = [];

  if (process.env.AZURE_TRANSLATOR_KEY?.trim()) {
    candidates.push(() => translateWithAzure(input));
  }
  if (process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY?.trim()) {
    candidates.push(() => translateWithGoogleProvider(input));
  }
  if (process.env.LIBRETRANSLATE_URL?.trim()) {
    candidates.push(() => translateWithLibreTranslate(input));
  }

  if (!candidates.length) {
    throw new MachineTranslationError(
      "Chưa cấu hình dịch máy. Thêm Azure Translator, Google Translation hoặc LibreTranslate.",
      503,
      "NOT_CONFIGURED",
    );
  }

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return await candidate();
    } catch (error) {
      lastError = error;
      if (
        error instanceof MachineTranslationError &&
        error.code === "INVALID_KEY"
      ) {
        continue;
      }
      if (
        error instanceof MachineTranslationError &&
        error.code === "QUOTA_EXCEEDED"
      ) {
        continue;
      }
      continue;
    }
  }

  if (lastError instanceof MachineTranslationError) throw lastError;
  throw new MachineTranslationError(
    "Không thể kết nối dịch máy.",
    502,
    "UPSTREAM_ERROR",
  );
}
