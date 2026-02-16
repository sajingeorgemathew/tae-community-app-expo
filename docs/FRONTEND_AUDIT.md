# Frontend Design Audit — TAE Community App

> Snapshot date: 2026-02-15 | Next.js 16 + React 19 + Tailwind 4 + Supabase

---

## 1. App Shell & Navigation

### Root Layout (`src/app/layout.tsx`)

- Applies **Geist Sans** and **Geist Mono** via Google Fonts (CSS variables `--font-geist-sans`, `--font-geist-mono`)
- Sets `antialiased` on `<body>`
- No global nav — public routes (`/login`, `/signup`) have standalone layouts

### Authenticated Shell (`src/app/app/layout.tsx`)

- Wraps all `/app/*` routes in a `<div className="app-shell">`
- Renders `<PresenceProvider />` (heartbeat, no UI)
- The `.app-shell` class (defined in `globals.css`) applies:
  - Brand CSS custom properties (tokens)
  - `min-height: 100vh`
  - Background gradient `#f8fafc → #f1f5f9`
  - Base typography (`line-height: 1.6`, font smoothing)

### Sidebar Navigation (inline in `src/app/app/page.tsx`)

The sidebar is **not** a shared component — it lives directly in the dashboard page as a `<nav>` element (`w-56 flex-shrink-0 space-y-2`).

| Label | Route | Badge | Condition |
|---|---|---|---|
| My Profile | `/app/me` | — | always |
| Messages | `/app/messages` | unread count (red pill) | always |
| New Post | `/app/feed/new` | — | always |
| Directory | `/app/directory` | — | always |
| Faculty | `/app/faculty` | — | always |
| Questions | `/app/questions` | activity count (red pill) | always |
| Admin Dashboard | `/app/admin` | — | `role === "admin"` |
| Log Out | (action) | — | always |

- **Nav link style:** `px-4 py-2 rounded hover:bg-gray-100 text-gray-800`
- **Badge style:** `min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full` (caps at "99+")
- **Note:** Only the dashboard (`/app`) renders this sidebar. Other pages use a `← Back` link pattern instead.

### Shared Components

| Component | File | Purpose |
|---|---|---|
| `Avatar` | `src/components/Avatar.tsx` | Profile photo with initials fallback |
| `PostCard` | `src/components/PostCard.tsx` | Post display: content, media, reactions, comments |
| `PresenceProvider` | `src/components/PresenceProvider.tsx` | Online heartbeat (renders `null`) |

That's the entire `src/components/` directory — three files.

---

## 2. Page Inventory

### Public Routes

| Route | File | UI Summary |
|---|---|---|
| `/` | `src/app/page.tsx` | Redirect: → `/app` (auth) or `/login` (anon). Shows "Redirecting..." centered. |
| `/login` | `src/app/login/page.tsx` | Centered card (`max-w-sm`). Fields: email, password. TAE logo, `border-t-4 border-[#1e293b]`, gradient bg `slate-50→slate-100`. |
| `/signup` | `src/app/signup/page.tsx` | Same card layout as login. Fields: full name, email, password (min 6). |

### Authenticated Routes (`/app/*`)

#### `/app` — Dashboard
**File:** `src/app/app/page.tsx`

| Section | Details |
|---|---|
| Header | "TAE Community App" title + user name/email |
| Sidebar nav | See §1 above |
| Profile alert | Blue box if completeness < 100%, links to `/app/me#completeness` |
| Quick search | Input (`max-w-md`), searches by name/program, dropdown shows 6 results with Avatar(sm), role badge, program, first skill |
| Recent Posts | 8 latest posts — author, timestamp, truncated content (150 chars), media icon |
| CTA | "Go to Feed" button |

#### `/app/feed` — Community Feed
**File:** `src/app/app/feed/page.tsx`

