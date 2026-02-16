# UI Ticket 01 — Shared Sidebar Shell for all /app/*

## Goal
Move the sidebar/navigation UI into the shared layout so it appears consistently on every /app/* route.

## Current behavior
- Sidebar appears on /app (dashboard) only.
- Other /app/* pages use a "Back" pattern and lack consistent navigation.

## Target behavior
- All /app/* routes render inside a shared app shell:
  - Left sidebar (nav links + badges)
  - Main content area (page content)
- Routes and link targets must remain unchanged.
- No DB changes. No Supabase logic changes.

## Acceptance Criteria
- Sidebar appears on:
  - /app
  - /app/feed
  - /app/messages
  - /app/directory
  - /app/faculty
  - /app/questions
  - /app/me
  - /app/profile/[id]
  - /app/admin (still gated by role in page)
- Existing navigation continues to work.
- Page content is not broken (scrolling and spacing ok).
- Existing badges (messages/questions) remain functional (or temporarily hidden if needed, but no logic removed).

## Non-goals
- Redesign visuals (that is UI Ticket 02).
- Add new features.
