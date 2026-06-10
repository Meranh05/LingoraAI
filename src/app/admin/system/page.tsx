import { requireAdmin } from "@/lib/auth";
import { AdminSystemPage } from "@/components/admin-sections";
import { getAuthProviders } from "@/lib/auth-providers";

export default async function SystemPage() {
  await requireAdmin();
  const providers = await getAuthProviders();
  return (
    <AdminSystemPage
      status={{
        supabase: Boolean(
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
            process.env.SUPABASE_SECRET_KEY,
        ),
        stripe: Boolean(
          process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET,
        ),
        google: providers.google,
        aiProviders: [
          process.env.GEMINI_API_KEY,
          process.env.GROQ_API_KEY,
          process.env.OPENAI_API_KEY,
          process.env.OPENROUTER_API_KEY,
          process.env.ANTHROPIC_API_KEY,
        ].filter(Boolean).length,
      }}
    />
  );
}
