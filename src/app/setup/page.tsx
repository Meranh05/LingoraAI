import Link from "next/link";
import { CheckCircle2, CircleAlert, Database, KeyRound, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMissingSupabaseVariables, isSupabaseConfigured } from "@/lib/supabase/config";

export default function SetupPage() {
  const publicConfigured = isSupabaseConfigured();
  const missing = getMissingSupabaseVariables();
  const configured = missing.length === 0;
  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div><h1 className="text-3xl font-bold">Cấu hình Lingora</h1><p className="mt-2 text-slate-600">Lingora không chạy dữ liệu demo. Supabase phải được cấu hình trước khi đăng nhập.</p></div>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2">{configured ? <CheckCircle2 className="text-emerald-600" /> : <CircleAlert className="text-amber-600" />} Trạng thái môi trường</CardTitle><CardDescription>{configured ? "Supabase client và quyền admin đã sẵn sàng." : publicConfigured ? "Client đã có, nhưng cấu hình quản trị chưa đầy đủ." : "Thiếu cấu hình bắt buộc."}</CardDescription></CardHeader>
          <CardContent>
            {missing.length ? <ul className="space-y-2">{missing.map((name) => <li key={name}><code className="rounded bg-slate-100 px-2 py-1 text-sm">{name}</code></li>)}</ul> : <p className="text-sm text-emerald-700">Tất cả biến Supabase đã được khai báo.</p>}
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardHeader><Database className="text-cyan-600" /><CardTitle>1. Tạo Supabase project</CardTitle></CardHeader><CardContent className="text-sm leading-6 text-slate-600">Tạo project riêng cho Lingora, sau đó chạy lần lượt các file SQL trong <code>supabase/migrations</code> theo thứ tự tên file.</CardContent></Card>
          <Card><CardHeader><KeyRound className="text-cyan-600" /><CardTitle>2. Tạo .env.local</CardTitle></CardHeader><CardContent><pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{`NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...`}</pre></CardContent></Card>
          <Card><CardHeader><CheckCircle2 className="text-cyan-600" /><CardTitle>3. Auth providers</CardTitle></CardHeader><CardContent className="text-sm leading-6 text-slate-600">Bật Email và Google trong Supabase Auth. Thêm callback <code>/auth/callback</code> vào redirect URLs.</CardContent></Card>
          <Card><CardHeader><Terminal className="text-cyan-600" /><CardTitle>4. Khởi động lại</CardTitle></CardHeader><CardContent><pre className="rounded-xl bg-slate-950 p-4 text-xs text-slate-100">pnpm dev</pre></CardContent></Card>
        </div>
        {configured ? <Button render={<Link href="/login" />}>Đi đến đăng nhập</Button> : null}
      </div>
    </main>
  );
}
