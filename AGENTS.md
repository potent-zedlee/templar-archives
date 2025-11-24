# Repository Guidelines

## Project Structure & Module Organization
Next.js App Router lives in `app/` for archive/search/community/player routes plus server actions and API handlers. UI code sits in `components/` (features/ui/layout/dialogs), shared logic in `lib/`, client state in `stores/`, automations in `trigger/`, and ops helpers in `scripts/`. Keep migrations in `supabase/migrations/`, browser specs in `e2e/`, unit suites in `lib/__tests__` + `stores/__tests__`, and assets in `public/` and `styles/`.

## Build, Test, and Development Commands
- `npm run dev` – Next dev server on :3000; pair with `npx trigger.dev@latest dev --port 3001` to exercise analysis jobs.
- `npm run build` / `npm run start` – production build + serve.
- `npm run lint` and `npx tsc --noEmit` – ESLint + TypeScript checks; treat as pre-commit gates.
- `npm test`, `npm run test:coverage`, `npm run test:e2e` – Vitest suite, coverage report, and Playwright specs inside `e2e/`.
- `npm run admin -- --action=diagnose` (and `ops:*` scripts) – CLI diagnostics for jobs or Supabase drift.

## Coding Style & Naming Conventions
Code is strict TypeScript + React 19 with Tailwind. Use 2-space indentation, trailing commas, double quotes, and let `npm run lint` enforce formatting. Shared primitives use PascalCase filenames, while `lib` utilities stay kebab-case. Favor functional components, compose classes with `clsx`/`tailwind-merge`, and call Supabase through helpers in `lib/queries`.

## Testing Guidelines
Vitest config lives in `vitest.config.ts` with globals from `vitest.setup.ts`. Place unit specs beside the code inside `__tests__`, name them `*.test.ts`, reuse Supabase/Trigger mocks, and aim for ≥80 % statement coverage via `npm run test:coverage`. Browser flows (archive upload, search, admin) belong in Playwright specs under `e2e/` named `{feature}.spec.ts`; attach trace links in the PR when retries occur.

## Commit & Pull Request Guidelines
We follow Conventional Commits (`feat(trigger): …`, `fix: …`, `chore:`) with imperative subjects and optional scopes; squash WIP commits locally. Every PR must include a concise summary, a linked issue or `work-logs/` entry, and verification steps (`npm run lint`, `npm test`, `npm run test:e2e`). Attach screenshots for UI changes, flag Supabase migrations or Trigger.dev edits, and mention new env vars.

## Security & Configuration Tips
Copy `.env.example` to `.env.local`, supply Supabase/Anthropic/Google/Trigger.dev keys, and keep them out of Git. Rotate shared tokens before posting logs and scrub PII from exports placed in `docs/`. Confirm RLS or migration changes with `npm run admin -- --action=check-jobs`, delete temporary uploads from `public/` or Supabase buckets after testing, and rely on anonymized tournament samples for fixtures.
