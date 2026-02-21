# DM-10 — Admin Dashboard Dark Mode Polish

## Goal
Make /app/admin readable + consistent in dark mode without changing logic.

## Scope
- src/app/app/admin/page.tsx
- (optional) tiny dark styling for shared shells used ONLY by admin (no logic)

## Non-goals
- No Supabase query changes
- No routing/auth changes
- No PostCard logic changes
- No feature behavior changes

## What to polish
- Page background + header + back link
- Section cards (Posts Moderation / Tutors / Users Management)
- Filters (audience/time pills)
- Bulk action bars
- Tables: header bg, borders, row hover, text contrast
- Inputs: search boxes
- Badges/chips: role/status/tutor/course chips
- Course dropdown dark surface (if present)
- Empty states + loading state

## Implementation Log

### Changes applied to `src/app/app/admin/page.tsx`

All changes are styling-only (Tailwind `dark:` variants). No logic, queries, or component props were modified.

| Area | What was added |
|------|---------------|
| Back link | `dark:text-blue-400` |
| Audience filter pills (active) | `dark:bg-slate-200 dark:text-slate-900` for inverted active state |
| Time filter pills (active) | `dark:bg-slate-200 dark:text-slate-900` for inverted active state |
| Tutors section card | `dark:bg-slate-950 dark:border-slate-700` |
| Tutors section header divider | `dark:border-slate-800` |
| Tutors section title | `dark:text-slate-100` |
| Users section card | `dark:bg-slate-950 dark:border-slate-700` |
| Users section header divider | `dark:border-slate-800` |
| Users section title | `dark:text-slate-100` |
| Users search input | `dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400/30` |
| Users bulk action "selected" count | `dark:text-slate-500` |
| User name link in table | `dark:text-blue-400` |

### Already present (no changes needed)

These areas already had correct dark mode classes from prior work:

- Page `<main>` background (`dark:bg-slate-950`)
- Dashboard title (`dark:text-slate-100`)
- Loading state spinner + text
- Not Authorized card
- Posts section card, header, title
- Audience/time filter labels (`dark:text-slate-500`)
- Inactive filter pills (`dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700`)
- Bulk action bars (posts + users: `dark:bg-slate-900 dark:border-slate-800`)
- Bulk action labels (`dark:text-slate-300`)
- Post bulk "selected" count (`dark:text-slate-500`)
- Empty state text (`dark:text-slate-500`)
- Tutor table: thead bg, th text, tbody dividers, row hover, name/program/grad year text, role badge, course chips, course dropdown trigger/panel, select inputs
- Users table: thead bg, th text, tbody dividers, row hover, program/grad year text, role badge, status badges (disabled/active)

## Verification

### Automated
```bash
npx tsc --noEmit   # must pass
npm run build       # must pass
```

### Manual checklist
- [ ] Open `/app/admin` in dark mode
- [ ] Page background is slate-950
- [ ] "Back to App" link is blue-400
- [ ] "Admin Dashboard" title is slate-100
- [ ] **Posts Moderation** card: dark bg, dark border, dark header divider
- [ ] Active audience/time filter pills are inverted (light bg, dark text)
- [ ] Inactive filter pills are slate-800 bg with slate-300 text
- [ ] Bulk action bar has dark bg/border
- [ ] Post checkboxes and "Delete Selected Posts" button visible
- [ ] Empty state text is slate-500
- [ ] **Tutors** card: dark bg, dark border, dark header divider, title is slate-100
- [ ] Tutor search input has dark bg/border/text
- [ ] Tutor table: dark thead, dark row dividers, dark hover, text contrast OK
- [ ] Role select dropdown has dark bg/border
- [ ] Course dropdown trigger has dark bg/border
- [ ] Course dropdown portal panel has dark bg/border
- [ ] Course chips (blue) have dark variant colors
- [ ] **Users Management** card: dark bg, dark border, dark header divider, title is slate-100
- [ ] Users search input has dark bg/border/text
- [ ] Users bulk action bar has dark bg/border
- [ ] Users table: dark thead, dark row dividers, dark hover
- [ ] User name links are blue-400 in dark mode
- [ ] Role badges are slate-800 bg in dark mode
- [ ] Status badges (Active=emerald, Disabled=red) have dark variants
- [ ] Enable/Disable buttons remain visible
- [ ] "Load more" buttons remain visible
- [ ] PostCard renders unchanged (no props modified)
- [ ] All functionality still works (select, bulk delete, course assignment, etc.)
