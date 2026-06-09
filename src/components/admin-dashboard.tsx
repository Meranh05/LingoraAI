"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  BrainCircuit,
  Clock3,
  Database,
  MoreHorizontal,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Overview = {
  users: AdminUserRow[];
  stats: {
    users: number;
    activeToday: number;
    learningMinutes: number;
    trainingCandidates: number;
  };
};

export function AdminDashboard({ initial }: { initial: Overview }) {
  const [users, setUsers] = useState(initial.users);

  async function updateUser(
    userId: string,
    changes: { role?: "user" | "admin"; status?: "active" | "suspended" },
  ) {
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...changes }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) return toast.error(data.error ?? "Không thể cập nhật.");
    setUsers((current) =>
      current.map((user) => (user.id === userId ? { ...user, ...changes } : user)),
    );
    toast.success("Đã cập nhật user.");
  }

  const cards = [
    ["Người dùng", initial.stats.users.toLocaleString(), Users],
    ["Hoạt động hôm nay", initial.stats.activeToday.toLocaleString(), Activity],
    ["Phút học", initial.stats.learningMinutes.toLocaleString(), Clock3],
    ["Dataset chờ duyệt", initial.stats.trainingCandidates.toLocaleString(), Database],
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trung tâm quản trị</h1>
          <p className="mt-2 text-muted-foreground">
            Quản lý tài khoản, nội dung học và pipeline cải thiện AI.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <Card key={label} className="glass-panel">
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Người dùng</TabsTrigger>
          <TabsTrigger value="ai">AI Lab</TabsTrigger>
          <TabsTrigger value="content">Nội dung học</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Danh sách tài khoản</CardTitle>
              <CardDescription>
                Email chỉ hiển thị cho admin. RLS ngăn user đọc dữ liệu của nhau.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngôn ngữ</TableHead>
                    <TableHead>AI consent</TableHead>
                    <TableHead />
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
                      <TableCell>{user.locale.toUpperCase()}</TableCell>
                      <TableCell>{user.consent ? "Đã đồng ý" : "Không"}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" size="icon-sm" />}
                          >
                            <MoreHorizontal />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateUser(user.id, {
                                    role: user.role === "admin" ? "user" : "admin",
                                  })
                                }
                              >
                                Đổi thành {user.role === "admin" ? "user" : "admin"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateUser(user.id, {
                                    status:
                                      user.status === "active" ? "suspended" : "active",
                                  })
                                }
                              >
                                {user.status === "active" ? "Khóa tài khoản" : "Mở khóa"}
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="ai">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BrainCircuit className="size-5 text-primary" />
                  Training pipeline
                </CardTitle>
                <CardDescription>
                  Chỉ nhận feedback của user đã bật consent tại thời điểm gửi.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                {["Thu feedback", "Khử email/PII", "Chấm chất lượng", "Admin duyệt", "Xuất JSONL"].map(
                  (step, index) => (
                    <div key={step} className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
                      <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs text-white">
                        {index + 1}
                      </span>
                      {step}
                    </div>
                  ),
                )}
                <Button className="mt-2" render={<Link href="/api/admin/training" />}>
                  Xuất JSONL đã duyệt
                </Button>
              </CardContent>
            </Card>
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-primary" />
                  Nguyên tắc dữ liệu
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-7 text-muted-foreground">
                Không dùng chat riêng tư nếu chưa đồng ý. Không đưa user id/email
                vào dataset. Training candidate phải được admin duyệt trước khi
                xuất sang quy trình fine-tuning hoặc đánh giá model riêng.
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="content">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Kho nội dung</CardTitle>
              <CardDescription>
                Lộ trình A1–B1 được xuất bản từ migration và có thể mở rộng
                bằng learning_paths, learning_units, practice_questions.
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
