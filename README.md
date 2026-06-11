# Facebook Group CRM

Facebook Group CRM is a lightweight CRM for Facebook group admins that combines a Chrome extension with a TypeScript backend. It scans only the information already visible on Facebook group pages and stores structured CRM data for groups, members, notes, tags, scans, and activity stats.

## What it does

It helps group admins turn visible Facebook group activity into searchable CRM records without using the Facebook Graph API.

## Why it exists

Group admins often track members, leads, and follow-up notes manually. This project turns the visible group pages they already use into a read-only data source for lightweight CRM workflows.

## Features

- Chrome Manifest V3 extension with a side panel UI
- Group detection from Facebook group URLs
- Visible member scanning from group member pages
- Visible post scanning from the group feed
- Backend APIs for auth, groups, members, scans, notes, tags, and stats
- SQLite storage through a TypeScript backend
- Manual, admin-triggered scan model with no auto-scrolling or message sending

## How it works

1. A content script runs on `facebook.com/groups/*`.
2. The extension detects the current group and can scan visible members or posts from the active page.
3. The side panel sends those scan results to the backend.
4. The backend stores CRM data in SQLite and exposes APIs for notes, tags, stats, and member records.
5. All scanning is initiated by the user and limited to information already visible in the browser.

## Tech stack

- Chrome Extension (Manifest V3)
- React
- TypeScript
- Vite
- Fastify
- Drizzle ORM
- SQLite
- Zod

## Project structure

```text
backend/
  src/
    auth/            authentication routes
    groups/          group APIs
    members/         member APIs
    scans/           member and post scan APIs
    notes/           note APIs
    tags/            tag APIs
    stats/           aggregated stats APIs
extension/
  src/
    background/      service worker
    content/         DOM readers for groups, members, and posts
    panel/           side panel UI
    shared/          extension message contracts
```

## Getting started

```bash
git clone <repo-url>
cd fbgroup-crm
```

Backend:

```bash
cd backend
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Extension:

```bash
cd extension
npm install
npm run build
```

Then open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension/dist`.

## Configuration

The backend reads `backend/.env`:

```env
PORT=5321
HOST=0.0.0.0
JWT_SECRET=change-me-to-a-random-string
STORAGE_DIR=./storage
CORS_ORIGINS=chrome-extension://*,http://localhost:5174
```

The extension does not currently use environment variables.

## Usage

1. Start the backend.
2. Build and load the Chrome extension.
3. Open a Facebook group page in the browser.
4. Use the extension side panel to detect the group and trigger visible scans.
5. Review stored members, notes, tags, and stats through the CRM workflow.

## Development

```bash
cd backend && npm run dev
cd backend && npm run build
cd backend && npm run db:migrate
cd extension && npm run dev
cd extension && npm run build
cd extension && npm run typecheck
```

There is currently no automated test suite in the repository.

## Roadmap

- Add clearer admin UI workflows for searching and filtering members
- Add export tooling for scanned group data
- Add automated tests for scanners and backend route validation
- Add packaging and release instructions for extension distribution

## Contributing

This project is public and open for collaboration. If you’re interested in contributing, improving the project, or discussing ideas, feel free to reach out.

LinkedIn: https://linkedin.com/in/alexrada

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Open a pull request

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
