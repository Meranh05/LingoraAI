import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { searchLearningCatalog } from "@/lib/learning-catalog";

export function SearchResults({
  query,
  documents,
  vocabulary,
}: {
  query: string;
  documents: Array<{ id: string; file_name: string; status: string }>;
  vocabulary: Array<{ id: string; word: string; meaning_vi: string }>;
}) {
  const results = searchLearningCatalog(query);
  const normalized = query.trim().toLocaleLowerCase("vi");
  const matchedDocuments = normalized
    ? documents.filter((item) => item.file_name.toLocaleLowerCase("vi").includes(normalized))
    : documents;
  const matchedVocabulary = normalized
    ? vocabulary.filter((item) => `${item.word} ${item.meaning_vi}`.toLocaleLowerCase("vi").includes(normalized))
    : vocabulary;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <Search className="size-7 text-primary" /> Kết quả tìm kiếm
        </h1>
        <p className="mt-2 text-muted-foreground">
          {query ? `Kết quả cho “${query}”` : "Tất cả chức năng học tập"}
        </p>
      </div>
      {results.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.href} className="glass-panel">
                <CardHeader>
                  <span className="mb-2 flex size-10 items-center justify-center rounded-2xl bg-secondary text-primary">
                    <Icon className="size-5" />
                  </span>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" render={<Link href={item.href} />}>
                    Mở chức năng <ArrowRight data-icon="inline-end" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="glass-panel">
          <CardContent className="p-8 text-center text-muted-foreground">
            Không tìm thấy kết quả phù hợp.
          </CardContent>
        </Card>
      )}
      {(matchedDocuments.length || matchedVocabulary.length) ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="glass-panel">
            <CardHeader><CardTitle>Tài liệu của bạn</CardTitle><CardDescription>Kết quả được giới hạn bởi RLS</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {matchedDocuments.map((item) => <Link key={item.id} href="/documents" className="rounded-xl border p-3 hover:bg-secondary"><p className="font-medium">{item.file_name}</p><p className="text-xs text-muted-foreground">{item.status}</p></Link>)}
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardHeader><CardTitle>Từ vựng của bạn</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {matchedVocabulary.map((item) => <Link key={item.id} href="/vocabulary" className="rounded-xl border p-3 hover:bg-secondary"><p className="font-medium">{item.word}</p><p className="text-xs text-muted-foreground">{item.meaning_vi}</p></Link>)}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
