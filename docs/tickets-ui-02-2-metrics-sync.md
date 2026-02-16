# UI-02.2 Metrics Sync (Unread Messages + Q&A Activity)

## Problem
- Dashboard stat cards and sidebar badges are inconsistent.
- Counts only update after hard refresh.
- After opening /app/messages, dashboard count drops but sidebar badge stays (or vice versa).
- Same issue for Questions/Q&A activity.

## Goal
- One shared metrics source used by BOTH sidebar and dashboard.
- Poll every 5–10 seconds.
- Expose refresh() and call it after "mark as read" operations on messages/questions pages.

## Scope
- Frontend state + polling only.
- No DB changes, no migrations.
- No route changes.

## Acceptance
- In two browsers, when user B sends message to A:
  - A sees unread badge update without refresh (within poll interval)
- After A opens messages and reads:
  - dashboard + sidebar both update and match
- Same behavior for Q&A activity badge.