| Section | Details |
|---|---|
| Back link | → `/app` |
| Title | "Feed" |
| New Post btn | `bg-blue-600` |
| Audience filter | Buttons: all / students / alumni. Active = `bg-blue-600 text-white`, inactive = `bg-gray-200` |
| Post list | `PostCard` list (`space-y-4`). Fresh posts (<24h) newest-first; older (1–5 days) daily-shuffled per user |

**PostCard features:** emoji reactions (❤️ 👍 😂), reaction counts, images (`max-w-[520px]`), videos (`max-h-380px` feed / `420px` profile), link URLs, collapsible comments, delete (own/admin).

#### `/app/feed/new` — New Post
**File:** `src/app/app/feed/new/page.tsx`

| Field | Constraints |
|---|---|
| Content | textarea, rows=5, required |
| Audience | select: all / students / alumni |
| Link URL | optional, validated |
| Images | max 5, 5 MB each, JPEG/PNG/WebP |
| Video | max 1, 50 MB, MP4/WebM |

Max 6 total attachments. Container: `max-w-lg`.

#### `/app/messages` — Messaging
**File:** `src/app/app/messages/page.tsx`

Two-pane layout:

| Pane | Width | Contents |
|---|---|---|
| Left | `w-1/3 min-w-[200px] max-w-[300px]` | Conversation list: Avatar(sm) + green dot, name (bold if unread), last message preview, WhatsApp-style timestamp, unread dot (`bg-blue-600 w-2 h-2`) |
| Right | `flex-1` | Thread header (avatar + name + online dot), day separators, message bubbles, input bar |

**Message bubbles:**
- Own: `bg-blue-600 text-white`, right-aligned
- Other: `bg-gray-200 text-gray-900`, left-aligned
- Max width: `max-w-[70%]`, `rounded-lg px-4 py-2`
- Status ticks: ✓ sent, ✓✓ delivered (opacity-70), ✓✓ read (text-blue-300)
- Edit/delete on hover, (Edited) label

**Input:** textarea (rows=1, Enter sends, Shift+Enter newline), file attachment (+), send button. Image ≤5 MB, video ≤35 MB.

**Polling:** conversations 6s, messages 3s.

#### `/app/me` — My Profile
**File:** `src/app/app/me/page.tsx`

| Section | Details |
|---|---|
| Completeness card | Percentage, progress bar, missing-item list with "Add" buttons (avatar, headline, skills, program & year) |
| View mode | Avatar(lg), full name, headline, program, grad year, role badge, skill tags |
| Edit mode | Avatar upload (JPEG/PNG/WebP ≤5 MB), inputs for name/headline/program/grad year, skill tag editor (max 12 tags, 24 chars each — `bg-blue-100 text-blue-800` pills with × button) |
| My Posts | PostCard list of own posts (canDelete=true) |

#### `/app/directory` — Member Directory
**File:** `src/app/app/directory/page.tsx`

- Search input: "Search by name, program, or year..."
- Profile cards: Avatar(md) + green dot, name, headline (truncated), program · year, role badge, Message button (`bg-blue-600`)
- Card layout: `border rounded p-4 hover:bg-gray-50`
- Client-side search across name/program/year/headline/skills

#### `/app/profile/[id]` — Member Profile
**File:** `src/app/app/profile/[id]/page.tsx`

- Back → `/app/directory`
- Avatar(lg) + name + role badge + headline
- Program, grad year, skills (border pills)
- Message button (if not self)
- "Posts by this member" — PostCard list

#### `/app/faculty` — Faculty Directory
**File:** `src/app/app/faculty/page.tsx`

- Search input + course dropdown filter
- Tutor cards: Avatar(md) + green dot, name, headline, skill pills, course pills (`bg-blue-50 border-blue-200`), Message button
- Same card layout pattern as directory

#### `/app/questions` — Q&A List
**File:** `src/app/app/questions/page.tsx`

- "Ask a Question" toggle → form (title input max 200 chars, body textarea rows=4)
- Question cards: Avatar(md) + green dot, title, body preview (150 chars), author · timestamp
- Reply summary: "No replies yet" / "1 reply · Replied by Name [badge]" / "N replies · Latest: Name [badge] + (N-1) more"
- Card layout: `border rounded p-4 hover:bg-gray-50`

