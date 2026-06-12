export function normalizeAnswer(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("en")
    .replace(/\s+/g, " ");
}

export function answerWords(value: unknown) {
  return normalizeAnswer(value)
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean);
}

export function wordSimilarity(expectedValue: unknown, actualValue: unknown) {
  const expected = answerWords(expectedValue);
  const actual = answerWords(actualValue);
  if (!expected.length) return 0;
  const remaining = [...actual];
  const matched = expected.filter((word) => {
    const index = remaining.indexOf(word);
    if (index < 0) return false;
    remaining.splice(index, 1);
    return true;
  }).length;
  return Math.round((matched / expected.length) * 100);
}

export function orderedSentenceScore(expectedValue: unknown, actualValue: unknown) {
  const expected = answerWords(expectedValue);
  const actual = answerWords(actualValue);
  if (!expected.length || !actual.length) return 0;
  if (expected.join(" ") === actual.join(" ")) return 100;

  const correctPositions = expected.reduce(
    (count, word, index) => count + (actual[index] === word ? 1 : 0),
    0,
  );
  const lengthPenalty = Math.min(expected.length, actual.length) / Math.max(expected.length, actual.length);
  return Math.round((correctPositions / expected.length) * lengthPenalty * 100);
}
