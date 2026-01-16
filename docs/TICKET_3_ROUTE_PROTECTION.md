Ticket 3 — Route protection

Add Next.js middleware to protect /app and /app/*

If user is not authenticated, redirect to /login

If user is authenticated, allow request

Optional: If authenticated user visits /login or /signup, redirect to /app

Use Supabase session/cookies (Next.js App Router compatible)

Keep changes minimal; do not refactor unrelated code

Do not change DB schema / RLS / env files

Provide test steps