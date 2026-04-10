# Expo Push Notification Architecture Blueprint (EXPO-PUSH-01)

Status: Blueprint only. No code, credentials, or migrations land in this ticket.

## 1. Summary

This document defines the recommended push notification architecture for the
TAE Community Expo mobile app. The goal is a minimal, incremental path that
works with the existing hosted Supabase backend and current Expo SDK 54 app
without disrupting `apps/web`.

**Recommendation in one sentence:** use `expo-notifications` + Expo Push
Service as the first transport, persist Expo push tokens in a new Supabase
`push_tokens` table, and send pushes from Supabase Edge Functions triggered
by existing messaging / Q&A events.

## 2. Current mobile app state (relevant findings)

Inspected `apps/mobile`:

- Expo SDK **54**, React Native 0.81, React 19.
- `app.json`: `scheme: "tae"`, bundle id `com.tae.community` (iOS + Android).
- `app.config.ts` already exposes runtime `extra` — easy place to surface
  `eas.projectId` later for Expo push token lookup.
- Plugins currently only include `expo-font`. `expo-notifications` is **not**
  yet installed.
- `expo-secure-store` is already installed (useful for any local token cache).
- Auth/session, messaging (`src/lib/messages.ts`,
  `src/lib/messagingEvents.ts`), Q&A (`src/lib/questions.ts`), and admin
  surfaces are all in place.
- Navigation uses `@react-navigation/native-stack` with per-feature stacks
  (`MessagesStack`, `QuestionsStack`, `FeedStack`, etc.) — suitable for
  deep-link routing from a tapped notification.

Supabase side (inspected `supabase/migrations`):

- Existing tables already cover conversations, messages, reads, deliveries,
  Q&A, profiles, super-admins.
- No `push_tokens` table yet — needs to be added in a follow-up.
- Messaging already has a "conversation deliveries" concept that can be a
  natural fan-out point for push.

## 3. Provider path: Expo Push Service (recommended)

**Chosen path:** `expo-notifications` + **Expo Push Service** for delivery.

Why Expo Push Service first:

1. The app is already an Expo-managed project on SDK 54. Expo Push is the
   path of least resistance — one HTTPS endpoint, one token format,
   per-message credentials handled by Expo.
2. It removes the need to integrate FCM HTTP v1 and APNs p8 signing in our
   server code before we even know the product fit. We still upload FCM /
   APNs credentials to EAS, but our backend only talks to
   `https://exp.host/--/api/v2/push/send`.
3. The abstraction is swappable later. Because we persist a single `token`
   column plus a `provider` discriminator (`expo` today, `fcm`/`apns`
   tomorrow), we can migrate off Expo Push without reshaping the table if we
   ever outgrow it.
4. Dev builds and EAS Build already produce Expo push tokens out of the box
   on real devices — no extra native glue.

Direct FCM/APNs would only become attractive if we later need:
- very high volume with sub-second fan-out,
- per-platform payload features Expo doesn't pass through,
- or stricter regional data residency than Expo's infrastructure.

None of those apply today.

## 4. Build and runtime constraints

- Push notifications require a **real device**. The iOS simulator cannot
  receive remote pushes; Android emulators only work with a Play-enabled
  image and are unreliable.
- **Expo Go is not supported** for remote push in SDK 53+. Development must
  use an **EAS development build** (or a production build) on a real device.
- `expo-notifications` must be added as a plugin in `app.config.ts` so its
  Android channel config and iOS entitlements are picked up at prebuild.

## 5. Token lifecycle

```
app launches
  └── user signs in
        └── request notification permission (iOS + Android 13+)
              └── if granted: Notifications.getExpoPushTokenAsync({ projectId })
                    └── upsert into push_tokens for (user_id, device_id)
                          └── keep local copy in SecureStore for diffing
```

Rules:

1. **Request permission lazily**, after sign-in, not at cold start, so the
   prompt has context. Re-prompt is not possible on iOS once denied — surface
   a Settings deep link in the UI as a follow-up.
2. **Device id**: generate a stable UUID v4 on first launch, store in
   `expo-secure-store` under a fixed key (e.g. `tae.deviceId`). This lets
   the same physical device map to one row even if the Expo push token
   rotates.
