# Lingora Architecture

## Authentication

Supabase Auth supports Google OAuth, magic link and password authentication.
`src/proxy.ts` refreshes SSR cookies and validates claims. Production should use
`AUTH_REQUIRED=true`.

## Authorization

`src/lib/auth.ts` is the server-side data access boundary. Admin pages and APIs
must call `requireAdmin()` or perform the equivalent non-redirecting API check.
Client-side visibility is never treated as authorization.

## Data ownership

Every private table includes `user_id` and an RLS policy based on `auth.uid()`.
Admin access is checked by `private.is_admin()`. Storage object paths start with
the authenticated user id.

## AI personalization

Lingora uses three separate concepts:

1. **Private memory**: goals/preferences/weaknesses tied to one user.
2. **Feedback**: an explicit rating or correction submitted by that user.
3. **Training candidates**: anonymized, consented feedback pending admin review.

Private memory is never shared across users. Aggregated training candidates do
not contain user identifiers and are not exported until approved.

## Demo mode

When Supabase is not configured and `AUTH_REQUIRED=false`, the UI uses a local
demo viewer and sample metrics. This makes the repository easy to evaluate.
Demo mode must not be used as an authorization model in production.
