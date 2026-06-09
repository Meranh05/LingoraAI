export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getMissingSupabaseVariables() {
  return [
    !process.env.NEXT_PUBLIC_SUPABASE_URL
      ? "NEXT_PUBLIC_SUPABASE_URL"
      : null,
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
      : null,
    !process.env.SUPABASE_SECRET_KEY ? "SUPABASE_SECRET_KEY" : null,
  ].filter((value): value is string => Boolean(value));
}
