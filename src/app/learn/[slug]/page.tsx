import { notFound, redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function LearnPage({ params }: Props) {
  const { slug } = await params;
  const supported = new Set([
    "documents", "vocabulary", "flashcards", "reading", "listening",
    "speaking", "writing", "translation", "quiz", "progress",
  ]);
  if (!supported.has(slug)) notFound();
  redirect(`/${slug}`);
}
