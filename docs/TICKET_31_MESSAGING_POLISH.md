Ticket 31 — Messaging polish (WhatsApp-style scroll + composer)

Goal
Make messaging feel “client-ready” like WhatsApp:

When opening a conversation, it should land at the bottom (latest message).

No weird “auto-scroll to middle / a few messages above bottom”.

If user scrolls up, polling should NOT yank them back down.

Shift+Enter should insert a newline; Enter should send.

Scope (UI only, NO DB changes)
Update only:

src/app/app/messages/page.tsx

Behavior requirements

A) Scroll behavior (WhatsApp-like)

When a conversation is selected (conversationId):

On first open / conversation switch:

Scroll to bottom immediately (no smooth) after layout settles

Must not land “a bit above bottom”

During polling updates:

If user is already near bottom (threshold ~120px), auto-scroll to bottom when new messages arrive

If user scrolled up, do NOT auto-scroll

Keep stable (no flicker)

Media load stabilization:

If an image/video loads and changes layout height:

If user is near bottom, keep pinned to bottom

Otherwise do nothing

B) Composer behavior

Enter = send (preventDefault)

Shift+Enter = newline (no send)

Keep existing “don’t send empty/whitespace-only” logic

Guardrails

Do not create scroll loops or effects that re-trigger endlessly

Preserve existing polling, unread indicators, read receipts behavior

Done when

Opening any conversation lands at bottom (latest message)

Polling never yanks user down if they scrolled up

New incoming messages auto-scroll only when user is near bottom

Shift+Enter adds newline, Enter sends

npm run build passes

---

## Implementation Summary

**File changed:** `src/app/app/messages/page.tsx`

### A) WhatsApp-style scroll

- Added refs: `messagesContainerRef`, `userScrolledUpRef`, `lastAutoScrollMessageIdRef`
- `isNearBottom(container, threshold=120)` — checks if user is within 120px of bottom
- `scrollToBottom(behavior)` — scrolls the container to the very bottom
- **Conversation switch:** a `useEffect` on `conversationId` resets scroll state and uses double `requestAnimationFrame` to scroll to bottom after layout settles (fixes the "lands a few messages above bottom" bug)
- **Message changes:** a `useEffect` on `messages` tracks the last message ID; on first load it scrolls instantly, on new messages it smooth-scrolls only if user hasn't scrolled up
- **onScroll handler** on the container sets `userScrolledUpRef` so polling never yanks scroll
- **Media load:** `onLoad` (img) and `onLoadedMetadata` (video) call `handleMediaLoad` which re-pins to bottom only if user is near bottom

### B) Composer

- Replaced `<input type="text">` with `<textarea rows={1} resize-none>`
- `onKeyDown`: Enter without Shift calls `handleSend` (with empty-text guard); Shift+Enter falls through for newline

### Why scroll no longer lands above bottom

The old code used `messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })` inside a `useEffect` on `[messages]`. This fired before images/layout finished rendering, so the scroll target was stale. The fix uses double `requestAnimationFrame` on conversation switch (waits for the browser to complete two paint cycles) and `container.scrollTo({ top: scrollHeight })` which targets the actual container height, ensuring the scroll lands at the true bottom.

## Local Test Checklist

1. Open a conversation with many messages — verify it lands exactly at the bottom (no gap)
2. Switch between conversations — each should land at bottom instantly
3. Scroll up in a conversation, wait for a poll cycle (~3s) — verify scroll stays put
4. Scroll back to bottom, wait for poll — verify new messages auto-scroll smoothly
5. Have another user send a message while you are near bottom — verify auto-scroll
6. Have another user send a message while you are scrolled up — verify no scroll jump
7. Send a message with an image attachment — verify scroll stays at bottom after image loads
8. In the composer, press Shift+Enter — verify newline is inserted, message is NOT sent
9. Type text and press Enter — verify message is sent
10. Press Enter with empty input — verify nothing is sent
11. Run `npm run build` — verify it passes with no errors