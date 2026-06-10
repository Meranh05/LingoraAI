export type MascotMood =
  | "idle"
  | "wave"
  | "celebrate"
  | "think"
  | "encourage"
  | "read"
  | "champion"
  | "sleep"
  | "listen"
  | "speak"
  | "write"
  | "cards"
  | "fly"
  | "treasure"
  | "surprise"
  | "dance";

const ranks = [
  "Starter",
  "Explorer",
  "Pathfinder",
  "Communicator",
  "Storyteller",
  "Fluent Mind",
  "Language Hero",
  "Lingora Legend",
];

export function getLevelState(xp: number) {
  let level = 1;
  let floor = 0;
  let next = 300;
  while (xp >= next) {
    floor = next;
    level += 1;
    next += 250 + level * 100;
  }
  const span = next - floor;
  return {
    level,
    title: ranks[Math.min(ranks.length - 1, Math.floor((level - 1) / 2))],
    next,
    progress: Math.round(((xp - floor) / span) * 100),
    current: xp - floor,
    required: span,
  };
}

export function getStreak(weekly: Array<{ minutes: number }>) {
  let streak = 0;
  for (let index = weekly.length - 1; index >= 0; index -= 1) {
    if (weekly[index].minutes <= 0) break;
    streak += 1;
  }
  return streak;
}

export function getDailyQuests(input: {
  totalMinutes: number;
  todayMinutes: number;
  vocabularyCount: number;
  attempts: number;
  documents: number;
}) {
  const rotations = [
    [
      ["Tập trung 15 phút", input.todayMinutes, 15, "/practice", "focus"],
      ["Ôn 5 từ vựng", input.vocabularyCount, 5, "/flashcards", "words"],
      ["Hoàn thành 2 lượt luyện", input.attempts, 2, "/practice", "practice"],
    ],
    [
      ["Đọc hiểu 10 phút", input.todayMinutes, 10, "/reading", "reading"],
      ["Lưu 3 từ mới", input.vocabularyCount, 3, "/vocabulary", "words"],
      ["Hỏi gia sư AI", input.totalMinutes > 0 ? 1 : 0, 1, "/ai-tutor", "tutor"],
    ],
    [
      ["Luyện nghe 12 phút", input.todayMinutes, 12, "/listening", "listening"],
      ["Làm 3 câu hỏi", input.attempts, 3, "/quiz", "quiz"],
      ["Khám phá một tài liệu", input.documents, 1, "/documents", "document"],
    ],
    [
      ["Nói liên tục 5 phút", input.todayMinutes, 5, "/speaking", "speaking"],
      ["Ôn lại 6 flashcard", input.vocabularyCount, 6, "/flashcards", "cards"],
      ["Viết một đoạn ngắn", input.attempts, 1, "/writing", "writing"],
    ],
    [
      ["Chinh phục quiz nhanh", input.attempts, 4, "/quiz", "quiz"],
      ["Đọc một chủ đề mới", input.todayMinutes, 8, "/reading", "reading"],
      ["Dịch 3 câu thực tế", input.attempts, 3, "/translation", "translation"],
    ],
    [
      ["Học cùng tài liệu", input.documents, 1, "/documents", "document"],
      ["Luyện phát âm 8 phút", input.todayMinutes, 8, "/speaking", "speaking"],
      ["Ghi nhớ 4 từ khó", input.vocabularyCount, 4, "/vocabulary", "words"],
    ],
    [
      ["Tổng ôn cuối tuần", input.attempts, 5, "/practice", "practice"],
      ["Nghe và chép chính tả", input.todayMinutes, 10, "/listening", "dictation"],
      ["Thử một chủ đề AI mới", input.totalMinutes > 0 ? 1 : 0, 1, "/ai-tutor", "tutor"],
    ],
  ] as const;
  const day = new Date().getDay();
  return rotations[day % rotations.length].map(
    ([title, value, target, href, kind], index) => ({
      id: `${day}-${kind}`,
      title,
      value: Math.min(Number(value), Number(target)),
      target: Number(target),
      href,
      kind,
      rewardXp: 10 + index * 5,
      completed: Number(value) >= Number(target),
    }),
  );
}
