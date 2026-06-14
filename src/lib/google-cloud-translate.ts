import "server-only";

type GoogleTranslationResponse = {
  data?: {
    translations?: Array<{
      translatedText?: string;
      detectedSourceLanguage?: string;
    }>;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

export class GoogleTranslationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code:
      | "NOT_CONFIGURED"
      | "INVALID_KEY"
      | "QUOTA_EXCEEDED"
      | "UPSTREAM_ERROR",
  ) {
    super(message);
    this.name = "GoogleTranslationError";
  }
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

export async function translateWithGoogle({
  text,
  source,
  target,
}: {
  text: string;
  source?: string;
  target: string;
}) {
  const apiKey = process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY?.trim();
  if (!apiKey) {
    throw new GoogleTranslationError(
      "Google Cloud Translation chưa được cấu hình.",
      503,
      "NOT_CONFIGURED",
    );
  }

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        target,
        ...(source ? { source } : {}),
        format: "text",
      }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    },
  );
  const payload = (await response.json().catch(() => ({}))) as GoogleTranslationResponse;

  if (!response.ok) {
    const detail =
      payload.error?.message ?? `Google Translation trả về HTTP ${response.status}.`;
    const normalized = detail.toLowerCase();
    const code =
      response.status === 401 ||
      response.status === 403 ||
      normalized.includes("api key")
        ? "INVALID_KEY"
        : response.status === 429 ||
            normalized.includes("quota") ||
            normalized.includes("billing")
          ? "QUOTA_EXCEEDED"
          : "UPSTREAM_ERROR";
    throw new GoogleTranslationError(detail, response.status, code);
  }

  const translation = payload.data?.translations?.[0];
  if (!translation?.translatedText) {
    throw new GoogleTranslationError(
      "Google Translation không trả về nội dung.",
      502,
      "UPSTREAM_ERROR",
    );
  }

  return {
    text: decodeHtmlEntities(translation.translatedText),
    detectedSourceLanguage: translation.detectedSourceLanguage ?? source ?? null,
  };
}
