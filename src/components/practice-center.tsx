import Link from "next/link";
import { BookOpen, Headphones, Mic2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function PracticeCenter({
  progress,
}: {
  progress: Array<{ skill: string; level: string; mastery: number; total_attempts: number }>;
}) {
  const modules = [
    ["Đọc hiểu", "reading", BookOpen],
    ["Luyện nghe", "listening", Headphones],
    ["Luyện nói", "speaking", Mic2],
    ["Sửa bài viết", "writing", PenLine],
  ] as const;
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Luyện kỹ năng</h1><p className="mt-2 text-muted-foreground">Chọn kỹ năng; kết quả mỗi lượt được lưu vào tài khoản.</p></div>
      <div className="grid gap-4 md:grid-cols-2">
        {modules.map(([title, skill, Icon]) => {
          const item = progress.find((row) => row.skill === skill);
          return <Card key={skill} className="glass-panel"><CardHeader><CardTitle className="flex items-center gap-2"><Icon className="text-primary" /> {title}</CardTitle><CardDescription>{item ? `${item.level} · ${item.total_attempts} lượt luyện` : "Chưa có dữ liệu luyện tập"}</CardDescription></CardHeader><CardContent><Progress value={Number(item?.mastery ?? 0)} /><Button className="mt-4" render={<Link href={`/${skill}`} />}>Bắt đầu</Button></CardContent></Card>;
        })}
      </div>
    </div>
  );
}
