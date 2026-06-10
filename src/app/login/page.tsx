import { AuthForm } from "@/components/auth-form";
import { getAuthProviders } from "@/lib/auth-providers";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; next?: string }>;
}) {
  const { message, next } = await searchParams;
  const providers = await getAuthProviders();
  return (
    <AuthForm
      mode="login"
      message={message}
      next={next}
      googleEnabled={providers.google}
    />
  );
}
