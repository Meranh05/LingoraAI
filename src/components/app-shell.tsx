"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Blocks,
  BookOpen,
  Bot,
  BrainCircuit,
  ChevronRight,
  Crown,
  Coins,
  FileText,
  GraduationCap,
  Headphones,
  Languages,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircleQuestion,
  Mic2,
  Volume2,
  VolumeX,
  PenLine,
  Settings,
  ShieldCheck,
  Trophy,
  Waypoints,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Viewer } from "@/lib/auth";
import { signOut } from "@/app/auth/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { localeNames, navigationLabels, type Locale } from "@/lib/i18n";
import { AdminShell } from "@/components/admin-shell";
import { GlobalSearch } from "@/components/global-search";
import { useLocale } from "@/components/locale-provider";
import { useExperience } from "@/components/experience-provider";
import { MascotCompanion } from "@/components/lingora-mascot";

const navigation = [
  { key: "dashboard", href: "/", icon: LayoutDashboard },
  { key: "tutor", href: "/ai-tutor", icon: Bot },
  { key: "roadmap", href: "/roadmap", icon: Waypoints },
  { key: "practice", href: "/practice", icon: Blocks },
  { key: "documents", href: "/documents", icon: FileText },
  { key: "vocabulary", href: "/vocabulary", icon: BookOpen },
  { key: "flashcards", href: "/flashcards", icon: BrainCircuit },
  { key: "reading", href: "/reading", icon: GraduationCap },
  { key: "listening", href: "/listening", icon: Headphones },
  { key: "speaking", href: "/speaking", icon: Mic2 },
  { key: "writing", href: "/writing", icon: PenLine },
  { key: "translation", href: "/translation", icon: Languages },
  { key: "quiz", href: "/quiz", icon: MessageCircleQuestion },
  { key: "progress", href: "/progress", icon: BarChart3 },
  { key: "competition", href: "/competition", icon: Trophy },
  { key: "store", href: "/store", icon: Coins },
  { key: "pricing", href: "/pricing", icon: Crown },
];

function Brand({ tagline }: { tagline: string }) {
  return (
    <Link href="/" className="flex items-center px-1" aria-label={`Lingora - ${tagline}`}>
      <Image src="/brand/lingora-logo.svg" alt="Lingora" width={166} height={41} priority />
    </Link>
  );
}

function Navigation({
  onNavigate,
  locale,
  isAdmin,
}: {
  onNavigate?: () => void;
  locale: Locale;
  isAdmin: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
      <div className="flex flex-col gap-1">
      {[...navigation, ...(isAdmin ? [{ key: "admin", href: "/admin", icon: ShieldCheck }] : [])].map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <Icon className={cn("size-[18px]", active && "text-primary")} />
            <span className="flex-1">
              {navigationLabels[locale][item.key]}
            </span>
            {active ? <ChevronRight className="size-4 text-primary" /> : null}
          </Link>
        );
      })}
      </div>
    </nav>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function SidebarContent({
  viewer,
  locale,
  onNavigate,
}: {
  viewer: Viewer | null;
  locale: Locale;
  onNavigate?: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <Brand tagline={t("shell.tagline")} />
      <Navigation
        onNavigate={onNavigate}
        locale={locale}
        isAdmin={false}
      />
      <div className="shrink-0 flex flex-col gap-2">
        <Link
          href="/billing"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <Crown className="size-[18px]" />
          {navigationLabels[locale].billing}
        </Link>
        <Link
          href="/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <Settings className="size-[18px]" />
          {navigationLabels[locale].settings}
        </Link>
        {viewer?.role === "admin" ? (
          <Link
            href="/admin"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            <ShieldCheck className="size-[18px]" />
            Admin Console
          </Link>
        ) : null}
        <div className="rounded-2xl bg-secondary/70 p-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials(viewer?.fullName ?? "Guest")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {viewer?.fullName ?? t("shell.guest")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {viewer?.role === "admin" ? "Administrator" : viewer?.level ?? "Guest"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  viewer,
}: {
  children: React.ReactNode;
  viewer: Viewer | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, t } = useLocale();
  const { soundEnabled, setSoundEnabled, play } = useExperience();
  const authPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/setup") ||
    pathname.startsWith("/pricing");

  if (authPage) return children;
  if (pathname.startsWith("/admin") && viewer?.role === "admin") {
    return <AdminShell viewer={viewer}>{children}</AdminShell>;
  }

  async function changeLocale(next: Locale) {
    setLocale(next);
    await Promise.all([
      fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      }),
      viewer
        ? fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ locale: next }),
          })
        : Promise.resolve(),
    ]);
    router.refresh();
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="fixed inset-y-0 left-0 hidden w-[248px] border-r border-sidebar-border bg-sidebar/90 p-5 backdrop-blur-xl lg:block">
        <SidebarContent viewer={viewer} locale={locale} />
      </aside>

      <div className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/70 bg-background/75 px-4 backdrop-blur-xl md:px-7">
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="lg:hidden" />
              }
            >
              <Menu />
              <span className="sr-only">{t("shell.openMenu")}</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-[285px] p-5">
              <SheetHeader className="sr-only">
                <SheetTitle>{t("shell.navigation")}</SheetTitle>
              </SheetHeader>
              <SidebarContent viewer={viewer} locale={locale} />
            </SheetContent>
          </Sheet>

          <GlobalSearch />
          <div className="ml-auto flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) window.setTimeout(() => play("success"), 0);
              }}
              aria-label={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
            >
              {soundEnabled ? <Volume2 /> : <VolumeX />}
            </Button>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">
                {t("shell.welcome")},{" "}
                {viewer?.fullName.split(" ").at(-1) ?? "Guest"}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("shell.privateData")}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<button type="button" className="rounded-full" />}
              >
                <Avatar className="size-9">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {initials(viewer?.fullName ?? "Guest")}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <span className="block truncate">{viewer?.fullName ?? "Guest"}</span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      {viewer?.email}
                    </span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {(Object.keys(localeNames) as Locale[]).map((item) => (
                    <DropdownMenuItem
                      key={item}
                      onClick={() => changeLocale(item)}
                    >
                      {localeNames[item]}
                      {locale === item ? " ✓" : ""}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {viewer ? (
                  <form action={signOut}>
                    <DropdownMenuItem
                      nativeButton
                      render={<button type="submit" className="w-full" />}
                    >
                      <LogOut />
                      {t("shell.logout")}
                    </DropdownMenuItem>
                  </form>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-4 md:p-7">
          {children}
        </main>
        <MascotCompanion />
      </div>
    </div>
  );
}
