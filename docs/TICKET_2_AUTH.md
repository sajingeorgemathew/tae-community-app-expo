Goal: Implement working Supabase email/password auth flow in Next.js.

Pages:

/signup (email, password, full name)

/login (email, password)

/app (simple protected landing; if no session → redirect to /login)

Logout: button in /app that signs out and redirects to /login

Profile existence: After signup/login, ensure a profiles row exists for the current user (id = auth.uid()).

If trigger already created it, do nothing.

If not found, create it.

UI: minimal Tailwind, no UI library, no design work.

Constraints:

Don’t change DB schema.

Don’t edit SQL policies.

Don’t touch .env.local.

Don’t add new dependencies unless absolutely required (and ask first).

Definition of done:

Can sign up

Can log in

Can log out

/app is inaccessible when logged out

Profile row exists after auth