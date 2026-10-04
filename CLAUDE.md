# 1490 DOOM Builder

See README.md for stack, layout and deployment.

## Conventions
- Bump the patch version in `package.json` on every commit unless told otherwise.
- Deploys are Cloudflare Pages via git push (`main` = production). There is no GitHub Pages deploy.
- The quiz lives in this app (`src/quiz`, `quiz.html`, art in `public/quiz/`). Don't split it out.
- Only commit optimized `.webp` art that code references; no PSD/raw PNG source files.
- `src/data/images.js` is ~3 MB of base64 — don't read it whole; grep for keys.
- Schema changes: add a numbered file in `db/migrations/` and update `db/schema.sql`.
