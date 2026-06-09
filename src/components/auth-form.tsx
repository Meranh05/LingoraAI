"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Mail, ShieldCheck, Sparkles } from "lucide-react";
import {
  sendMagicLink,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
  type AuthState,
} from "@/app/auth/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const initialState: AuthState = {};

function Status({ state }: { state: AuthState }) {
  if (!state.error && !state.success) return null;
  return (
    <Alert variant={state.error ? "destructive" : "default"}>
      <ShieldCheck />
      <AlertTitle>{state.error ? "Không thể tiếp tục" : "Thành công"}</AlertTitle>
      <AlertDescription>{state.error ?? state.success}</AlertDescription>
    </Alert>
  );
}

export function AuthForm({
  mode,
  message,
  googleEnabled,
}: {
  mode: "login" | "register";
  message?: string;
  googleEnabled: boolean;
}) {
  const [loginState, loginAction, loginPending] = useActionState(
    signInWithPassword,
    initialState,
  );
  const [registerState, registerAction, registerPending] = useActionState(
    signUpWithPassword,
    initialState,
  );
  const [magicState, magicAction, magicPending] = useActionState(
    sendMagicLink,
    initialState,
  );

  return (
    <div className="grid min-h-screen bg-[linear-gradient(145deg,#f0fbff,#dff6ff)] lg:grid-cols-[1fr_560px]">
      <section className="relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-xl font-bold">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-white">
            <Sparkles className="size-5" />
          </span>
          Lingora
        </div>
        <div className="max-w-xl">
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-slate-900">
            Lộ trình tiếng Anh được cá nhân hóa bởi AI.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Học qua tài liệu, luyện đọc, viết, nghe, nói và theo dõi tiến độ trên
            một nền tảng bảo vệ dữ liệu theo từng tài khoản.
          </p>
        </div>
        <p className="text-sm text-slate-500">
          Privacy-first · Row Level Security · Multi-model AI
        </p>
      </section>

      <main className="flex items-center justify-center p-4 md:p-8">
        <Card className="glass-panel w-full max-w-lg">
          <CardHeader>
            <div className="mb-3 flex items-center gap-3 lg:hidden">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-white">
                <Sparkles className="size-5" />
              </span>
              <span className="text-xl font-bold">Lingora</span>
            </div>
            <CardTitle className="text-2xl">
              {mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản Lingora"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Google, magic link hoặc email và mật khẩu.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {message ? (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}

            <form action={signInWithGoogle}>
              <Button
                type="submit"
                variant="outline"
                className="w-full bg-white"
                disabled={!googleEnabled}
              >
                <span className="text-base font-bold text-blue-600">G</span>
                {googleEnabled
                  ? "Tiếp tục với Google"
                  : "Google chưa được bật trong Supabase"}
              </Button>
            </form>
            {!googleEnabled ? (
              <Alert>
                <AlertDescription>
                  Bật Google trong Authentication → Sign In / Providers và nhập
                  Google OAuth Client ID/Secret.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">hoặc</span>
              <Separator className="flex-1" />
            </div>

            <Tabs defaultValue={mode === "register" ? "password" : "password"}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="password">Mật khẩu</TabsTrigger>
                <TabsTrigger value="magic">Magic link</TabsTrigger>
              </TabsList>
              <TabsContent value="password">
                <form
                  action={mode === "login" ? loginAction : registerAction}
                  className="flex flex-col gap-4 pt-4"
                >
                  {mode === "register" ? (
                    <Input name="fullName" placeholder="Họ và tên" required />
                  ) : null}
                  <Input name="email" type="email" placeholder="Email" required />
                  <Input
                    name="password"
                    type="password"
                    placeholder="Mật khẩu (tối thiểu 8 ký tự)"
                    minLength={8}
                    required
                  />
                  <Status
                    state={mode === "login" ? loginState : registerState}
                  />
                  <Button disabled={loginPending || registerPending}>
                    {mode === "login" ? "Đăng nhập" : "Đăng ký"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="magic">
                <form action={magicAction} className="flex flex-col gap-4 pt-4">
                  <Input name="email" type="email" placeholder="Email" required />
                  <Status state={magicState} />
                  <Button disabled={magicPending}>
                    <Mail data-icon="inline-start" />
                    Gửi magic link
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="text-center text-sm text-muted-foreground">
              {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
              <Link
                href={mode === "login" ? "/register" : "/login"}
                className="font-semibold text-primary"
              >
                {mode === "login" ? "Đăng ký" : "Đăng nhập"}
              </Link>
            </p>
            <Button variant="ghost" render={<Link href="/setup" />}>
              Hướng dẫn cấu hình hệ thống
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
