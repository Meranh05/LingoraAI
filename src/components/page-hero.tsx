import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  cyan: "from-cyan-500 via-sky-500 to-blue-600 shadow-sky-200/70",
  indigo: "from-indigo-500 via-violet-500 to-fuchsia-500 shadow-indigo-200/70",
  emerald: "from-emerald-500 via-teal-500 to-cyan-500 shadow-emerald-200/70",
  amber: "from-amber-400 via-orange-500 to-rose-500 shadow-orange-200/70",
} as const;

export function PageHero({
  icon: Icon,
  title,
  description,
  eyebrow,
  tone = "cyan",
  aside,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  eyebrow?: string;
  tone?: keyof typeof tones;
  aside?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "page-enter relative overflow-hidden rounded-[30px] bg-gradient-to-br p-6 text-white shadow-xl md:p-8",
        tones[tone],
      )}
    >
      <div className="absolute -right-12 -top-20 size-64 rounded-full bg-white/15 blur-2xl" />
      <div className="absolute -bottom-24 left-1/3 size-56 rounded-full bg-cyan-100/10 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="max-w-3xl">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/18 ring-1 ring-white/25 backdrop-blur">
              <Icon className="size-6" />
            </span>
            {eyebrow ? (
              <span className="text-sm font-semibold text-white/80">
                {eyebrow}
              </span>
            ) : null}
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 md:text-base">
            {description}
          </p>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
    </section>
  );
}
