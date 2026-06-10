"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchLearningCatalog } from "@/lib/learning-catalog";
import { useLocale } from "@/components/locale-provider";

export function GlobalSearch() {
  const router = useRouter();
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const suggestions = useMemo(
    () => searchLearningCatalog(query).slice(0, 5),
    [query],
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    setFocused(false);
  }

  return (
    <form onSubmit={submit} className="relative hidden max-w-md flex-1 md:block">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        className="h-9 border-white/80 bg-white/65 pl-9"
        placeholder={t("shell.search")}
      />
      {focused && query.trim() ? (
        <div className="absolute inset-x-0 top-11 z-50 overflow-hidden rounded-2xl border bg-white p-2 shadow-xl">
          {suggestions.length ? (
            suggestions.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl p-3 hover:bg-secondary"
                >
                  <Icon className="size-4 text-primary" />
                  <span>
                    <span className="block text-sm font-medium">{item.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </Link>
              );
            })
          ) : (
            <p className="p-3 text-sm text-muted-foreground">
              {t("shell.noSearch")}
            </p>
          )}
        </div>
      ) : null}
    </form>
  );
}
