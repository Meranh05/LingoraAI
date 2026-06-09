# Contributing to Lingora

Thank you for improving Lingora.

## Good contributions

- Fix a reproducible bug.
- Add tests around a provider or authorization boundary.
- Improve Vietnamese, English, Japanese or Thai translations.
- Add high-quality CEFR learning content with answer explanations.
- Improve accessibility, mobile layout or document processing.

## Local workflow

```bash
pnpm install
pnpm check
```

Create a focused branch and keep unrelated refactors out of the pull request.

## Pull request checklist

- The change has a clear user-facing reason.
- Auth and admin mutations are checked server-side.
- User-owned tables include appropriate RLS policies.
- No API key, service key, email or private conversation is committed.
- New UI works on desktop and mobile.
- `pnpm check` passes.

## AI and privacy

Do not add hidden collection or training behavior. Any contribution that uses
user data for evaluation or training must include explicit consent, data
minimization, anonymization and an auditable review step.
