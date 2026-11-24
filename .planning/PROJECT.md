# Ryan's Personal Website (sweeney-town)

## What This Is

A useful site first and a portfolio second: the web apps Ryan has built, led by the most used — NFL Elo Ratings, Beers Per Beer and the Carton Packing Optimizer — plus a short about, his résumé, and the personal sections (concerts, travel). Audiences: people who come to use the apps, and employers or peers who want to see how he builds.

## Core Value

Visitors reach the app they came for in one click, and anyone evaluating Ryan can see what he builds and how — with evidence, not adjectives.

## Requirements

### Validated

- ✓ Résumé — PDF at `/resume.pdf`
- ✓ Apps — one registry (`src/lib/apps.ts`) drives the nav, homepage, `/apps` index, footer and breadcrumbs; every app lives in `src/app/(apps)/<slug>/` and is served at `/<slug>`
- ✓ Sanity CMS integration — studio embedded at `/studio`, schemas for blog/projects exist
- ✓ Old `/projects/*` and `/calculators/*` URLs (incl. carton QR links with `#cpk=`) redirect to the new paths in one hop
- ✓ Cloudflare Pages deployment — configured via `wrangler.json`

### Active

- [x] Homepage rework — apps-first redesign: most-used apps with live previews, /apps index, about (2026-11)
- [ ] Concert reviews feed — chronological list with photos, star rating, caption; sortable by rating
- [ ] Travel map — interactive map (US-focused + international) with city-level pins for personally visited places; clicking a pin zooms in and shows a detail card below (photos, description, date, rating)
- [ ] Replace /blog with concerts and travel sections

### Out of Scope

- Admin auth / custom login form — Sanity Studio at `/studio` already serves as the content management UI
- Mobile app — web-first
- Real-time features / social interaction — this is a personal showcase, not a social platform
- Full world map (every country) — map should only show personally visited places

## Context

- Stack: Next.js 15 (App Router) + React 19 + TypeScript + Sanity CMS + Cloudflare Pages
- Sanity Studio is already embedded at `/studio` — all new content types (concerts, travel) will be managed there via new schema definitions
- Concert and travel entries share a similar data shape: photos, caption/description, date, star rating — only the presentation differs (feed vs. map)
- Interactive map library needed for travel section (Leaflet or Mapbox); choice TBD during phase planning
- All dynamic content (concerts, travel) will follow the existing Sanity pattern: GROQ queries + `safeFetch` + ISR revalidation

## Constraints

- **Tech Stack**: Next.js 15 + Sanity — new features must fit this stack
- **Deployment**: Cloudflare Pages — no Node-only APIs; must be edge-compatible
- **CMS**: Sanity is the content source for all dynamic data — no separate database

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use Sanity Studio as admin UI for concerts/travel | Already embedded at /studio, no extra auth needed | — Pending |
| Replace /blog with concerts + travel | Blog was unused; these sections better represent Ryan's life | — Pending |
| City-level pins for travel map | Granular enough to be interesting, manageable to maintain | — Pending |
| One Apps collection instead of Projects vs Calculators | The split was by implementation, not by what visitors want; most-used apps are marked `featured` instead | ✓ 2026-11 |
| App URLs flattened to `/<slug>` with 308 redirects | Shorter shareable links; the old paths redirect, and browsers keep the `#cpk=` fragment so printed QR codes still work | ✓ 2026-11 |
| Homepage previews use live data where it exists | NFL card reads the committed season.json at build time and re-checks kickoffs in the browser | ✓ 2026-11 |

---
*Last updated: 2026-11-24 after the apps-first redesign*
