# Security Policy

## Reporting a vulnerability

Do not open a public issue for authentication bypasses, RLS failures, secret
exposure or cross-user data access.

Contact the repository owner privately through GitHub with:

- Affected route/table.
- Reproduction steps.
- Expected and observed behavior.
- Suggested mitigation, if available.

## Security model

- Browser code uses only the Supabase publishable key.
- Secret keys are server-only.
- Server authorization is repeated in actions and route handlers.
- RLS is the final boundary for user-owned database rows.
- AI training data requires consent and administrator review.
