# Contributing

Thanks for your interest in contributing.

## Local setup

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

Load `extension/dist` in Chrome Developer mode.

## Making changes

- Keep scan logic in `extension/src/content/`
- Keep backend route changes documented in the README
- Run `npm run build` for both backend and extension before opening a pull request

## Pull requests

1. Fork the repository
2. Create a branch for your change
3. Make your changes
4. Open a pull request with screenshots or scan examples when useful

## Reporting issues

Open a GitHub issue with reproduction steps, Facebook page context, and any relevant extension console output.
