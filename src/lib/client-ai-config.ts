import type { ProviderId } from "@/lib/ai-providers";

export type ClientAiConfig = {
  provider: ProviderId;
  apiKey: string;
  model: string;
  baseUrl: string;
};

export const defaultClientAiConfig: ClientAiConfig = {
  provider: "auto",
  apiKey: "",
  model: "",
  baseUrl: "",
};

const storageKey = "lingora.ai-config.session";

export function readClientAiConfig(): ClientAiConfig {
  if (typeof window === "undefined") return defaultClientAiConfig;
  try {
    const value = window.sessionStorage.getItem(storageKey);
    return value
      ? { ...defaultClientAiConfig, ...JSON.parse(value) }
      : defaultClientAiConfig;
  } catch {
    return defaultClientAiConfig;
  }
}

export function writeClientAiConfig(config: ClientAiConfig) {
  window.sessionStorage.setItem(storageKey, JSON.stringify(config));
}
