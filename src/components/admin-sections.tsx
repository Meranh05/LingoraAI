"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  BrainCircuit,
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
import { Input } from "@/components/ui/input";
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
import { AdminContentStudio } from "@/components/admin-content-studio";

export function AdminUsersPage({ users }: { users: AdminUserRow[] }) {
  const [query, setQuery] = useState("");
  const filteredUsers = users.filter((user) =>
    `${user.fullName} ${user.email} ${user.role} ${user.status}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
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
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Tổng tài khoản", users.length],
          ["Đang hoạt động", users.filter((user) => user.status === "active").length],
          ["Quản trị viên", users.filter((user) => user.role === "admin").length],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-2xl font-bold">{Number(value).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5 text-cyan-600" /> Tài khoản
          </CardTitle>
          <CardDescription>{filteredUsers.length} tài khoản đang hiển thị</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên, email, role hoặc trạng thái..."
            className="mb-4 max-w-md"
          />
          <div className="overflow-x-auto">
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
              {filteredUsers.map((user) => (
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminContentPage({
  stats,
  studio,
}: {
  stats: { paths: number; units: number; questions: number; documents: number };
  studio: React.ComponentProps<typeof AdminContentStudio>["studio"];
}) {
  return <AdminContentStudio stats={stats} studio={studio} />;
}

type TrainingCandidate = {
  id: string;
  anonymized_input: string;
  anonymized_output: string;
  preferred_output: string | null;
  quality_score: number;
  review_status: string;
  created_at: string;
};

export function AdminAiPage({
  initialCandidates,
}: {
  initialCandidates: TrainingCandidate[];
}) {
  const [candidates, setCandidates] = useState(initialCandidates);

  async function review(id: string, status: "approved" | "rejected") {
    const response = await fetch("/api/admin/training/candidates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(payload.error ?? "Không thể duyệt dữ liệu.");
      return;
    }
    setCandidates((current) =>
      current.map((item) =>
        item.id === id ? { ...item, review_status: status } : item,
      ),
    );
    toast.success(status === "approved" ? "Đã duyệt." : "Đã từ chối.");
  }

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
            <Button nativeButton={false} render={<Link href="/api/admin/training" />}>
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
      <Card>
        <CardHeader>
          <CardTitle>Training candidates ({candidates.length})</CardTitle>
          <CardDescription>
            Nội dung đã khử định danh, cần admin duyệt trước khi xuất JSONL.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {candidates.length ? (
            candidates.map((candidate) => (
              <div key={candidate.id} className="rounded-2xl border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    Quality {Number(candidate.quality_score).toFixed(2)}
                  </Badge>
                  <Badge variant="secondary">{candidate.review_status}</Badge>
                </div>
                <p className="mt-3 text-sm font-medium">Input</p>
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                  {candidate.anonymized_input || "(empty)"}
                </p>
                <p className="mt-3 text-sm font-medium">Preferred output</p>
                <p className="mt-1 line-clamp-4 text-sm text-muted-foreground">
                  {candidate.preferred_output || candidate.anonymized_output}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => review(candidate.id, "approved")}
                    disabled={candidate.review_status === "approved"}
                  >
                    Duyệt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => review(candidate.id, "rejected")}
                    disabled={candidate.review_status === "rejected"}
                  >
                    Từ chối
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Chưa có candidate nào. Chỉ feedback có consent và rating tốt mới
              được đưa vào hàng chờ.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminSystemPage({
  status,
}: {
  status: {
    supabase: boolean;
    stripe: boolean;
    google: boolean;
    aiProviders: number;
  };
}) {
  const checks = [
    ["Supabase", "Database, Auth và RLS", ServerCog, status.supabase],
    ["Stripe Billing", "Checkout, Portal và Webhook", KeyRound, status.stripe],
    ["Google OAuth", "Supabase Auth Provider", Mail, status.google],
    [
      "AI Providers",
      `${status.aiProviders} provider key trên server`,
      LockKeyhole,
      status.aiProviders > 0,
    ],
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
        {checks.map(([title, value, Icon, configured]) => (
          <Card key={title}>
            <CardContent className="flex items-center gap-4 p-5">
              <span className={`flex size-11 items-center justify-center rounded-2xl ${configured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                <Icon className="size-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{title}</p>
                  <Badge variant={configured ? "secondary" : "outline"}>
                    {configured ? "Sẵn sàng" : "Thiếu cấu hình"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button nativeButton={false} variant="outline" render={<Link href="/setup" />}>
        Xem hướng dẫn cấu hình chi tiết
      </Button>
    </div>
  );
}
