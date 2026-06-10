import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  FileText,
  GraduationCap,
  Headphones,
  Languages,
  Mic2,
  PenLine,
  Route,
  Search,
  Trophy,
} from "lucide-react";

export const learningCatalog = [
  {
    title: "Thi đua và bảng xếp hạng",
    description: "Thử thách tuần và xếp hạng giữa những người học.",
    href: "/competition",
    keywords: ["thi đua", "bảng xếp hạng", "leaderboard", "competition"],
    icon: Trophy,
  },
  {
    title: "Lộ trình tiếng Anh A1–B1",
    description: "Lộ trình cân bằng bốn kỹ năng và từ vựng.",
    href: "/roadmap",
    keywords: ["lộ trình", "roadmap", "a1", "b1"],
    icon: Route,
  },
  {
    title: "Luyện kỹ năng",
    description: "Phiên luyện đọc, viết, nghe và nói.",
    href: "/practice",
    keywords: ["luyện", "practice", "kỹ năng"],
    icon: Trophy,
  },
  {
    title: "Tài liệu AI",
    description: "Đọc PDF, DOCX, TXT và tạo tóm tắt.",
    href: "/documents",
    keywords: ["tài liệu", "pdf", "docx", "summary"],
    icon: FileText,
  },
  {
    title: "Từ vựng",
    description: "Lưu từ, IPA, nghĩa và ví dụ song ngữ.",
    href: "/vocabulary",
    keywords: ["từ vựng", "vocabulary", "word"],
    icon: BookOpen,
  },
  {
    title: "Flashcards",
    description: "Ôn từ bằng thẻ lật và spaced repetition.",
    href: "/flashcards",
    keywords: ["flashcard", "ôn từ", "spaced"],
    icon: BrainCircuit,
  },
  {
    title: "Đọc hiểu",
    description: "Bài đọc, câu hỏi và giải thích đáp án.",
    href: "/reading",
    keywords: ["đọc", "reading", "comprehension"],
    icon: GraduationCap,
  },
  {
    title: "Luyện nghe",
    description: "Dictation và nghe ý chính.",
    href: "/listening",
    keywords: ["nghe", "listening", "dictation"],
    icon: Headphones,
  },
  {
    title: "Luyện nói",
    description: "Shadowing và luyện phát âm.",
    href: "/speaking",
    keywords: ["nói", "speaking", "pronunciation"],
    icon: Mic2,
  },
  {
    title: "Sửa bài viết",
    description: "Chấm grammar, vocabulary và coherence.",
    href: "/writing",
    keywords: ["viết", "writing", "grammar", "essay"],
    icon: PenLine,
  },
  {
    title: "Dịch thuật",
    description: "Dịch Anh–Việt và giải thích cấu trúc.",
    href: "/translation",
    keywords: ["dịch", "translation", "translate"],
    icon: Languages,
  },
  {
    title: "Bài kiểm tra",
    description: "Quiz thích ứng theo trình độ.",
    href: "/quiz",
    keywords: ["quiz", "kiểm tra", "test"],
    icon: Search,
  },
  {
    title: "Tiến độ",
    description: "Thống kê thời gian và mức độ thành thạo.",
    href: "/progress",
    keywords: ["tiến độ", "progress", "analytics"],
    icon: BarChart3,
  },
] as const;

export function searchLearningCatalog(query: string) {
  const normalized = query.trim().toLocaleLowerCase("vi");
  if (!normalized) return learningCatalog;
  return learningCatalog.filter((item) =>
    [item.title, item.description, ...item.keywords]
      .join(" ")
      .toLocaleLowerCase("vi")
      .includes(normalized),
  );
}
