import { describe, expect, it } from "vitest";
import { canShowMascotCompanion } from "./mascot-visibility";

describe("mascot companion visibility", () => {
  it("shows the companion on regular learner pages", () => {
    expect(canShowMascotCompanion("/", true)).toBe(true);
    expect(canShowMascotCompanion("/practice", true)).toBe(true);
  });

  it("keeps the full tutor link usable when the companion is disabled", () => {
    expect(canShowMascotCompanion("/", false)).toBe(false);
  });

  it("does not intercept navigation on routes where the companion is hidden", () => {
    expect(canShowMascotCompanion("/ai-tutor", true)).toBe(false);
    expect(canShowMascotCompanion("/learn/starter", true)).toBe(false);
    expect(canShowMascotCompanion("/admin", true)).toBe(false);
  });
});
