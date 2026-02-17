# UI-03.3 Messages UI Redesign

## Goal
Redesign /app/messages to match the premium white/navy theme.

## Critical Rule
DO NOT break:
- Polling intervals
- Read receipt logic
- Delivery tracking
- Conversation creation logic
- Existing RPC calls
- Metrics context logic

UI only.

## Design Requirements

### Layout
- Two-column layout:
  - Left: conversation list (fixed width, card-style)
  - Right: thread view

### Conversation List
- Each conversation:
  - Avatar
  - Name
  - Last message preview
  - Time
  - Unread badge (if > 0)
  - Active state highlight
- Clean hover effect
- Scrollable list

### Thread Area
- Header:
  - Avatar
  - Name
  - Presence dot (if already implemented)
- Messages:
  - Left/right alignment
  - Navy bubble for own messages
  - Light gray bubble for others
  - Timestamp subtle
- Composer:
  - Rounded input
  - Attachment button (if exists)
  - Send button styled navy
  - Disabled state while sending

## Inspiration
See docs/messages.png.
Use as visual inspiration only.
Ignore any elements that do not match current app logic.

## Acceptance
- Polling still works (3s/6s)
- Read receipts still update
- Unread badges update properly
- No console errors
- No API/RPC changes

---

## Implementation Notes

### What Changed (UI Only)
1. **Extracted sub-components**: `ConversationItem`, `MessageBubble`, `Composer` — defined in the same file for minimal footprint, purely presentational wrappers around existing logic.

2. **Conversation List (left pane)**:
   - Fixed width 340px with min-width 280px
   - Card-style rows with avatar, name, last message preview, timestamp
   - Active conversation: navy tint background (`bg-[#1e293b]/10`) + navy left border accent
   - Unread badge: navy pill with count (up to 99+)
   - Smooth hover state (`hover:bg-slate-50`)
   - Dividers between items

3. **Thread Header**:
   - Avatar + name + "Online" pill badge (emerald green) when presence is available
   - Clean white background, subtle bottom border

4. **Message Bubbles**:
   - Own messages: navy background (`bg-[#1e293b]`), white text, rounded-2xl with flattened bottom-right corner
   - Other messages: light slate background (`bg-slate-100`), dark text, rounded-2xl with flattened bottom-left corner
   - Subtle timestamps in slate-400
   - Read/delivered ticks use emerald for read status
   - Messages area has subtle off-white background (`bg-slate-50/50`)

5. **Composer**:
   - Rounded circular attach button with + icon (SVG)
   - Rounded textarea input (`rounded-2xl`) with focus ring
   - Circular navy send button with paper plane icon (SVG)
   - Spinner animation while sending
   - Helper text: "Press Enter to send, Shift + Enter for new line"

6. **Day Separators**: Pill with white background, subtle shadow and border

7. **Empty States**: Icon + text for no conversation selected; spinner for loading

8. **Back to App link**: Navy-themed instead of blue

### What Was NOT Changed
- All polling intervals (6s conversations, 3s messages)
- All RPC calls (`get_my_conversations`, `get_conversation_read_state`)
- All state variables (names unchanged)
- All useEffect dependency arrays
- All DB queries (messages, conversation_reads, conversation_deliveries, presence)
- Read receipt logic (`markConversationAsRead`)
- Delivery tracking (`upsertDelivery`)
- Edit/delete message logic
- File upload logic
- Scroll behavior (Ticket 31)
- Auto-read guards (Ticket 29.1)
- Avatar URL resolution (Ticket 38.1)

### Implementation Steps
1. Read and audit existing `page.tsx` — mapped all effects, RPCs, polling, state
2. Extracted `ConversationItem`, `MessageBubble`, `Composer` as presentational sub-components
3. Restyled layout to 2-column card design with navy theme
4. Replaced blue-600 colors with brand navy (`#1e293b`)
5. Added rounded bubble styling with directional corner flattening
6. Styled composer with circular buttons and rounded input
7. Added loading spinners, empty state icons, online badge pill
8. Verified build passes with no errors

### Testing Steps
1. **Conversation list**: Verify conversations load, avatars display, unread badges show count
2. **Active state**: Click a conversation — left pane should highlight with navy tint
3. **Unread badge**: Receive a message in a different conversation — badge should appear with count
4. **Online presence**: If a conversation partner is online, green dot on avatar and "Online" pill in header
5. **Message display**: Own messages navy (right-aligned), others light gray (left-aligned)
6. **Send message**: Type and press Enter or click send button — message appears, input clears
7. **Send with attachment**: Click +, select file, send — attachment uploads and displays
8. **Edit message**: Hover own message, click edit pencil, modify, save — message updates
9. **Delete message**: Hover own message, click trash, confirm — message removed
10. **Read receipts**: Send a message, have other user open conversation — ticks should update (single → double → blue double)
11. **Polling**: Leave conversation open — new messages from other user should appear within 3s
12. **Scroll behavior**: Receive messages while scrolled up — should not auto-scroll; scroll to bottom — should resume auto-scroll
13. **Day separators**: Messages from different days show date pills between them
14. **Responsive**: Conversation list maintains min-width, thread area fills remaining space
15. **No console errors**: Open dev tools, navigate between conversations, send messages — no errors
