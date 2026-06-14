import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type Viewer = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: "user" | "admin";
  level: string;
  locale: string;
  preferences: {
    showMascot: boolean;
    compactMode: boolean;
  };
};

export const getOptionalViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role, level, locale, status, preferences")
    .eq("id", claims.sub)
    .single();

  if (profile?.status === "suspended") return null;

  return {
    id: claims.sub,
    email: String(claims.email ?? ""),
    fullName:
      profile?.full_name ||
      String(claims.user_metadata?.full_name ?? claims.email ?? "Lingora User"),
    avatarUrl:
      profile?.avatar_url ||
      (typeof claims.user_metadata?.avatar_url === "string"
        ? claims.user_metadata.avatar_url
        : null),
    role: profile?.role === "admin" ? "admin" : "user",
    level: profile?.level ?? "beginner",
    locale: profile?.locale ?? "vi",
    preferences: {
      showMascot: profile?.preferences?.showMascot !== false,
      compactMode: profile?.preferences?.compactMode === true,
    },
  };
});

export async function requireViewer() {
  if (!isSupabaseConfigured()) redirect("/setup");
  const viewer = await getOptionalViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

export async function requireAdmin() {
  const viewer = await requireViewer();
  if (viewer.role !== "admin") redirect("/");
  return viewer;
}
