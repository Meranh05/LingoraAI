"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BookOpenCheck,
  Bot,
  Database,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Viewer } from "@/lib/auth";
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

const navigation = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/content", label: "Nội dung học", icon: BookOpenCheck },
  { href: "/admin/ai", label: "AI Lab", icon: Bot },
  { href: "/admin/system", label: "Cấu hình hệ thống", icon: Settings },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function Sidebar({ viewer }: { viewer: Viewer }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col gap-7">
      <Link href="/admin" className="flex items-center gap-3 px-2 text-white">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-cyan-500">
          <ShieldCheck className="size-5" />
        </span>
        <span>
          <span className="block text-lg font-bold">Lingora Admin</span>
          <span className="block text-[11px] text-slate-400">Control Center</span>
        </span>
      </Link>
      <nav className="flex flex-col gap-1">
        {navigation.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-white",
              )}
            >
              <Icon className="size-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-3">
        <Button
          variant="outline"
          className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white"
          render={<Link href="/" />}
        >
          <ArrowLeft data-icon="inline-start" />
          Về ứng dụng học
        </Button>
        <div className="flex items-center gap-3 rounded-2xl bg-slate-800 p-3">
          <Avatar className="size-9">
            <AvatarFallback className="bg-cyan-500 text-white">
              {initials(viewer.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {viewer.fullName}
            </p>
            <p className="truncate text-xs text-slate-400">Administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminShell({
  children,
  viewer,
}: {
  children: React.ReactNode;
  viewer: Viewer;
}) {
  return (
    <div className="min-h-screen bg-slate-100 lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="fixed inset-y-0 left-0 hidden w-[248px] bg-slate-950 p-5 lg:block">
        <Sidebar viewer={viewer} />
      </aside>
      <div className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-white/90 px-4 backdrop-blur md:px-7">
          <Sheet>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" className="lg:hidden" />}
            >
              <Menu />
              <span className="sr-only">Mở quản trị</span>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[285px] border-slate-800 bg-slate-950 p-5"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Lingora Admin</SheetTitle>
              </SheetHeader>
              <Sidebar viewer={viewer} />
            </SheetContent>
          </Sheet>
          <div className="ml-auto flex items-center gap-2 text-sm text-slate-500">
            <Database className="size-4 text-cyan-600" />
            Admin operations are audited
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] p-4 md:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
