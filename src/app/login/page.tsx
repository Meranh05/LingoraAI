import { AuthForm } from "@/components/auth-form";
import { getAuthProviders } from "@/lib/auth-providers";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const providers = await getAuthProviders();
  return (
    <AuthForm
      mode="login"
      message={message}
      googleEnabled={providers.google}
    />
  );
}
