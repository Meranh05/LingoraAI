import { afterEach, describe, expect, it } from "vitest";
import {
  getAppOriginFromEnv,
  getOriginFromRequest,
} from "./app-url";

describe("app-url", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("reads NEXT_PUBLIC_APP_URL without trailing slash", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://lingora-ai.vercel.app/";
    expect(getAppOriginFromEnv()).toBe("https://lingora-ai.vercel.app");
  });

  it("prefers env over request origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://lingora-ai.vercel.app";
    const request = new Request("http://localhost:3000/auth/callback?code=abc");
    expect(getOriginFromRequest(request)).toBe("https://lingora-ai.vercel.app");
  });

  it("falls back to request origin when env is missing", () => {
    const request = new Request(
      "https://lingora-ai.vercel.app/auth/callback?code=abc",
    );
    expect(getOriginFromRequest(request)).toBe("https://lingora-ai.vercel.app");
  });
});
