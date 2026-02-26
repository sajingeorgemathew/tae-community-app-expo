# MONO-01 — Monorepo skeleton (apps/web, apps/mobile, packages/shared)

## Goal
Create a monorepo skeleton inside tae-community-app-expo with:
- apps/web (Next.js app will move here in MONO-02)
- apps/mobile (Expo app will be created later)
- packages/shared (shared types + supabase wrapper later)

Set up root workspace tooling so we can run scripts from root safely.

## Non-goals
- Do not move the Next.js app yet (that is MONO-02)
- Do not create the Expo app yet
- Do not change any application logic
- Do not modify Supabase policies or DB

## Steps
1) Create folder structure:
   - apps/web
   - apps/mobile
   - packages/shared
2) Choose a workspace manager:
   - Prefer npm workspaces if repo already uses npm + package-lock.json
   - Otherwise use pnpm (but only if already present)
3) Add root package.json workspace config and scripts:
   - web:dev, web:build, web:typecheck
   - (these can be placeholders until MONO-02)
4) Add packages/shared package.json (empty scaffold)
5) Add minimal README notes explaining structure and next tickets.

## Acceptance criteria
- Repo has the new folders
- Root workspace config exists (package.json updated)
- No breaking changes to existing Next.js app (still at root for now)
- `npx tsc --noEmit` still passes (if currently passing)
- `npm run build` still passes (if currently passing)

## Test plan
- npx tsc --noEmit
- npm run build
- Confirm new scripts exist (even if they are placeholders until MONO-02)

---

## Implementation notes (completed)

### What changed
1. **Folder structure created**: `apps/web/`, `apps/mobile/`, `packages/shared/` with `.gitkeep` files so git tracks the empty app dirs.
2. **npm workspaces enabled**: Added `"workspaces": ["apps/*", "packages/*"]` to root `package.json`.
3. **Placeholder scripts added**: `web:dev`, `web:build`, `web:typecheck` echo placeholder messages. Existing `dev`/`build`/`start`/`lint` scripts are unchanged.
4. **`@tae/shared` package scaffolded**: `packages/shared/package.json` with `main`/`module`/`types` pointing to `./src/index.ts`. A minimal `src/index.ts` exports nothing yet.
5. **README.md added**: Describes the monorepo structure, current state, available scripts, and workspace tooling.

### Why scripts are placeholders
The Next.js app still lives at the repo root. The `web:*` scripts cannot target `apps/web` yet because the source code hasn't moved. MONO-02 will relocate the app into `apps/web/` and update these scripts to use `npm -w apps/web run ...`.

### Next steps
- **MONO-02**: Move the Next.js app into `apps/web/`, update imports, and wire up `web:*` scripts.
- **Future tickets**: Create Expo app in `apps/mobile/`, populate `@tae/shared` with shared types and Supabase contracts.