#### `/app/questions/[id]` — Question Detail
**File:** `src/app/app/questions/[id]/page.tsx`

- Question: title (h1 `text-2xl`), author avatar + name + timestamp, body
- Answers list with avatar + online dot + author + timestamp + body
- Answer form (tutor/admin only): textarea rows=4, "Post Answer" button
- All in `border rounded p-4/p-6` cards

#### `/app/admin` — Admin Dashboard
**File:** `src/app/app/admin/page.tsx` (admin-only)

Three sections:

**A. Posts Moderation** — Audience + time range filters, bulk select, "Delete Selected Posts" (`bg-red-600`), PostCard list with checkboxes.

**B. Tutors Management** — Search, table with: name (avatar + link), program, year, role dropdown (member/tutor), listed checkbox, courses multi-select, save.

**C. Users Management** — Search, bulk select, "Disable Selected Users" (`bg-red-600`), "Delete Their Posts (Last 24h)" (`bg-orange-600`), table with: checkbox, name (avatar + link), program, year, role, status (Active green / Disabled red), enable/disable toggle.

---

## 3. Styling System

### CSS Architecture

```
src/app/globals.css
├── @import "tailwindcss"         ← Tailwind 4
├── :root variables               ← --background, --foreground
├── @theme inline                 ← Tailwind theme overrides (font-sans, font-mono)
├── dark mode media query          ← defined but unused in components
├── body base styles              ← bg, color, font-family fallback
└── .app-shell scope
    ├── brand tokens (CSS vars)
    ├── .app-card                 ← bg + border + radius + shadow
    ├── .app-panel                ← app-card + padding
    ├── .app-btn                  ← secondary button
    ├── .app-btn-primary          ← navy bg button
    └── .app-input                ← styled text input
```

No CSS modules. No additional stylesheets. Everything else is inline Tailwind classes.

### Design Tokens (`.app-shell` scope)