3. **Fetch token** with
   `Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig.extra.eas.projectId })`.
4. **Persist**: upsert into `push_tokens` keyed by `(user_id, device_id)`.
   Always overwrite `token`, `platform`, `app_version`, and
   `last_seen_at`.
5. **Token refresh**: register a
   `Notifications.addPushTokenListener` — on every fire, re-upsert.
6. **Sign out**: mark the current device row `enabled = false` (or delete).
   Do not leave an old user's token bound to a new account on the same
   device.
7. **Reinstall**: SecureStore is wiped on uninstall, so a new `device_id`
   will be generated — the old row ages out via `last_seen_at`.
8. **Stale tokens**: when Expo Push returns `DeviceNotRegistered`, the send
   worker disables that row.

## 6. Backend token table design

Proposed (for a **follow-up** migration, not this ticket):

```sql
create table public.push_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  device_id     text not null,
  token         text not null,
  provider      text not null default 'expo'
                check (provider in ('expo','fcm','apns')),
  platform      text not null check (platform in ('ios','android')),
  app_version   text,
  enabled       boolean not null default true,
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (user_id, device_id)
);

create index push_tokens_user_enabled_idx
  on public.push_tokens (user_id)
  where enabled;
```

RLS sketch (also for the follow-up ticket):

- `select`: only the owner (`user_id = auth.uid()`).
- `insert` / `update`: only the owner, and only their own `user_id`.
- `delete`: only the owner.
- The send pipeline reads via the **service role** inside an Edge Function,
  so it is not subject to RLS.

Why these choices:

- **Multi-device** via `(user_id, device_id)` uniqueness — a user on phone +
  tablet gets two rows.
- **`provider` discriminator** keeps the door open to direct FCM/APNs.
- **`enabled` flag** lets the send worker soft-disable without losing
  history; makes re-enable trivial.
- **Partial index** on `enabled` keeps fan-out queries cheap.

## 7. Send pipeline

Recommended shape for the follow-up implementation:

1. A Supabase **Edge Function** `send-push` accepts an internal payload
   `{ user_ids[], title, body, data }`, looks up enabled tokens, and POSTs
   batches to `https://exp.host/--/api/v2/push/send` (max 100 per batch).
2. Triggers call `send-push` rather than talking to Expo directly:
   - **Direct message created** → notify conversation members other than
     the sender.
   - **New answer on a question** → notify the question author.
   - (Optional, later) **Admin broadcast** → notify a selected audience.
3. The function interprets the response, disabling tokens on
   `DeviceNotRegistered` and logging `MessageTooBig` / `MessageRateExceeded`
   for observability.
4. Triggering can be either a Postgres trigger → `pg_net` → Edge Function,
   or a direct call from existing mutation RPCs. The blueprint leaves the
   exact wiring to the implementation ticket; Postgres trigger is preferred
   because it captures every write path uniformly.

The Expo access token (if we enable enhanced security) lives in the Edge
Function env as `EXPO_ACCESS_TOKEN`. No secrets land in the repo.

## 8. First notification triggers (wave 1)

Keep the first wave small:

1. **New direct message** — highest user value, aligns with existing
   `conversation_deliveries` plumbing.
2. **New answer to your question** — mirrors the Q&A engagement loop.

Explicitly deferred to a later wave:

- reactions / likes
- post comments
- mentions
- admin / system broadcasts
- digest / scheduled notifications

## 9. Mobile handling plan

- **Foreground**: set a `Notifications.setNotificationHandler` that shows a
  banner + sound for messaging and Q&A notifications; silently drops
  duplicates of the currently open conversation/question.
- **Background / killed**: rely on OS presentation.
- **Tap routing**: attach a `data` payload such as
  `{ type: 'dm', conversationId }` or `{ type: 'qa_answer', questionId }`.
  A navigation ref listener in `RootNavigator` translates `data.type` to the
  right stack:
  - `dm` → `MessagesStack` → `ConversationScreen`
  - `qa_answer` → `QuestionsStack` → `QuestionDetailScreen`
- **Cold start**: on app launch, check
  `Notifications.getLastNotificationResponseAsync()` and route once the nav
  tree is mounted.
- **Preferences (later)**: a simple per-category toggle in `MeScreen`,
  persisted on the server so it follows the user across devices. Not in
  wave 1.

