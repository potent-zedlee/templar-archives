# Role
You are a Senior DevOps & Frontend Architect specializing in Next.js 15 and Supabase projects. Your task is to reorganize the project directory structure to improve maintainability and scalability, following Domain-Driven Design (DDD) principles.

# Context
The current project has a "Script Jungle" in the `scripts/` folder and "Component Overload" in the `components/` root. We need to clean this up without breaking the application logic.

# Goal
Move files to appropriate subdirectories based on their function and update all import paths (`import ... from ...`) to reflect the changes.

# Instructions

## 1. Scripts Cleanup (`/scripts`)
The goal is to make `admin-cli.ts` the main entry point and archive one-off scripts.

- **Create Folder:** `scripts/legacy`
- **Action:** Move all `.mjs` files that look like one-off fixes (e.g., `check_db.mjs`, `fix_stuck_jobs.mjs`, `update-rpc*.mjs`) into `scripts/legacy/`.
- **Create Folder:** `scripts/ops` (Operations)
- **Action:** Move operational standalone scripts (e.g., `generate-hand-thumbnails.ts`, `logo-management.ts`) into `scripts/ops/`.
- **Keep:** Keep `admin-cli.ts`, `package.json`, `tsconfig.json` (if any) in the root of `scripts/`.

## 2. Components Cleanup (`/components`)
The root of `/components` is too crowded. Group them by feature.

- **Create & Move:**
  - `components/features/hand`: Move `HandCard.tsx`, `HandList*.tsx`, `Hand*.tsx` (related to poker hands).
  - `components/features/player`: Move `Player*.tsx`, `AddPlayersDialog.tsx`, `ClaimPlayerDialog.tsx`.
  - `components/features/tournament`: Move `Tournament*.tsx`, `ArchiveTournament*.tsx`.
  - `components/features/community`: Move `Community*.tsx`, `PostComments.tsx`.
  - `components/home`: Move `HeroSection.tsx`, `WeeklyHighlights.tsx`, `LatestPosts.tsx`, `StatsCounter.tsx`, `TopPlayers.tsx`.
  - `components/layout`: Move `Footer.tsx`, `PageTransition.tsx`, `DiscoveryLayout.tsx`.
  - `components/common`: Move generic UI components that are NOT in `components/ui` (e.g., `AnimatedCard.tsx`, `EmptyState.tsx`, `LogoPicker.tsx`, `NotificationBell.tsx`).

## 3. Import Path Updates (CRITICAL)
- After moving the files, **you must update all import paths** in the entire project to point to the new locations.
- Check `tsconfig.json` paths alias (`@/*`). Ensure imports use the alias correctly (e.g., `import HandCard from "@/components/features/hand/HandCard"`).

## 4. Clean Root Level
- Analyze the root directory. If there are temporary files like `gemini_upgrade.md`, `check_db.mjs` (if in root), move them to a new `_archive/` folder in the root.

# Safety Rules
1.  **Do not delete** any code logic. Only move files.
2.  If a file is imported by another file, update the reference immediately.
3.  If you are unsure about a component's category, move it to `components/common/misc` rather than leaving it in the root.
4.  Run a "dry run" analysis first: List the moves you plan to make before executing.