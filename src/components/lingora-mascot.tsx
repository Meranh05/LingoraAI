"use client";

import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import type { MascotMood } from "@/lib/gamification";
import { cn } from "@/lib/utils";

const messages: Array<[RegExp, MascotMood, string]> = [
  [/^\/$/, "wave", "Mình đã chuẩn bị một hành trình mới cho hôm nay!"],
  [/ai-tutor/, "think", "Cứ hỏi tự nhiên nhé, mình sẽ giải thích theo level của bạn."],
  [/roadmap/, "champion", "Mỗi checkpoint mở ra một kỹ năng mới."],
  [/reading|documents/, "read", "Đọc từng đoạn ngắn rồi tóm tắt bằng một câu nhé."],
  [/listening/, "listen", "Nghe ý chính trước, sau đó mới tập trung vào từng từ."],
  [/flashcards|vocabulary/, "cards", "Đổi thứ tự ôn tập sẽ giúp trí nhớ bền hơn."],
  [/quiz|practice/, "encourage", "Sai cũng được. Combo học tập đến từ việc thử lại!"],
  [/competition/, "champion", "Giữ nhịp đều quan trọng hơn học dồn một ngày."],
  [/writing/, "write", "Viết ý chính trước, mình sẽ giúp bạn làm câu tự nhiên hơn."],
  [/speaking/, "speak", "Nói chậm và rõ trước, tốc độ sẽ đến sau."],
];

export function MascotSprite({ mood, className }: { mood: MascotMood; className?: string }) {
  return (
    <span
      role="img"
      aria-label={`Lumo ${mood}`}
      className={cn("lumo-sprite block shrink-0", className)}
      style={{ backgroundImage: `url("/mascot/lumo-${mood}.png")` }}
    />
  );
}

export function MascotCompanion() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const state = useMemo(
    () => messages.find(([pattern]) => pattern.test(pathname)) ?? [/.*/, "idle", "Bạn đang tiến bộ từng bước cùng Lingora."],
    [pathname],
  );
  if (hidden || pathname.startsWith("/admin")) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-end gap-2">
      {open ? (
        <div className="relative mb-10 max-w-56 rounded-2xl border border-sky-100 bg-white p-4 text-sm leading-5 text-slate-700 shadow-xl shadow-sky-200/50 md:mb-12 md:max-w-64">
          <button type="button" onClick={() => setHidden(true)} className="absolute right-2 top-2 rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label="Ẩn Lumo">
            <X className="size-3.5" />
          </button>
          <strong className="mb-1 block text-sky-700">Lumo gợi ý</strong>
          {state[2] as string}
        </div>
      ) : null}
      <button type="button" onClick={() => setOpen((value) => !value)} className="group relative size-16 rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 shadow-xl shadow-sky-300/40 transition hover:-translate-y-1 md:size-20" aria-label="Mở trợ lý Lumo">
        <MascotSprite mood={state[1] as MascotMood} className="absolute inset-0 size-full" />
        <span className="absolute -left-1 top-0 flex size-6 items-center justify-center rounded-full bg-white text-sky-600 shadow">
          <MessageCircle className="size-3.5" />
        </span>
      </button>
    </div>
  );
}
