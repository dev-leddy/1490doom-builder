# 1490 DOOM Builder

See README.md for stack, layout and deployment.

## Conventions
- The pre-commit hook bumps the patch version on every commit — do not bump it manually as well.
- Deploys are Cloudflare Pages via git push (`main` = production). There is no GitHub Pages deploy.
- Run `npm run check` (lint + unit tests + frontend build + Functions build) and `npm run test:e2e` (browser tests, local servers) before pushing; CI runs the check on GitHub.
- Add or update a test in `tests/e2e` / `tests/unit` when changing behaviour; e2e tests must only create accounts on the local server.
- Store actions must not start with `use` (ESLint treats those as React hooks).
- The quiz lives in this app (`src/quiz`, `quiz.html`, art in `public/quiz/`). Don't split it out.
- Only commit optimized `.webp` art that code references; no PSD/raw PNG source files.
- `src/data/images.js` is ~3 MB of base64 — don't read it whole; grep for keys.
- Schema changes: add a numbered file in `db/migrations/` and update `db/schema.sql`.
- Companies and play-mode games are cloud-only (`/api/companies`, `/api/games`); never store them in localStorage. Building, saving and playing require sign-in; guests get landing, quiz and read-only shared links.

## Backups
When asked for a backup (and always before deleting branches, worktrees or files), create one
outside the repo in `D:/dev-led/_backups/1490doom-builder-<YYYY-MM-DD>/` (add `-2`, `-3`… if it exists):

```bash
B=/d/dev-led/_backups/1490doom-builder-$(date +%F) && mkdir -p "$B"
git bundle create "$B/repo-all-refs.bundle" --all      # every branch, tag and commit
git bundle verify "$B/repo-all-refs.bundle"             # must say "is okay"
git branch -a --format='%(refname) %(objectname:short)' > "$B/refs.txt"
git diff HEAD > "$B/uncommitted.diff"                   # uncommitted tracked changes
git ls-files --others --exclude-standard -z | tar --force-local --null -T - -cf "$B/untracked.tar"   # new files
tar --force-local -cf "$B/secrets.tar" .dev.vars .claude/settings.local.json 2>/dev/null   # gitignored but needed
```

For each worktree in `git worktree list`, also save `git -C <path> diff HEAD > "$B/worktree-<name>.diff"`.
Report the folder path and sizes to the user when done.

Restore:
- One branch: `git fetch <bundle> <branch>:<branch>`
- Everything into a fresh copy: `git clone <bundle> 1490doom-builder-restored`
- Uncommitted work: `git apply "$B/uncommitted.diff"`; untracked files: `tar -xf "$B/untracked.tar"`

Existing backups:
- `1490doom-builder-2026-10-04` — before the repo cleanup (old branches dev, test, refactor, dbtest,
  merge-dbtest-to-main, backup/main-before-revert, claude/*; temp-quiz-repo; full quiz source art; .venv; _assets)
