import { describe, expect, it } from "vitest";
import { getMissingTranslationKeys, locales, messages, translate } from "./i18n";

describe("i18n catalog", () => {
  it.each(locales)("has complete keys for %s", (locale) => {
    expect(getMissingTranslationKeys(locale)).toEqual([]);
    expect(Object.keys(messages[locale]).sort()).toEqual(
      Object.keys(messages.vi).sort(),
    );
  });

  it("interpolates values", () => {
    expect(translate("en", "workspace.question", { current: 2, total: 8 }))
      .toBe("Question 2 / 8");
  });
});
