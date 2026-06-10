"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AuthState = { error?: string; success?: string };

const credentialsSchema = z.object({
  email: z.email("Email không hợp lệ.").trim(),
  password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự."),
});

function safeNext(value: FormDataEntryValue | null) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
    ? value
    : "/";
}

function ensureConfigured(): AuthState | null {
  return isSupabaseConfigured()
    ? null
    : { error: "Chưa cấu hình Supabase. Mở /setup và thêm .env.local." };
}

export async function signInWithPassword(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const missing = ensureConfigured();
  if (missing) return missing;
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };
  redirect(safeNext(formData.get("next")));
}

export async function signUpWithPassword(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const missing = ensureConfigured();
  if (missing) return missing;
  const parsed = credentialsSchema
    .extend({ fullName: z.string().min(2, "Vui lòng nhập họ tên.").trim() })
    .safeParse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      password: formData.get("password"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(
        safeNext(formData.get("next")),
      )}`,
    },
  });
  if (error) return { error: error.message };
  return { success: "Đã tạo tài khoản. Kiểm tra email để xác nhận đăng ký." };
}

export async function sendMagicLink(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const missing = ensureConfigured();
  if (missing) return missing;
  const parsed = z
    .object({ email: z.email("Email không hợp lệ.").trim() })
    .safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(
        safeNext(formData.get("next")),
      )}`,
    },
  });
  if (error) return { error: error.message };
  return { success: "Magic link đã được gửi. Hãy kiểm tra hộp thư." };
}

export async function signInWithGoogle(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/login?message=Supabase chưa được cấu hình");
  const settingsResponse = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      },
      cache: "no-store",
    },
  );
  const settings = (await settingsResponse.json()) as {
    external?: Record<string, boolean>;
  };
  if (!settings.external?.google) {
    redirect(
      "/login?message=Google OAuth chưa được bật trong Supabase Auth Providers",
    );
  }
  const origin = (await headers()).get("origin") ?? "";
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) redirect(`/login?message=${encodeURIComponent(error.message)}`);
  if (data.url) redirect(data.url);
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "global" });
  }
  redirect("/login");
}
