# Messages Module — full sweep (functionality · UX · UI)

Review of the parent ↔ teacher chat as it stands, with concrete improvements.
Priorities: **P1** = correctness/daily friction · **P2** = clear value · **P3** = polish.
Effort: 🟢 small · 🟡 medium · 🔴 larger.

**Current shape:** one `conversations` row **per child** (`student_id` unique), optional
`teacher_id`; `messages` (body, `read_at`, optional attendance/progress photo). A shared
`ChatInbox` React component serves both portals. Auto-messages are posted by the system on
**check-out** and **progress/daily-activity** saves.

---

## 1. Functionality

| # | Issue | Impact | Fix | Effort |
|---|---|---|---|---|
| F1 | **Not real-time.** New messages appear only after a page load. Broadcasting is wired but Pusher keys are empty and there's no Echo client. | Feels dead vs. WhatsApp; users refresh constantly | Laravel Echo + Pusher (keys already supported), or **polling** (`only: ['open']`) as a cheap interim | 🔴 / 🟢 |
| F2 | **No pagination** — `show()` loads the *entire* thread (all messages). | Slow page + big payload as threads grow | Paginate the last ~30 with a **"Load earlier"** control | 🟡 |
| F3 | **Notification deep-links to the inbox, not the thread.** `MessageReceivedNotification::url()` returns `…messages.index`, so the thread isn't open. | Extra tap to find the message | Link to `…messages.show` with the conversation | 🟢 |
| F4 | **Teacher assignment is sticky and single.** First teacher to reply owns `teacher_id` forever; all later notifications go only to them. If they're away, the parent gets silence. | Messages can go unanswered | Notify **all active teachers of the class** until claimed; and/or fall back when the assignee is inactive. Make the assignee visible | 🟡 |
| F5 | **No read receipts.** `read_at` exists but is only used for unread counts; the sender never sees "Seen". | Uncertainty whether the message was read | Show **Seen HH:MM** on the last outbound message | 🟡 |
| F6 | **No user attachments.** Only system-generated photos can appear. Parents can't send e.g. a sick note photo. | Workarounds via WhatsApp | Reuse `ImageStore` for parent/teacher image attachments | 🟡 |
| F7 | **No edit / delete.** A typo or wrong recipient can't be corrected. | Mistaken messages are permanent | Delete (for everyone) + edit within a window | 🟡 |
| F8 | **No admin oversight.** Admins can't see conversations (safeguarding/complaints). | No escalation path | Read-only **admin Conversations** view + export | 🟡 |
| F9 | **Email now fires per message** (mail channel added) — potentially noisy. | Inbox spam | Per-user notification preferences / digest instead of per-message email | 🟡 |
| F10 | `latestMessage()` is `hasMany(...)->limit(1)` used with `->first()`. | Unusual; ordering/N+1 risks | Use `hasOne()->latestOfMany()` | 🟢 |
| F11 | **No search** in threads. | Can't find "what the teacher said about the fever" | Search across messages (role-scoped) | 🟡 |
| F12 | **No general thread** — everything is tied to a child. | Non-child questions have no home | Optional centre/general thread (or fold into announcements) | 🟡 |
| F13 | Pruned photos leave the bubble silently empty. | Confusing "photo missing" | Show *"Photo no longer available"* when a system photo was pruned | 🟢 |

## 2. UX

| # | Issue | Fix | Effort |
|---|---|---|---|
| U1 | **No date separators / grouping.** All bubbles show only `HH:MM`; across days it's ambiguous and the sender name repeats every message. | **Today / Yesterday / date** separators + group consecutive messages (avatar + name once) | 🟡 |
| U2 | **Times use browser-local `toLocaleTimeString()`**, while the rest of the app formats server-side in `Asia/Kuala_Lumpur`. | Format in the app timezone (send a preformatted string, or a shared helper) | 🟢 |
| U3 | **`last_message` shows raw text** — system messages (check-out/activity) appear as long strings. | Show an icon/prefix for system entries and truncate cleanly | 🟢 |
| U4 | **Shift+Enter also sends** (single-line `<Input>`; no multiline). | Textarea: **Enter sends, Shift+Enter = newline** | 🟢 |
| U5 | **Mobile composer can be hidden** behind the keyboard / floating bottom nav (`h-[520px]`, fixed). | Dynamic height (`100dvh`) + bottom padding clear of the nav; safe-area aware | 🟡 |
| U6 | **No optimistic send** — the input clears, then the whole page props reload before the message appears. | Optimistic append + **partial reload** (`only: ['open', 'conversations']`) | 🟡 |
| U7 | **Full page props reload on every send** (re-runs the conversation list + full thread). | Partial reload (above) and/or realtime append | 🟡 |
| U8 | **Empty states are bare** ("No conversations yet."). | Parent guidance ("Message your child's teacher") + a clear-start CTA | 🟢 |
| U9 | **Unread conversation list** — no last-message **timestamp**, no avatar, no preview icon. | Add avatar + relative time ("2h") + preview type | 🟡 |
| U10 | **Send button is icon-only** with no `aria-label`; bubbles aren't a list; no `aria-live`. | Accessibility pass | 🟡 |

