import { AuthForm } from "@/components/auth-form";
import { getAuthProviders } from "@/lib/auth-providers";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const providers = await getAuthProviders();
  return <AuthForm mode="register" next={next} googleEnabled={providers.google} />;
}
