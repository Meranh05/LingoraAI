"use client";

import Link from "next/link";
import {
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  Database,
  FileJson,
  KeyRound,
  LockKeyhole,
  Mail,
  ServerCog,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { AdminUserRow } from "@/lib/admin-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AdminUsersPage({ users }: { users: AdminUserRow[] }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Quản lý người dùng
        </h1>
        <p className="mt-2 text-slate-500">
          Theo dõi tài khoản, vai trò, trạng thái và quyền dùng dữ liệu AI.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5 text-cyan-600" /> Tài khoản
          </CardTitle>
          <CardDescription>{users.length} tài khoản đang hiển thị</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Họ tên / Email</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Trình độ</TableHead>
                <TableHead>Ngôn ngữ</TableHead>
                <TableHead>AI consent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <p className="font-medium">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </TableCell>
                  <TableCell><Badge variant="outline">{user.role}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={user.status === "active" ? "secondary" : "destructive"}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.level}</TableCell>
                  <TableCell>{user.locale.toUpperCase()}</TableCell>
                  <TableCell>{user.consent ? "Đã đồng ý" : "Không"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminContentPage({
  stats,
}: {
  stats: { paths: number; units: number; questions: number; documents: number };
}) {
  const content = [
    ["Lộ trình", stats.paths, "learning_paths", CheckCircle2],
    ["Đơn vị bài học", stats.units, "learning_units", BookOpenCheck],
    ["Ngân hàng câu hỏi", stats.questions, "practice_questions", BrainCircuit],
    ["Tài liệu người dùng", stats.documents, "documents", Database],
  ] as const;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Nội dung học
        </h1>
        <p className="mt-2 text-slate-500">
          Quản lý lộ trình, bài học, câu hỏi và tài liệu dùng chung.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {content.map(([title, count, description, Icon]) => (
          <Card key={title}>
            <CardContent className="flex items-center gap-4 p-6">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-bold">{count.toLocaleString()}</p>
                <p className="font-semibold">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Quy trình xuất bản</CardTitle>
          <CardDescription>
            Draft → review → published. User chỉ đọc nội dung đã xuất bản.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export function AdminAiPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">AI Lab</h1>
        <p className="mt-2 text-slate-500">
          Kiểm soát feedback, dữ liệu khử định danh và bản xuất fine-tuning.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="size-5 text-cyan-600" /> Pipeline dữ liệu
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {[
              "User chủ động gửi feedback",
              "Kiểm tra consent snapshot",
              "Khử email, UUID và số điện thoại",
              "Admin duyệt chất lượng",
              "Xuất JSONL",
            ].map((item, index) => (
              <div key={item} className="flex gap-3 rounded-xl bg-slate-50 p-3">
                <span className="flex size-7 items-center justify-center rounded-full bg-cyan-600 text-xs text-white">
                  {index + 1}
                </span>
                <span className="text-sm">{item}</span>
              </div>
            ))}
            <Button render={<Link href="/api/admin/training" />}>
              <FileJson data-icon="inline-start" /> Xuất JSONL đã duyệt
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-cyan-600" /> Kiểm soát riêng tư
            </CardTitle>
            <CardDescription>
              Chat riêng tư không tự động trở thành dữ liệu train.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-slate-600">
            Memory cá nhân chỉ phục vụ đúng user đó. Training candidate chỉ được
            tạo khi user đồng ý và đánh giá câu trả lời. Mọi bản xuất đều cần
            admin duyệt trước.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AdminSystemPage() {
  const checks = [
    ["Supabase URL", "NEXT_PUBLIC_SUPABASE_URL", ServerCog],
    ["Publishable key", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", KeyRound],
    ["Secret key", "SUPABASE_SECRET_KEY", LockKeyhole],
    ["Google OAuth", "Supabase Auth Provider", Mail],
  ] as const;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Cấu hình hệ thống
        </h1>
        <p className="mt-2 text-slate-500">
          Checklist triển khai Supabase, OAuth, AI provider và quyền admin.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {checks.map(([title, value, Icon]) => (
          <Card key={title}>
            <CardContent className="flex items-center gap-4 p-5">
              <Icon className="size-5 text-cyan-600" />
              <div>
                <p className="font-semibold">{title}</p>
                <code className="text-xs text-slate-500">{value}</code>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button variant="outline" render={<Link href="/setup" />}>
        Xem hướng dẫn cấu hình chi tiết
      </Button>
    </div>
  );
}
