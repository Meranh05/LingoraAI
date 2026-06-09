"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Bot,
  BrainCircuit,
  ChevronRight,
  FileText,
  GraduationCap,
  Languages,
  LayoutDashboard,
  Menu,
  MessageCircleQuestion,
  Mic2,
  PenLine,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Tổng quan", href: "/", icon: LayoutDashboard },
  { label: "Gia sư AI", href: "/ai-tutor", icon: Bot },
  { label: "Tài liệu", href: "/learn/documents", icon: FileText },
  { label: "Từ vựng", href: "/learn/vocabulary", icon: BookOpen },
  { label: "Flashcards", href: "/learn/flashcards", icon: BrainCircuit },
  { label: "Đọc hiểu", href: "/learn/reading", icon: GraduationCap },
  { label: "Luyện nói", href: "/learn/speaking", icon: Mic2 },
  { label: "Sửa bài viết", href: "/learn/writing", icon: PenLine },
  { label: "Dịch thuật", href: "/learn/translation", icon: Languages },
  { label: "Bài kiểm tra", href: "/learn/quiz", icon: MessageCircleQuestion },
  { label: "Tiến độ", href: "/learn/progress", icon: BarChart3 },
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

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navigation.map((item) => {
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
            <span className="flex-1">{item.label}</span>
            {active ? <ChevronRight className="size-4 text-primary" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6">
      <Brand />
      <Navigation onNavigate={onNavigate} />
      <div className="mt-auto flex flex-col gap-2">
        <Link
          href="/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <Settings className="size-[18px]" />
          Cài đặt
        </Link>
        <div className="rounded-2xl bg-secondary/70 p-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary text-primary-foreground">
                MN
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Minh Nguyễn</p>
              <p className="truncate text-xs text-muted-foreground">
                Intermediate
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="fixed inset-y-0 left-0 hidden w-[248px] border-r border-sidebar-border bg-sidebar/90 p-5 backdrop-blur-xl lg:block">
        <SidebarContent />
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
              <SidebarContent />
            </SheetContent>
          </Sheet>

          <div className="relative hidden max-w-md flex-1 md:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 border-white/80 bg-white/65 pl-9"
              placeholder="Tìm bài học, từ vựng..."
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">Chào buổi tối, Minh</p>
              <p className="text-xs text-muted-foreground">
                Chuỗi học 7 ngày
              </p>
            </div>
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary text-primary-foreground">
                MN
              </AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-4 md:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
