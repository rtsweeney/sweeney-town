# Sweeney Town

Ryan Sweeney’s working toolbox: practical web apps for engineering math, sports questions, and problems worth building a tool around. The homepage puts the most-used applications first while retaining a short maker profile and links to field notes.

## Stack

- Next.js 15 App Router, React 19, and TypeScript
- Sanity for managed content
- Cloudflare Pages via `@cloudflare/next-on-pages`
- Space Grotesk and IBM Plex Mono, self-hosted through `next/font`
- Installable PWA metadata, app shortcuts, and static-asset caching

## Run locally

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Checks and production build

```bash
npm run lint
npx tsc --noEmit
npm run build
npm start
```

## Site structure

- `/` — featured tools, complete tool index highlights, maker profile, and field notes
- `/tools` — unified directory for all applications
- `/projects/*`, `/calculators/*`, and `/planetarium` — existing application routes and bookmarks
- `/concerts` and `/travel` — personal field notes
- `/studio` — Sanity Studio

The old `/projects` and `/calculators` index routes redirect to `/tools`. Existing application deep links remain unchanged. Additional legacy redirects live in `next.config.mjs`.

## Tool directory content

Shared tool names, descriptions, routes, tags, and featured status live in `src/data/tools.ts`. Homepage and directory cards are rendered from that single source by `src/components/ToolDirectory.tsx`; the featured previews are in `src/components/ToolArtwork.tsx`.

## Generated data

Refresh generated application data only when needed:

```bash
npm run build:nfl-elo
npm run build:antipode
```

The NFL homepage preview reads the checked-in `public/data/nfl-elo/season.json` data directly.

## PWA behavior

`public/manifest.webmanifest` provides install metadata and shortcuts to the three featured tools. `public/sw.js` caches static assets only: it does not precache HTML or use cache-first navigation, so application pages continue to use the network normally.
