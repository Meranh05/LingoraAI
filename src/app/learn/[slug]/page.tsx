import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { LearningWorkspace } from "@/components/learning-workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth";
import { getUnitLessonData } from "@/lib/learning-data";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function LearnPage({ params }: Props) {
  const { slug } = await params;
  const supported = new Set([
    "documents", "vocabulary", "flashcards", "reading", "listening",
    "speaking", "writing", "translation", "quiz", "progress",
  ]);
  if (supported.has(slug)) redirect(`/${slug}`);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug)) {
    notFound();
  }
  const viewer = await requireViewer();
  const data = await getUnitLessonData(viewer, slug);
  if (!data) notFound();
  if (data.locked) {
    return (
      <Card className="mx-auto mt-16 max-w-xl border-amber-200 bg-amber-50">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <LockKeyhole className="size-7" />
          </span>
          <h1 className="text-2xl font-black">Checkpoint chưa được mở khóa</h1>
          <p className="text-muted-foreground">
            {data.reason === "not_enrolled"
              ? "Đăng ký lộ trình trước khi bắt đầu bài học."
              : "Đạt mastery của checkpoint trước để tiếp tục."}
          </p>
          <Button nativeButton={false} render={<Link href="/roadmap" />}>
            Quay lại lộ trình
          </Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <LearningWorkspace
      kind={data.lesson.skill as "reading"}
      data={data.workspace}
      lesson={data.lesson}
    />
  );
}