## 10. Credentials / build checklist

Nothing here is done in this ticket — this is the operator runbook for the
implementation tickets.

Android (FCM):
- [ ] Create Firebase project, add Android app with package
      `com.tae.community`.
- [ ] Download `google-services.json`, upload to EAS via
      `eas credentials` (never commit).
- [ ] Confirm FCM **HTTP v1** is enabled on the Firebase project (Expo Push
      now uses v1).
- [ ] Add `expo-notifications` plugin to `app.config.ts` with an explicit
      default channel.

iOS (APNs):
- [ ] Apple Developer account with App ID `com.tae.community` and Push
      Notifications capability enabled.
- [ ] Generate an APNs **auth key (.p8)** in the Apple Developer portal.
- [ ] Upload to EAS via `eas credentials` (never commit).
- [ ] Confirm `aps-environment` entitlement ships in the dev and prod
      builds.

EAS / Expo:
- [ ] `eas init` to bind the repo to an EAS project, then surface
      `projectId` via `extra.eas.projectId` in `app.config.ts`.
- [ ] Create an `EXPO_ACCESS_TOKEN` (enhanced security) and store only in
      Edge Function env.
- [ ] Configure a `development` EAS profile with a dev client for on-device
      testing.

Supabase:
- [ ] Add `push_tokens` table + RLS in a dedicated migration.
- [ ] Deploy `send-push` Edge Function; add `EXPO_ACCESS_TOKEN` and
      `SUPABASE_SERVICE_ROLE_KEY` to its env.

Repo hygiene:
- [ ] No `google-services.json`, no `.p8`, no access tokens committed.
- [ ] `.env.example` gains placeholder entries only.

## 11. Testing strategy

- Real iOS device + real Android device, both running a dev client built
  via EAS.
- Two test accounts. Verify:
  1. DM from A to B triggers a push on B's device; tapping opens the right
     conversation from cold start, background, and foreground.
  2. Q&A answer notification opens the right question.
  3. Sign-out on device disables its row; a follow-up send to that user
     excludes that device.
  4. Reinstall on the same device produces a new row; the old row is not
     re-targeted.
- Use Expo's push tool (`https://expo.dev/notifications`) as a sanity check
  before wiring the server path.
- Unit-test the token upsert and the `DeviceNotRegistered` cleanup path
  against a local Supabase.

## 12. Follow-up implementation tickets

Proposed sequence. Each is small, independently reviewable, and reversible.

1. **EXPO-PUSH-02 — mobile: install and configure `expo-notifications`.**
   Add dependency, register plugin in `app.config.ts`, add Android default
   channel, iOS permission strings. No server code. No token upload yet.
2. **EXPO-PUSH-03 — db: `push_tokens` table + RLS.** Migration only. No
   app writes yet.
3. **EXPO-PUSH-04 — mobile: token registration flow.** Permission prompt,
   `device_id` in SecureStore, `getExpoPushTokenAsync`, upsert to
   `push_tokens`, sign-out disable, refresh listener.
4. **EXPO-PUSH-05 — edge function: `send-push`.** Accepts internal payload,
   batches to Expo Push, handles receipts, disables dead tokens. No
   triggers wired yet — invoked manually in tests.
5. **EXPO-PUSH-06 — trigger: direct message push.** Postgres trigger or RPC
   hook that calls `send-push` on message insert, skipping the sender.
6. **EXPO-PUSH-07 — trigger: Q&A answer push.** Same shape as PUSH-06 for
   the answer-to-question event.
7. **EXPO-PUSH-08 — mobile: tap routing + foreground handler.** Deep link
   into the right screen from `data.type`, handle cold-start responses.
8. **EXPO-PUSH-09 — credentials & EAS dev build runbook.** Operator-side
   ticket for FCM / APNs upload via `eas credentials` and first real-device
   test. Doc-only changes in the repo.
9. **EXPO-PUSH-10 — preferences (later wave).** Per-category toggles in
   `MeScreen`, server-persisted.

## 13. Explicit non-goals for this ticket

- No dependency changes.
- No `app.config.ts` plugin changes.
- No migrations.
- No Edge Functions.
- No credential uploads.
- No secrets anywhere in the repo.
