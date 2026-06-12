"use client";

import Link from "next/link";
import Image from "next/image";
import { useActionState, useState } from "react";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.93A6.01 6.01 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.63.39 3.17 1.04 4.55l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
    </svg>
  );
}

export function AuthForm({
  mode,
  message,
  next,
  googleEnabled,
}: {
  mode: "login" | "register";
  message?: string;
  next?: string;
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
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative grid min-h-screen overflow-hidden bg-[linear-gradient(145deg,#f4fcff_0%,#e7f8ff_46%,#eef0ff_100%)] lg:grid-cols-[minmax(0,1fr)_600px]">
      <div className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-cyan-200/45 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 right-[20%] size-[30rem] rounded-full bg-indigo-200/35 blur-3xl" />

      <section className="relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
        <Image src="/brand/lingora-logo.svg" alt="Lingora" width={196} height={48} priority />
        <div className="max-w-2xl">
          <div className="mb-8 flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-white/80 text-sky-600 shadow-lg shadow-sky-200/40">
              <Sparkles className="size-7" />
            </span>
            <div>
              <p className="font-bold text-sky-700">Học đúng cách, tiến bộ mỗi ngày</p>
              <p className="text-sm text-slate-500">Lộ trình thích ứng theo chính bạn</p>
            </div>
          </div>
          <h1 className="max-w-xl text-5xl font-black leading-[1.08] tracking-[-0.04em] text-slate-950 xl:text-6xl">
            Tiếng Anh gần gũi hơn cùng Lingora.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            AI Tutor, bài luyện đa kỹ năng và lộ trình cá nhân hóa trong một
            không gian học tập an toàn cho riêng bạn.
          </p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
            {[
              "Dữ liệu riêng theo tài khoản",
              "Theo dõi tiến độ thực tế",
              "Luyện nghe, nói, đọc, viết",
              "Đồng hành cùng linh vật Lumo",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <span className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Check className="size-3.5" />
                </span>
                {feature}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <ShieldCheck className="size-4 text-sky-600" />
          Privacy-first · Row Level Security · Multi-model AI
        </div>
      </section>

      <main className="relative flex items-center justify-center p-4 sm:p-7 lg:p-10">
        <Card className="w-full max-w-[500px] overflow-hidden rounded-[32px] border border-white/90 bg-white/92 py-0 shadow-[0_30px_90px_-35px_rgba(14,116,144,.45)] backdrop-blur-xl">
          <div className="h-1.5 bg-gradient-to-r from-sky-400 via-cyan-400 to-indigo-500" />
          <CardHeader className="px-6 pb-3 pt-7 sm:px-9 sm:pt-9">
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <Image src="/brand/lingora-logo.svg" alt="Lingora" width={150} height={38} priority />
              <span className="flex size-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <ShieldCheck className="size-5" />
              </span>
            </div>
            <div className="mb-3 flex size-13 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 text-sky-700 shadow-sm">
              {mode === "login" ? <LockKeyhole className="size-6" /> : <UserRound className="size-6" />}
            </div>
            <CardTitle className="text-3xl font-black tracking-tight text-slate-950">
              {mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản Lingora"}
            </CardTitle>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {mode === "login"
                ? "Tiếp tục hành trình học tập của bạn bằng Google hoặc email."
                : "Bắt đầu lộ trình cá nhân hóa bằng Google hoặc email."}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 px-6 pb-7 sm:px-9 sm:pb-9">
            {message ? (
              <Alert className="rounded-2xl">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}

            <form action={signInWithGoogle}>
              <input type="hidden" name="next" value={next ?? ""} />
              <Button
                type="submit"
                variant="outline"
                className="h-12 w-full rounded-2xl border-slate-200 bg-white text-[15px] font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50/50 hover:shadow-md"
                disabled={!googleEnabled}
              >
                <span className="mr-1 flex size-8 items-center justify-center rounded-xl bg-white shadow-sm">
                  <GoogleIcon />
                </span>
                {googleEnabled
                  ? "Tiếp tục với Google"
                  : "Google chưa được bật trong Supabase"}
                {googleEnabled ? <ArrowRight className="ml-auto size-4 text-slate-400" /> : null}
              </Button>
            </form>
            {!googleEnabled ? (
              <Alert className="rounded-2xl">
                <AlertDescription>
                  Bật Google trong Authentication → Sign In / Providers và nhập
                  Google OAuth Client ID/Secret.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">hoặc dùng email</span>
              <Separator className="flex-1" />
            </div>

            <Tabs defaultValue={mode === "register" ? "password" : "password"}>
              <TabsList className="grid h-11 w-full grid-cols-2 rounded-2xl bg-sky-50 p-1">
                <TabsTrigger value="password" className="rounded-xl data-active:bg-white data-active:shadow-sm">
                  <LockKeyhole /> Mật khẩu
                </TabsTrigger>
                <TabsTrigger value="magic" className="rounded-xl data-active:bg-white data-active:shadow-sm">
                  <Mail /> Email link
                </TabsTrigger>
              </TabsList>
              <TabsContent value="password">
                <form
                  action={mode === "login" ? loginAction : registerAction}
                  className="flex flex-col gap-4 pt-5"
                >
                  <input type="hidden" name="next" value={next ?? ""} />
                  {mode === "register" ? (
                    <AuthField icon={UserRound} label="Họ và tên">
                      <Input name="fullName" placeholder="Nguyễn Văn A" autoComplete="name" required />
                    </AuthField>
                  ) : null}
                  <AuthField icon={Mail} label="Địa chỉ email">
                    <Input name="email" type="email" placeholder="ban@example.com" autoComplete="email" required />
                  </AuthField>
                  <AuthField icon={LockKeyhole} label="Mật khẩu">
                    <Input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Tối thiểu 8 ký tự"
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      minLength={8}
                      className="pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute bottom-0 right-0 flex size-12 items-center justify-center text-slate-400 transition hover:text-sky-600"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                    </button>
                  </AuthField>
                  <Status
                    state={mode === "login" ? loginState : registerState}
                  />
                  <Button
                    type="submit"
                    className="mt-1 h-12 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 text-[15px] font-bold shadow-lg shadow-sky-200 transition hover:-translate-y-0.5 hover:from-sky-600 hover:to-cyan-600"
                    disabled={loginPending || registerPending}
                  >
                    {mode === "login" ? "Đăng nhập" : "Đăng ký"}
                    <ArrowRight className="ml-auto" />
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="magic">
                <form action={magicAction} className="flex flex-col gap-4 pt-5">
                  <input type="hidden" name="next" value={next ?? ""} />
                  <p className="rounded-2xl bg-indigo-50/70 p-4 text-sm leading-6 text-slate-600">
                    Lingora sẽ gửi một liên kết đăng nhập an toàn đến hộp thư của bạn. Không cần nhập mật khẩu.
                  </p>
                  <AuthField icon={Mail} label="Địa chỉ email">
                    <Input name="email" type="email" placeholder="ban@example.com" autoComplete="email" required />
                  </AuthField>
                  <Status state={magicState} />
                  <Button
                    type="submit"
                    className="h-12 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 text-[15px] font-bold shadow-lg shadow-indigo-200 hover:from-indigo-600 hover:to-violet-600"
                    disabled={magicPending}
                  >
                    <Mail data-icon="inline-start" />
                    Gửi liên kết qua email
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="text-center text-sm text-slate-500">
              {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
              <Link
                href={`${mode === "login" ? "/register" : "/login"}${
                  next ? `?next=${encodeURIComponent(next)}` : ""
                }`}
                className="font-bold text-sky-600 hover:text-sky-700 hover:underline"
              >
                {mode === "login" ? "Đăng ký" : "Đăng nhập"}
              </Link>
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              Thông tin đăng nhập được mã hóa và bảo vệ
            </div>
            <Link href="/setup" className="text-center text-xs font-medium text-slate-400 hover:text-sky-600">
              Hướng dẫn cấu hình hệ thống
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function AuthField({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="relative block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</span>
      <Icon className="pointer-events-none absolute bottom-3.5 left-4 z-10 size-4.5 text-slate-400" />
      <div className="[&_input]:h-12 [&_input]:rounded-2xl [&_input]:border-slate-200 [&_input]:bg-slate-50/70 [&_input]:pl-11 [&_input]:text-[15px] [&_input]:shadow-inner [&_input]:focus-visible:bg-white">
        {children}
      </div>
    </label>
  );
}
