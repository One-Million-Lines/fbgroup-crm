# Facebook Group CRM

Lightweight CRM for Facebook group admins. Chrome extension + Node.js backend.
Reads what's visible in facebook.com/groups/* (DOM-based, user-triggered scans),
stores structured CRM data per group/member.

> No Facebook Graph API. No automation, no message sending, no auto-scrolling.
> Admin-driven scans only. Built to comply with Facebook ToS by behaving as a
> passive read-only assistant over the pages the user already opened.

## Layout

```
fbgroup-crm/
├── backend/      Fastify + Drizzle + SQLite (TypeScript)
└── extension/    Chrome MV3 extension (React + Vite + TypeScript)
```

## Quick start

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run db:migrate
npm run dev          # http://localhost:5321
```

### Extension
```bash
cd extension
npm install
npm run build        # outputs dist/
```
Then `chrome://extensions` → enable Developer mode → "Load unpacked" → pick `extension/dist`.

## What's different from a WhatsApp CRM

Facebook groups are URL-addressable and the member identity is much stronger:

| Concern               | WhatsApp Web                       | Facebook Groups                            |
|-----------------------|------------------------------------|--------------------------------------------|
| Group identifier      | DOM-only fingerprint               | `facebook.com/groups/{idOrSlug}` from URL  |
| Member identity       | Phone (often hidden)               | Profile URL → `fbid` or `username`         |
| Member list location  | Group Info side panel              | `/groups/{id}/members/` page (sub-tabs)    |
| Roles                 | admin / member                     | admin / moderator / member / new_member    |
| Activity signal       | Message bubbles in chat            | Posts in feed: author, time, reactions, comments |

That means matching is much more reliable, and you can pull richer activity stats
per post (likes/comments) instead of message counts.

## Phases

1. Extension foundation — login, FB detection, group detection from URL
2. Member scan — `/members/` page, sub-tab aware, manual scroll-and-rescan
3. CRM fields — notes, tags, subscription/payment status, source, search/filter
4. Stats + posts feed activity scan (with reaction/comment counts)

## Privacy

- Only runs on facebook.com.
- Stores profile metadata (display name, profile URL, profile picture URL).
- Does not store post bodies by default — only metadata (author, timestamp, reaction/comment counts).
- All data is per-workspace, isolated to its own SQLite file.
- Export/delete endpoints supported.
