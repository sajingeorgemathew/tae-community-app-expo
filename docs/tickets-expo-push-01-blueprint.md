# EXPO-PUSH-01 — Push notification architecture blueprint

## Goal
Define the push notification architecture for the Expo mobile app before implementation.

## Why
Push notifications touch mobile app config, device permissions, token registration, backend storage, and server-side delivery. We need a clear blueprint before wiring real notification flows.

## Scope
This ticket should:
1) inspect the current mobile app architecture
2) inspect current backend/Supabase capabilities relevant to notifications
3) define the recommended Expo push path
4) define token storage strategy
5) define first notification use-cases
6) define implementation sequence for follow-up tickets

## Explicitly included
- architecture blueprint document
- recommended provider path
- token lifecycle design
- event trigger planning
- environment/credential planning
- implementation roadmap

## Explicitly NOT included
- No real notification code yet
- No credential setup yet
- No EAS build config changes yet
- No push token table migration yet
- No send pipeline yet

## Current platform constraints to respect
- Push notifications require a real device
- Expo Go is not the target path for push notifications in current Expo workflow
- EAS Build / development builds should be treated as the expected path

## Decision areas the blueprint must answer

### Notification transport
- Use Expo push service first, or direct FCM/APNs?
- Recommendation should optimize for speed and reliability in this project

### Device token lifecycle
- how to request permission
- how to fetch Expo push token
- where to store it
- how to handle token refresh / reinstall / logout

### Backend storage
- recommended table shape for push tokens
- support for multiple devices per user
- enabled/disabled status
- platform and project metadata

### First notification triggers
Recommend first wave only, for example:
- new direct message
- answer to a question
- post interaction or admin alert only if practical

### Client behavior
- foreground handling
- open-app routing when notification is tapped
- notification preferences / later roadmap

### Credentials / build path
- Android FCM credential setup
- iOS APNs credential setup
- EAS expectations
- local/dev testing expectations

## Important implementation note
Claude should inspect the current repo and recommend a minimal, scalable first path.

Preferred default:
- Expo push service
- expo-notifications
- EAS Build / dev build
- Supabase-backed push token persistence

## Existing context
Already working:
- Expo mobile app
- auth/session system
- messaging
- questions/answers
- admin system
- Supabase backend
- hosted Supabase project

## Expected output
This ticket should produce a blueprint doc that includes:
1) recommended push architecture
2) token storage design
3) initial notification trigger list
4) implementation sequence for next tickets
5) environment/credential checklist
6) testing strategy

## Technical constraints
- Do NOT change apps/web behavior
- Keep this ticket documentation-heavy
- No production credentials should be committed
- Keep follow-up plan compatible with current Expo + Supabase architecture

## Files likely to touch
- docs/tickets-expo-push-01-blueprint.md
- docs/expo-push-architecture-blueprint.md

## Acceptance criteria
- push architecture blueprint exists
- provider path is clearly chosen
- token storage model is clearly defined
- follow-up implementation tickets are defined
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit

## Manual review
1) Read the blueprint
2) Confirm it clearly explains:
   - provider path
   - token storage
   - first triggers
   - credential steps
   - follow-up tickets