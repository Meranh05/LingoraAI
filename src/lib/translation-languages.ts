export const translationLanguages = [
  { code: "en", name: "English" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "zh-CN", name: "中文（简体）" },
  { code: "zh-TW", name: "中文（繁體）" },
  { code: "th", name: "ไทย" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "es", name: "Español" },
  { code: "pt", name: "Português" },
  { code: "it", name: "Italiano" },
  { code: "ru", name: "Русский" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "ms", name: "Bahasa Melayu" },
  { code: "ar", name: "العربية" },
  { code: "hi", name: "हिन्दी" },
] as const;

export type TranslationLanguageCode =
  (typeof translationLanguages)[number]["code"];

export function isTranslationLanguage(
  value: string,
): value is TranslationLanguageCode {
  return translationLanguages.some((language) => language.code === value);
}

export function translationLanguageName(code: string) {
  return (
    translationLanguages.find((language) => language.code === code)?.name ??
    code.toUpperCase()
  );
}
