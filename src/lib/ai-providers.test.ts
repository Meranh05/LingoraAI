import { describe, expect, it } from "vitest";
import { detectProvider } from "./ai-providers";

describe("detectProvider", () => {
  it.each([
    ["gsk_example", "", "", "groq"],
    ["AIza-example", "", "", "gemini"],
    ["AQ.example", "", "", "gemini"],
    ["sk-ant-example", "", "", "anthropic"],
    ["sk-or-v1-example", "", "", "openrouter"],
    ["sk-proj-example", "", "", "openai"],
    ["unknown", "claude-sonnet-4-5", "", "anthropic"],
    ["unknown", "gemini-2.5-flash", "", "gemini"],
    ["unknown", "", "https://openrouter.ai/api/v1", "openrouter"],
    ["unknown", "", "https://llm.example.com/v1", "custom"],
  ])("detects provider from key/model/url", (key, model, url, expected) => {
    expect(detectProvider(key, model, url)).toBe(expected);
  });

  it("returns null without recognizable input", () => {
    expect(detectProvider("unknown")).toBeNull();
  });
});
