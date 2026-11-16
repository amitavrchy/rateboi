<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# RateBoi frontend rules (read `../AGENTS.md` + `../PROJECT_SPEC.md` §5, §11 first)

## What lives here
1. **Public SEO site** (Bangla default at `/`, English at `/en`): home calculator, `/delivery-charge/[route]`, `/courier/[code]`,
   `/compare/[pair]`, `/district/[slug]`, `/tools/*`, `/guides/*`.
2. **Seller dashboard PWA** `/dashboard/*`: orders, paste-to-parse, recommend & book, shipments timeline, risk check, payouts, settings, billing.
3. **Admin** `/admin/*`: rate cards, mapping review, fraud moderation, SEO pages, webhooks.
4. **Public tracking** `/t/[token]` (no login, Bangla, seller-branded).

## Rules
- Next.js 16 App Router — read `node_modules/next/dist/docs/` before using routing, caching, metadata, or ISR APIs.
- Server Components by default; client components only for the calculator, forms, and dashboard interactivity.
- SEO pages: `generateMetadata` (title, description, canonical, `alternates.languages` bn-BD/en-BD), JSON-LD (BreadcrumbList, Organization), `sitemap.ts`, `robots.ts`, OG image via `next/og`. Content only from API data snapshots; no free-form AI text.
- Revalidation: `POST /api/revalidate` (secret `REVALIDATE_SECRET`) with tags like `route:dhaka-to-chattogram`, called by backend `seo-build` job.
- Performance budget: SEO page JS < 90 KB, LCP < 2.0 s on mid Android/4G; self-hosted Bangla font subset (Noto Sans Bengali / Hind Siliguri).
- i18n: messages in `src/messages/{bn,en}.json`; never hard-code UI strings; prices `৳1,234` (Latin digits), dates Asia/Dhaka.
- PWA: web app manifest + service worker (choose a library compatible with Next 16 — verify; e.g. Serwist) for dashboard offline shell + IndexedDB draft orders.
- API: typed client generated from `../docs/openapi.json` into `src/lib/api/`; auth = short-lived access token in memory + httpOnly refresh cookie.
- Accessibility: labels, focus states, 44 px targets, color contrast AA; works at 360 px width.
- Commands: `npm run dev` (port 3010), `npm run typecheck`, `npm run lint`, `npm run build`.
