# 1490 DOOM — Company Builder

A React web app for building and tracking Doom Companies in the 1490 DOOM tabletop game.

## Stack

- **Vite** — build tool
- **React 18** — UI
- **Zustand** — state management (builderStore + trackerStore)
- **Tailwind CSS** — layout utilities
- **Custom CSS** — dark medieval theme

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173/1490doom-builder/

## Deploy to GitHub Pages

1. Create a GitHub repo named `1490doom-builder`
2. Push this project to it
3. Run:

```bash
npm run deploy
```

This builds and pushes to the `gh-pages` branch. Your app will be live at:
`https://YOUR_USERNAME.github.io/1490doom-builder/`

## Project Structure

```
src/
├── data/           # Pure game data (warriors, weapons, marks, items, images)
├── store/          # Zustand stores (builderStore, trackerStore)
├── builder/        # Builder mode components
├── tracker/        # Play mode tracker components
├── shared/         # Shared components (ConfirmModal, Toast)
└── styles/         # Global CSS
```

## Features

- **Builder Mode**: Build a 3+ warrior Doom Company with mark, weapons, IP upgrades, consumables
- **Save/Load**: Up to 10 saved companies in localStorage
- **Share/Import**: URL-based company sharing via encoded hash
- **Random Generator**: True random company generation
- **Play Mode**: Full game tracker with vitality, abilities, statuses, cache items
- **Quick Reference**: In-game action/status/falling reference panel
- **Print Support**: Print-optimized roster view
