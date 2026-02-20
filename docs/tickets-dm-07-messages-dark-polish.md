# DM-07 — Messages Dark Mode Polish

## Goal
Make /app/messages readable + premium in dark mode WITHOUT touching logic.

## Targets
- src/app/app/messages/page.tsx

## Rules / Safety
- Styling-only: Tailwind `dark:` classes and/or shared CSS variables
- Do NOT change Supabase queries, polling, read receipts, routing, state shape, or event handlers
- No refactors. No moving logic. No renaming variables.

## Acceptance Criteria
- Conversation list has distinct surface in dark mode
- Hover + selected conversation states are obvious
- Unread state stands out but not neon
- Thread panel background + message bubbles readable
- Composer input + send button have correct contrast, focus ring visible
- No visual regressions in light mode

## Changes Made

### Page wrapper
- Back link: `dark:text-slate-300 dark:hover:text-white`
- Page title: `dark:text-slate-100`

### Left pane (conversation list)
- Container: `dark:bg-slate-900 dark:border-slate-700`
- Header: `dark:border-slate-700`, title `dark:text-slate-100`
- Dividers: `dark:divide-slate-800`

### ConversationItem
- Active state: `dark:bg-slate-700/40 dark:border-l-slate-400`
- Hover state: `dark:hover:bg-slate-800/60`
- Online dot: `dark:border-slate-900`
- Unread name: `dark:text-slate-100`, normal: `dark:text-slate-300`
- Timestamp unread: `dark:text-slate-200`, normal: `dark:text-slate-500`
- Last message unread: `dark:text-slate-300`, normal: `dark:text-slate-500`
- Unread badge: `dark:bg-slate-200 dark:text-slate-900` (inverted for contrast)

### Right pane (thread)
- Container: `dark:bg-slate-900`
- Thread header: `dark:bg-slate-900 dark:border-slate-700`
- Thread header name: `dark:text-slate-100`
- Online badge: `dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800`
- Empty state icon/text: `dark:text-slate-500` / `dark:text-slate-600`
- Messages area: `dark:bg-slate-950/50`
- Day separator: `dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700`

### MessageBubble
- Own bubble: `dark:bg-slate-700` (lighter than background)
- Incoming bubble: `dark:bg-slate-800 dark:text-slate-100`
- Edit button hover: `dark:hover:text-slate-200`
- Inline edit textarea: `dark:text-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:focus:border-slate-400`
- Cancel button: `dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500`
- Save button: `dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300`

### Composer
- Container: `dark:bg-slate-900 dark:border-slate-700`
- File preview: `dark:bg-slate-800 dark:border-slate-700`, filename `dark:text-slate-300`
- Attach button: `dark:hover:text-slate-200 dark:hover:bg-slate-800`
- Textarea: `dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400/20`
- Send button: `dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300` (inverted for contrast)
- Hint text: `dark:text-slate-500`

## Verification
- Toggle Light/Dark from sidebar
- Navigate Messages: list -> open thread -> send message -> refresh -> unread indicators still behave same
- `npx tsc --noEmit` — PASS
- `npm run build` — PASS

## Testing Steps
1. Toggle dark mode via sidebar toggle
2. Verify conversation list: dark background, visible dividers, readable names
3. Hover over conversations: subtle hover highlight visible
4. Click a conversation: selected state has left border + tinted background
5. Check unread conversations: bold text + badge with inverted colors
6. Verify thread panel: dark background, readable header with name
7. Check message bubbles: own (slate-700) vs incoming (slate-800) distinguishable
8. Test inline edit: textarea, cancel/save buttons all readable
9. Check day separator pills: dark bg with border
10. Test composer: textarea dark bg, visible border, focus ring on click
11. Test send button: inverted contrast (light on dark)
12. Attach button: hover state visible
13. Switch back to light mode: verify no visual regressions
