# M-03 — Messages Mobile Layout (list-only → thread-only)

## Goal
On mobile, Messages should behave like:
- Default: show conversation list
- When user selects a conversation: show thread only
- Provide a Back button to return to list

Desktop behavior must remain unchanged.

## Scope
- File: src/app/app/messages/page.tsx
- Styling/layout changes only.
- Keep all existing logic, polling, reads, queries, and state updates.

## Non-goals
- No refactors of data fetching
- No changes to Supabase logic
- No new routes or navigation system changes
- No new dependencies

## Acceptance
- Mobile (< md):
  - List view renders full width
  - Thread view renders full width after selecting a conversation
  - Back button returns to list
  - Composer stays visible and usable (no overflow)
- Desktop (>= md): identical layout as before
- `npx tsc --noEmit` passes
- `npm run build` passes

---

## What Changed

### File: `src/app/app/messages/page.tsx`

1. **`<main>` wrapper** — padding made responsive: `p-4 md:p-8` (was `p-8`). Gives mobile more screen real-estate.

2. **Left pane (conversation list)** — responsive visibility & width:
   - When no conversation selected: `flex w-full` (full-width on mobile).
   - When a conversation is selected: `hidden md:flex` (hidden on mobile, visible on desktop).
   - Desktop width unchanged: `md:w-[340px] md:min-w-[280px]`.

3. **Right pane (thread panel)** — responsive visibility:
   - When no conversation selected: `hidden md:flex` (hidden on mobile, visible on desktop placeholder).
   - When a conversation is selected: `flex` (visible everywhere).

4. **Back button** — added at the top of the thread header:
   - Visible only on mobile (`md:hidden`).
   - Navigates to `/app/messages` (clears `?c=` param), returning to the list view.
   - Styled consistently with existing dark mode classes.

### No logic changes
- No Supabase queries, polling intervals, read-receipt logic, or message-sending logic was modified.
- No variables or functions were renamed.
- No new state variables were added (the existing `conversationId` from `useSearchParams` drives the toggle).

## Manual Verification Steps

### Mobile (< 768px viewport or DevTools responsive mode)
1. Open `/app/messages` — conversation list should be full-width, no thread panel visible.
2. Tap a conversation — list hides, thread panel shows full-width with back arrow at top-left.
3. Tap the back arrow — returns to list view, thread panel hidden.
4. In thread view: verify messages scroll, header stays at top, composer stays pinned at bottom.
5. Send a message — composer works, message appears, scroll stays at bottom.
6. Verify dark mode: toggle theme, confirm back button and layout look correct.

### Desktop (>= 768px viewport)
1. Open `/app/messages` — two-pane layout visible (list + placeholder).
2. Click a conversation — thread appears in right pane, list stays visible in left pane.
3. Back button should NOT be visible on desktop.
4. Verify all existing behavior: unread badges, online indicators, message editing, file attachments, polling.
5. Verify dark mode still looks correct.
