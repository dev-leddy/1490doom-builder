# Plan: cloud-only saves, login required

Status: **implemented on branch `cloud-saves`** (2026-10-04) — needs migration 004 on production D1 before merging

## Why
Local storage is the primary copy and the cloud is a side copy, which causes conflicts:
- Edits auto-save locally but only reach the cloud on Save / Share / switching company / tab close.
- On login "cloud wins", so un-synced edits from one device can be rolled back on another.
- Logout leaves companies in localStorage; the "upload local companies?" prompt can push them into
  the next user's account on that browser.
- Local caps saves at 10, cloud doesn't — the lists drift.
- Play-mode sessions are keyed by **company name**: renaming loses the game, same-named companies collide.

## Decisions
- Guests: view only — landing, quiz, shared links (read-only roster). Building, saving, play mode need login.
- Browser-only companies: uploaded once on next login, then removed from the browser.
- Play mode game state: moves to the cloud too (resume on another device).

## Backend
1. Migration `004_game_sessions.sql`: `game_sessions(company_id PK, user_id, saved_at, data)`.
2. `GET / PUT / DELETE /api/games/:companyId` — auth required, own data only (same pattern as /api/companies).
3. Stale-save guard on `POST /api/companies`: client sends the `saved_at` it last loaded; server returns
   409 if newer exists; client reloads latest and toasts "Updated from another device".

## Frontend
4. Company list from cloud only. Remove `doom_saves`, `doom_draft`, the 10-company cap.
5. Debounced cloud auto-save (~1.5 s) + sendBeacon on unload. Indicator: Saving… / Saved / Offline – retrying.
6. Login gate. Shared link for guests = read-only roster + "Log in to save a copy"; pending share kept in
   sessionStorage across the OAuth redirect and imported after login.
7. Tracker state auto-saves to /api/games keyed by companyId. "Resume game?" checks the cloud.
8. One-time migration on login: upload browser companies + tracker sessions (skip where cloud is newer),
   then delete local keys; toast "Moved N companies to your account". Remove the sync prompt modal.
9. Logout clears in-memory state and returns to landing.

## Touches
builderStore.js, builderPersistence.js, trackerStore.js, utils/storage.js, BuilderPage.jsx,
SaveLoadPanel, RestorePromptModal.jsx, api/companies.js, functions/api/companies/*, new functions/api/games/*.

## Testing / rollout
10. Local test with an email account: migration of old browser saves, auto-save, two tabs on one company,
    play + resume, guest view of a share link.
11. Apply migration 004 to production D1 first (ask before touching prod), then push.

Trade-off: saving needs a connection; the PWA still opens offline but changes save once back online.
