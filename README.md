# TAE Community App

Monorepo for the TAE community platform (web + mobile).

## Structure

```
├── apps/
│   ├── web/          # Next.js web app (will be moved here in MONO-02)
│   └── mobile/       # Expo React Native app (future)
├── packages/
│   └── shared/       # Shared types, contracts, and utilities (@tae/shared)
├── src/              # Current Next.js app source (root-level, pre-migration)
└── package.json      # npm workspaces root
```

## Current State

The Next.js app still lives at the repo root (`src/`, `app/`, etc.).
MONO-02 will relocate it into `apps/web/`.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server (current root app) |
| `npm run build` | Build Next.js app (current root app) |
| `npm run lint` | Run ESLint |
| `npm run web:dev` | Placeholder — will target `apps/web` after MONO-02 |
| `npm run web:build` | Placeholder — will target `apps/web` after MONO-02 |
| `npm run web:typecheck` | Placeholder — will target `apps/web` after MONO-02 |

## Workspace Tooling

Uses **npm workspaces** (`"workspaces": ["apps/*", "packages/*"]` in root `package.json`).
