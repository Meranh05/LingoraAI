export const providerIds = [
  "auto",
  "gemini",
  "groq",
  "openai",
  "openrouter",
  "anthropic",
  "custom",
] as const;

export type ProviderId = (typeof providerIds)[number];

export type ProviderDefinition = {
  id: Exclude<ProviderId, "auto">;
  name: string;
  billing: "free-tier" | "paid" | "mixed";
  baseUrl: string;
  defaultModel: string;
  models: string[];
  keyPrefixes: string[];
};

export const providers: ProviderDefinition[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    billing: "mixed",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
    keyPrefixes: ["AIza"],
  },
  {
    id: "groq",
    name: "Groq",
    billing: "free-tier",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "openai/gpt-oss-120b",
    ],
    keyPrefixes: ["gsk_"],
  },
  {
    id: "openai",
    name: "OpenAI",
    billing: "paid",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5-mini",
    models: ["gpt-5-mini", "gpt-5.1", "gpt-4.1-mini"],
    keyPrefixes: ["sk-proj-", "sk-svcacct-", "sk-"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    billing: "mixed",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openrouter/auto",
    models: [
      "openrouter/auto",
      "google/gemini-2.5-flash",
      "meta-llama/llama-3.3-70b-instruct:free",
    ],
    keyPrefixes: ["sk-or-v1-"],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    billing: "paid",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-5",
    models: ["claude-sonnet-4-5", "claude-haiku-4-5", "claude-opus-4-6"],
    keyPrefixes: ["sk-ant-"],
  },
  {
    id: "custom",
    name: "OpenAI-compatible",
    billing: "mixed",
    baseUrl: "",
    defaultModel: "",
    models: [],
    keyPrefixes: [],
  },
];

const modelHints: Record<string, ProviderDefinition["id"]> = {
  gemini: "gemini",
  llama: "groq",
  mixtral: "groq",
  "gpt-": "openai",
  "o1": "openai",
  "o3": "openai",
  "o4": "openai",
  "claude-": "anthropic",
  "openrouter/": "openrouter",
};

export function detectProvider(
  apiKey: string,
  model = "",
  baseUrl = "",
): ProviderDefinition["id"] | null {
  const normalizedModel = model.trim().toLowerCase();
  const normalizedUrl = baseUrl.trim().toLowerCase();

  if (normalizedUrl) {
    if (normalizedUrl.includes("openrouter.ai")) return "openrouter";
    if (normalizedUrl.includes("groq.com")) return "groq";
    if (normalizedUrl.includes("googleapis.com")) return "gemini";
    if (normalizedUrl.includes("anthropic.com")) return "anthropic";
    if (normalizedUrl.includes("openai.com")) return "openai";
    return "custom";
  }

  for (const [hint, provider] of Object.entries(modelHints)) {
    if (normalizedModel.startsWith(hint) || normalizedModel.includes(hint)) {
      return provider;
    }
  }

  // OpenRouter uses an OpenAI-looking prefix, so test specific prefixes first.
  const ordered = ["openrouter", "anthropic", "groq", "gemini", "openai"] as const;
  for (const id of ordered) {
    const provider = providers.find((item) => item.id === id);
    if (provider?.keyPrefixes.some((prefix) => apiKey.startsWith(prefix))) {
      return id;
    }
  }

  return null;
}

export function getProvider(id: ProviderDefinition["id"]) {
  return providers.find((provider) => provider.id === id);
}

export const billingLabels = {
  "free-tier": "Có hạn mức miễn phí",
  paid: "Trả phí",
  mixed: "Miễn phí / trả phí",
} satisfies Record<ProviderDefinition["billing"], string>;
