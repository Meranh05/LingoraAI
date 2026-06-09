import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeatureWorkspace, featureDefinitions } from "@/components/feature-workspace";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: featureDefinitions[slug]?.title ?? "Học tập" };
}

export default async function LearnPage({ params }: Props) {
  const { slug } = await params;
  const feature = featureDefinitions[slug];
  if (!feature) notFound();
  return <FeatureWorkspace feature={feature} />;
}
