import { describe, expect, it } from "vitest";
import {
  normalizeAnswer,
  orderedSentenceScore,
  wordSimilarity,
} from "./practice-scoring";

describe("practice scoring", () => {
  it("normalizes spacing and case", () => {
    expect(normalizeAnswer("  She   Reads ")).toBe("she reads");
  });

  it("scores dictation by matched words", () => {
    expect(wordSimilarity("good study habits", "Good habits")).toBe(67);
  });

  it("requires the correct order for sentence exercises", () => {
    expect(orderedSentenceScore("she usually reads before bed", "she usually reads before bed")).toBe(100);
    expect(orderedSentenceScore("she usually reads before bed", "bed before reads usually she")).toBe(20);
    expect(orderedSentenceScore("she usually reads before bed", "she reads usually before bed")).toBe(60);
  });
});
