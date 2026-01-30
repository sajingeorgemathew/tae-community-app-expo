Hotfix — Feed filter should include audience=all

Students filter must show posts where audience in (students, all)

Alumni filter must show posts where audience in (alumni, all)

All filter shows all posts (already RLS-filtered)

No DB changes

Only change: src/app/app/feed/page.tsx

npm run build must pass

3) Claude prompt (paste in VS Code Claude)

Implement docs/HOTFIX_FEED_FILTER_INCLUDES_ALL.md.

Only modify src/app/app/feed/page.tsx.
Fix the UI filter logic so:

filter=students shows students + all

filter=alumni shows alumni + all

filter=all shows everything
Keep behavior for ranking/shuffle and RLS unchanged.
Output: files changed + step-by-step local tests. Ensure build passes.