| Token | Value | Usage |
|---|---|---|
| `--brand-navy` | `#1e293b` | Primary brand, text, buttons |
| `--brand-white` | `#ffffff` | Button text, backgrounds |
| `--brand-muted` | `#64748b` | Muted text |
| `--card-bg` | `#ffffff` | Card backgrounds |
| `--border` | `#e2e8f0` | All borders |
| `--shadow` | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)` | Card elevation |
| `--radius` | `0.5rem` | Border radius |

### Typography

| Level | Classes |
|---|---|
| Page title | `text-2xl font-semibold` |
| Section title | `text-xl font-semibold` |
| Subsection | `text-lg font-medium` or `font-semibold` |
| Body | default (`text-base`) |
| Secondary | `text-sm text-gray-500` or `text-gray-600` |
| Tertiary | `text-xs text-gray-400` |
| Font stack | Geist Sans → Arial, Helvetica, sans-serif |

### Common UI Patterns

**Buttons:**

| Variant | Classes |
|---|---|
| Primary | `bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50` |
| Secondary | `bg-gray-200 px-4 py-2 rounded hover:bg-gray-300` |
| Danger | `bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700` |
| Text link | `text-blue-600 hover:underline text-sm` |
| Destructive text | `text-red-600 hover:text-red-800 text-sm` |
| CSS class (secondary) | `.app-btn` |
| CSS class (primary) | `.app-btn-primary` (navy bg) |

**Inputs:**
- Inline: `w-full border rounded px-3 py-2` + `focus:outline-none focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b]`
- CSS class: `.app-input` (same visual, uses tokens)

**Cards / Containers:**
- List items: `border rounded p-4 hover:bg-gray-50 transition-colors`
- Panels: `border rounded p-6` or `.app-panel`
- Login card: `bg-white rounded-lg shadow-md p-8 w-full max-w-sm border-t-4 border-[#1e293b]`

**Badges:**

| Type | Classes |
|---|---|
| Role | `text-xs bg-gray-200 px-2 py-1 rounded` |
| Nav count | `min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full` |
| Skill tag | `bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm` |
| Course tag | `bg-blue-50 border-blue-200 text-blue-700 px-2 py-1 rounded text-sm` |
| Q&A role | `px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700` |

**Avatar (`src/components/Avatar.tsx`):**
- Sizes: `sm` (32px), `md` (40px), `lg` (80px)
- Shape: `rounded-full bg-gray-200`
- Fallback: initials in `text-gray-500 font-medium`
- Online dot (applied at call sites): `w-3 h-3 bg-green-500 border-2 border-white rounded-full absolute bottom-0 right-0`

**Filter buttons (feed, admin):**
- Active: `bg-blue-600 text-white`
- Inactive: `bg-gray-200`
- Shared: `px-3 py-1 rounded text-sm`

**Alerts / Notices:**
- Success: `bg-green-100 text-green-800`
- Error: `bg-red-100 text-red-800`
- Info: `bg-blue-50 text-blue-700`

**Loading states:** Plain text ("Loading...", "Saving...", "Posting...") — no spinners or skeletons.

### Color Palette (in practice)

| Role | Value | Tailwind |
|---|---|---|
| Brand primary | `#1e293b` | hardcoded (≈ slate-800) |
| Interactive | — | `blue-600` / `blue-700` |
| Neutral bg | — | `gray-50`, `gray-100`, `gray-200` |
| Neutral text | — | `gray-400` – `gray-800` |
| Danger | — | `red-500`, `red-600` |
| Success | — | `green-500`, `green-600` |
| Warning | — | `orange-600` |
| Shell bg | `#f8fafc → #f1f5f9` | CSS gradient |

---

## 4. Design Constraints

### MUST NOT change

| Category | Details |
|---|---|
| **Routes** | All routes listed above are wired to data-fetching and cross-linked |
| **Supabase queries** | Component-level data fetching (tables, columns, joins, RLS) |
| **Auth flow** | login/signup → session → redirect chain |
| **Role checks** | Admin-only routes/actions, tutor-only answer form |
| **Real-time patterns** | Polling intervals, presence heartbeat, badge count logic |
| **File upload constraints** | Size limits, type restrictions, Supabase storage paths |
| **PostCard props interface** | Consumed by feed, profile, admin, and me pages |
| **Avatar component contract** | `fullName`, `avatarUrl`, `size` props |
| **Message status logic** | Tick indicators tied to DB columns |
| **Feed ranking** | Fresh-first + daily-shuffle algorithm |

### CAN change

| Category | Details |
|---|---|
| **Colors** | Navy brand, blue interactive, gray neutrals, badge colors, gradients |
| **Typography** | Font family, sizes, weights, line heights |
| **Spacing** | Padding, margins, gaps, container widths |
| **Border radius & shadows** | Card elevation, roundedness |
| **Button appearance** | Shapes, sizes, hover/focus/active states |
| **Card/container styling** | Backgrounds, borders, shadows, padding |
| **Input styling** | Borders, focus rings, padding |
| **Avatar appearance** | Sizes, shape, fallback styling, online dot styling |
| **Badge appearance** | Colors, shapes, sizes |
| **Sidebar layout** | Currently `w-56` inline in dashboard — could be extracted/restyled |
| **Page layout structure** | Flex directions, max-widths, responsive breakpoints |
| **Loading states** | Could add spinners/skeletons |
| **Transitions & animations** | Currently minimal |
| **Login/signup card** | Layout, branding, gradient |
| **Message bubbles** | Colors, shapes, spacing |
| **Dark mode** | CSS vars exist in `:root` but no components use it |
| **Mobile responsiveness** | Currently desktop-first with minimal breakpoints |
| **CSS utility classes** | `.app-btn`, `.app-panel`, `.app-card`, `.app-input` — can restyle or replace |
| **Component extraction** | Sidebar nav, filter bars, search boxes could become shared components |
