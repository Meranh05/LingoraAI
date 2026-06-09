import { AuthForm } from "@/components/auth-form";
import { getAuthProviders } from "@/lib/auth-providers";

export default async function RegisterPage() {
  const providers = await getAuthProviders();
  return <AuthForm mode="register" googleEnabled={providers.google} />;
}
