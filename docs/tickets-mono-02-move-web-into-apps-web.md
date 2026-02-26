# MONO-02 — Move Next.js app into apps/web and wire root scripts

## Status: Done

## Goal
Move the existing Next.js web app (currently at repo root) into `apps/web/` and update root scripts to run the web app from there.

## Non-goals
- Do not create the Expo app yet
- Do not change app behavior, routing, styling, or Supabase logic
- Do not change database policies or migrations
- Do not refactor components or file structure inside the Next.js app beyond the move

## What moved

| From (root) | To |
|---|---|
| `src/` | `apps/web/src/` |
| `public/` | `apps/web/public/` |
| `next.config.ts` | `apps/web/next.config.ts` |
| `tsconfig.json` | `apps/web/tsconfig.json` |
| `postcss.config.mjs` | `apps/web/postcss.config.mjs` |
| `eslint.config.mjs` | `apps/web/eslint.config.mjs` |
| `next-env.d.ts` | `apps/web/next-env.d.ts` |
| `.env.example` | `apps/web/.env.example` |

## Package strategy

- **Root `package.json`**: workspace root only — no Next.js dependencies, only workspace scripts.
- **`apps/web/package.json`** (`@tae/web`): contains all Next.js dependencies and scripts (`dev`, `build`, `start`, `lint`, `typecheck`).
- Single `package-lock.json` at root via npm workspaces.

## Root scripts

| Script | Target |
|---|---|
| `npm run web:dev` | `npm -w @tae/web run dev` |
| `npm run web:build` | `npm -w @tae/web run build` |
| `npm run web:start` | `npm -w @tae/web run start` |
| `npm run web:lint` | `npm -w @tae/web run lint` |
| `npm run web:typecheck` | `npm -w @tae/web run typecheck` |

## Verification

From repo root:
```bash
npm run web:typecheck   # passes
npm run web:build       # passes
```

## Notes
- `.env.local` must be placed in `apps/web/` (Next.js reads env from its cwd).
- `.gitignore` updated to use non-rooted paths so `.next/`, `node_modules/`, etc. are ignored in subdirectories too.
- `apps/mobile/` and `packages/shared/` are untouched.

## Original steps (for reference)
1) Create `apps/web/` as the Next.js app root.
2) Move all Next.js app files/folders from repo root into `apps/web/`.
3) Update root package.json scripts.
4) Ensure TypeScript/build still works when run from apps/web.
5) Update README to reflect new commands.
6) Update this ticket doc with implementation notes.

## Acceptance criteria
- [x] Next.js app fully lives under apps/web/
- [x] `npm run web:build` works from repo root
- [x] `npm run web:dev` works from repo root
- [x] `npm run web:typecheck` works from repo root
- [x] No functional changes beyond relocation
- [x] Repo still has apps/mobile and packages/shared untouched
