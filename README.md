# TAE Community App

Monorepo for the TAE community platform (web + mobile).

## Structure

```
├── apps/
│   ├── web/          # Next.js web app
│   └── mobile/       # Expo React Native app (future)
├── packages/
│   └── shared/       # Shared types, contracts, and utilities (@tae/shared)
└── package.json      # npm workspaces root
```

## Scripts (run from repo root)

| Script | Description |
|---|---|
| `npm run web:dev` | Start Next.js dev server |
| `npm run web:build` | Build Next.js app |
| `npm run web:start` | Start Next.js production server |
| `npm run web:lint` | Run ESLint on web app |
| `npm run web:typecheck` | Run TypeScript check on web app |

## Environment

Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the values.

## Workspace Tooling

Uses **npm workspaces** (`"workspaces": ["apps/*", "packages/*"]` in root `package.json`).
