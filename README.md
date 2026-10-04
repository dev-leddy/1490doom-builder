# 1490 DOOM — Company Builder

A web app for building and tracking Doom Companies in the 1490 DOOM tabletop game, plus the "Which Doom Company Are You?" quiz.

Live at **https://1490doomcompanybuilder.com**, hosted on **Cloudflare Pages**.

## Stack

- **Frontend:** React 18, Vite, Zustand, Tailwind + custom CSS, PWA (vite-plugin-pwa)
- **Backend:** Cloudflare Pages Functions (`functions/`) — auth, saved companies, short share links
- **Database:** Cloudflare D1 (`doom-builder`, binding `DB`)

## Local development

```bash
npm install
npm run dev            # frontend at http://localhost:5173
```

The Vite dev server proxies `/api` and `/s/` to `http://localhost:8788`. To run the backend locally:

```bash
cp .dev.vars.example .dev.vars   # fill in OAuth / Resend secrets
npm run build
npx wrangler pages dev dist --port 8788
```

## Deploying

Cloudflare Pages builds from git automatically:

- push to `main` → production
- push to any other branch → preview at `https://<branch>.1490doom-builder.pages.dev`

The patch `version` in `package.json` (shown in the app footer) is bumped automatically by a local pre-commit hook (`.git/hooks/pre-commit`). Hooks are not cloned — on a fresh clone, bump it manually or recreate the hook.

## Database

- `db/schema.sql` — full schema for a fresh database
- `db/migrations/` — incremental changes, applied in order

Apply a migration to production:

```bash
npx wrangler d1 execute doom-builder --remote --file=db/migrations/<file>.sql
```

## Project structure

```
src/
├── builder/     Builder mode (company/warrior editing, landing page, quiz overlay)
├── tracker/     Play mode tracker
├── quiz/        Company quiz (embedded via QuizOverlay and standalone at /quiz)
├── data/        Game data (warriors, weapons, marks, quiz questions, base64 images)
├── store/       Zustand stores
├── shared/      Shared components (modals, toasts, quick reference)
├── api/         Frontend API client
└── utils/       Storage, share/export helpers (Discord, TTS)

functions/       Cloudflare Pages Functions (API routes, auth, /s/:code short links)
db/              D1 schema and migrations
public/          Static assets (fonts, PWA icons, avatars, quiz art, /api-docs)
quiz.html        Entry point for the standalone /quiz page
```

### Quiz assets

The quiz loads its art from `public/quiz/` (referenced in `src/data/quizData.js`, `src/quiz/*.jsx` and `src/quiz/quiz.css`). Only commit optimized `.webp` files that are actually referenced — keep original PNG/PSD source art outside the repo.
