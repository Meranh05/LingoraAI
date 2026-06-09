import "server-only";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type AuthSettings = {
  external?: Record<string, boolean>;
};

export const getAuthProviders = cache(async () => {
  if (!isSupabaseConfigured()) {
    return { google: false, email: false };
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        },
        next: { revalidate: 60 },
      },
    );
    if (!response.ok) return { google: false, email: false };
    const settings = (await response.json()) as AuthSettings;
    return {
      google: Boolean(settings.external?.google),
      email: Boolean(settings.external?.email),
    };
  } catch {
    return { google: false, email: false };
  }
});
