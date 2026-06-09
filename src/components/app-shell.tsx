"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Blocks,
  BookOpen,
  Bot,
  BrainCircuit,
  ChevronRight,
  FileText,
  GraduationCap,
  Headphones,
  Languages,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircleQuestion,
  Mic2,
  PenLine,
  Settings,
  ShieldCheck,
  Sparkles,
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
import {
  localeNames,
  navigationLabels,
  type Locale,
} from "@/lib/i18n";
import { useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { GlobalSearch } from "@/components/global-search";

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
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3 px-2">
      <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-sky-200">
        <Sparkles className="size-5" />
      </span>
      <span>
        <span className="block text-xl font-bold tracking-tight">Lingora</span>
        <span className="block text-[11px] font-medium text-muted-foreground">
          English with AI
        </span>
      </span>
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
    <nav className="flex flex-col gap-1">
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
  return (
    <div className="flex h-full flex-col gap-6">
      <Brand />
      <Navigation
        onNavigate={onNavigate}
        locale={locale}
        isAdmin={false}
      />
      <div className="mt-auto flex flex-col gap-2">
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
                {viewer?.fullName ?? "Khách"}
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
  const [locale, setLocale] = useState<Locale>(
    (viewer?.locale as Locale) || "vi",
  );
  const authPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/setup");

  if (authPage) return children;
  if (pathname.startsWith("/admin") && viewer?.role === "admin") {
    return <AdminShell viewer={viewer}>{children}</AdminShell>;
  }

  async function changeLocale(next: Locale) {
    setLocale(next);
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
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
              <span className="sr-only">Mở menu</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-[285px] p-5">
              <SheetHeader className="sr-only">
                <SheetTitle>Điều hướng Lingora</SheetTitle>
              </SheetHeader>
              <SidebarContent viewer={viewer} locale={locale} />
            </SheetContent>
          </Sheet>

          <GlobalSearch />
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">
                {locale === "en" ? "Welcome" : "Xin chào"},{" "}
                {viewer?.fullName.split(" ").at(-1) ?? "Guest"}
              </p>
              <p className="text-xs text-muted-foreground">
                Dữ liệu học tập cá nhân
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
                <DropdownMenuLabel>
                  <span className="block truncate">{viewer?.fullName ?? "Guest"}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">
                    {viewer?.email}
                  </span>
                </DropdownMenuLabel>
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
                    <DropdownMenuItem render={<button type="submit" className="w-full" />}>
                      <LogOut />
                      Đăng xuất
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
      </div>
    </div>
  );
}