## 3. UI

| # | Issue | Fix |
|---|---|---|
| V1 | Flat, dated look: no avatars, sender name in tiny caps inside the bubble. | Avatars (`ui/avatar` exists), grouped bubbles with tails, day dividers, better spacing |
| V2 | **System/auto messages look identical to human ones** (check-out, activity summaries). | Distinct "system" style (icon + tinted, centred or quoted) |
| V3 | Chat **photos open in a new tab** (`target="_blank"`). | Reuse `PhotoThumb`/viewer (lightbox) inside the chat |
| V4 | Composer has no attach, no emoji, no character counter (2000 limit unshown). | Add attach (with F6) + counter near the limit |
| V5 | Conversation list uses a red count badge only. | Add an unread **dot**, bold the row, and muted read rows |
| V6 | Own bubble repeats the sender's own name. | Drop the name on outbound messages |
| V7 | List height `h-[520px]` fixed regardless of viewport. | Responsive height |

---

## Top 10, ranked

1. **Real-time delivery** (F1) — or polling until Pusher is configured.
2. **Deep-link notifications to the thread** (F3) + **fix stickiness** so parents aren't ignored (F4).
3. **Paginate messages** (F2).
4. **Multiline composer** (U4) + **mobile composer visibility** (U5).
5. **Date separators + grouped messages + avatars** (U1, V1) + **system-message styling** (V2).
6. **Optimistic send + partial reload** (U6, U7).
7. **Read receipts** (F5).
8. **Attachments** (F6) + **photo lightbox** (V3).
9. **Admin oversight view** (F8) + **search** (F11).
10. **Notification preferences / digest** instead of per-message email (F9).

---

*Reviewed against `Conversation`/`Message` models, `Parent\MessageController`, `Teacher\MessageController`,
`ChatInbox`, the two Messages pages, routes and the `conversations`/`messages` schema on 28 Sep 2026.
Re-checked 29 Sep 2026 after the health/medication/growth pass — the messages module was unchanged, so
everything above still holds.*

---

## Progress (28 Sep 2026)

**✅ Done**

| Area | What shipped |
|---|---|
| Architecture | Shared **`ConversationService`** (list, thread, post, notify, unread) — both portals use it, so logic can't drift |
| F2 | **Pagination** — last 30 with a **"Load earlier"** cursor (older pages navigable) |
| F3 | Notifications **deep-link to the thread** |
| F4 | **Teacher fan-out** — parents' messages reach every active teacher of the class until claimed; an inactive assignee **falls back**; the assignee is shown in the header |
| F5 | **Read receipts** — ✓ sent / ✓✓ *Seen* on the last outbound message |
| F6 | **Attachments** — parents/teachers can attach up to 3 photos (re-encoded + EXIF-stripped via `ImageStore`, private disk) |
| F7 | **Edit** (own, ≤15 min) and **delete** (soft, with a "message deleted" placeholder) |
| F8 | **Admin oversight** — `/admin/conversations` (search + pagination + read-only thread) and a **CSV transcript export** |
| F9 | **Email is opt-in** per user (Profile toggle) — the bell always fires, inboxes aren't flooded |
| F10 | `latestMessage()` → `latestOfMany()` |
| F11 | **Message search** (role-scoped) with a results dropdown that jumps to the thread |
| F13 | Pruned photos set `photo_expired` → chat shows *"Photo no longer available"* instead of nothing |
| U1/U2/V1/V2 | **Date separators** (Today/Yesterday/date), **grouped bubbles**, **avatars**, distinct **system-message** style, and **server-formatted times** (app timezone) |
| U4/V4 | **Multiline composer** (Enter sends, **Shift+Enter** = newline), **attach**, and a counter near the 2000 limit |
| U5/V7 | **Pinned chat panel** — fixed height at every breakpoint, so only the message list scrolls and the composer never leaves the screen |
| U6/U7 | **Optimistic send** + **partial reloads** (`only: ['open','conversations']`) |
| U9/V5 | Conversation rows show **avatar, time, system preview icon, unread dot/count** |
| U10 | `role="log"` + `aria-live`, `aria-label`s on icon buttons |
| F1 (interim) | **5-second polling** of the open thread (visibility-aware) — new messages appear without a refresh |

**⏳ Still open**

- **F1 true realtime** — add Laravel Echo + Pusher (keys already supported) to replace polling; also poll the badge globally.
- **F12 general/centre thread** — chats are still per-child (needs new schema; deliberately deferred).
- **U8** richer empty states (parent guidance / first-message CTA).
- **Typing indicators**, **message pinning/starring**, **archive/mute**, and per-conversation **unread badge polling**.

> **Continuing this work?** Resume the session (or start fresh) using the handoff section in
> [`README.md`](README.md#continuing-this-work-handoff).
