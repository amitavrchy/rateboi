# AGENTS.md — RateBoi (read this first)

You are building **RateBoi**: courier-rate comparison + booking + tracking + COD risk check for Bangladeshi F-commerce sellers.
Product truth: `PROJECT_SPEC.md`. Backend details: `backend/Project_spec.md`. Research & API facts: `docs/research/`.
Per-app rules: `frontend/AGENTS.md`, `apps/mobile/AGENTS.md`, `backend/AGENTS.md`.

## 1. Golden rules
1. **Never invent a third-party API endpoint, field or status.** Use only what `docs/research/01-courier-apis.md` documents.
   Items marked **(verify)** → implement behind the adapter interface with a `TODO(verify)` and a sandbox contract test; do not ship to prod until verified.
2. Money = integer **poisha** (`*Minor`). Weight = **grams**. Time stored UTC, displayed **Asia/Dhaka**.
3. Phones: normalise with `backend/src/common/phone.ts` (E.164). Never log raw phones; never put phones in URLs.
4. Every merchant-scoped query filters by `merchantId` from auth context. Add a cross-tenant e2e test for every new endpoint.
5. Bangla-first UI: every user-facing string exists in `bn` and `en`. Default locale `bn`. Use Bangla numerals only where the design says so (prices use ৳ + Latin digits by default).
6. Courier calls only through `CourierAdapter` (`backend/src/couriers/courier-adapter.ts`). Business code never imports a courier SDK/HTTP client directly.
7. Booking is idempotent (invoice key + lock). Never blindly retry a timed-out create → `UNCERTAIN` flow (spec §6.4).
8. Status updates are forward-only (`canTransition`). Confirm DELIVERED/PAID via courier API before applying.
9. SEO pages must be data-backed and pass the quality gate (spec §11.3). No free-form AI text on public pages.
10. Keep it cheap: no paid infra dependency in MVP without a free-tier fallback; feature-flag anything that costs per call (AI, WhatsApp, SMS).

## 2. Stack (versions scaffolded Nov 2026)
| Part | Path | Stack |
|---|---|---|
| API + worker | `backend/` | NestJS 12 (ESM, Vitest, oxlint), Prisma 7.10 (`prisma-client` generator → `src/generated/prisma`, `@prisma/adapter-pg`), PostgreSQL 17, Redis 7 + BullMQ, Zod validation |
| Web (public SEO site + seller dashboard PWA + admin) | `frontend/` | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, `src/` dir |
| Mobile (Android-first) | `apps/mobile/` | Expo SDK 58, React Native 0.88, Expo Router (`src/app`), TypeScript |
| Docs | `docs/` | research notes + sources |

⚠️ Next.js 16, NestJS 12, Expo 58 and Prisma 7 are newer than most training data. **Read the local docs before coding**:
`frontend/node_modules/next/dist/docs/`, https://docs.nestjs.com/llms.txt, https://docs.expo.dev/llms.txt, https://www.prisma.io/docs.

## 3. Folder layout
```
rateboi/
├── AGENTS.md  PROJECT_SPEC.md  README.md  .gitignore  .github/workflows/ci.yml
├── docs/            research/*.md, sources.md (add ADRs in docs/adr/NNN-title.md)
├── backend/
│   ├── Project_spec.md  README.md  .env.example  docker-compose.yml  Dockerfile  prisma.config.ts
│   ├── prisma/          schema.prisma, migrations/, seed.ts, seed-data/ (locations, rate cards JSON)
│   ├── src/
│   │   ├── main.ts app.module.ts
│   │   ├── common/      phone, money, errors (problem+json), guards, tenant context
│   │   ├── prisma/      PrismaService/Module
│   │   ├── generated/   (Prisma client — git-ignored, run `npm run prisma:generate`)
│   │   ├── auth/ merchants/ locations/ rates/ quotes/ couriers/{redx,steadfast,pathao,paperfly}/
│   │   ├── orders/ customers/ shipments/ tracking/ webhooks/ risk/ payouts/ billing/
│   │   ├── notifications/ ai/ seo/ admin/ health/
│   └── test/            e2e + fixtures/couriers/<code>/*.json, fixtures/ai/orders.jsonl
├── frontend/
│   └── src/app/         (public)/ [bn default], en/, dashboard/, admin/, t/[token]/, api/revalidate/
│       src/components/ src/lib/ (api client, i18n, format) src/messages/{bn,en}.json
└── apps/mobile/
    └── src/app/         (auth)/, (tabs)/{index,orders,track,more}, order/new, share-intent
        src/lib/ (api, offline outbox, i18n) src/components/
```

## 4. Commands
```bash
# infra
cd backend && docker compose up -d            # postgres :5560, redis :6390
# backend
cd backend && cp .env.example .env && npm install
npm run prisma:generate && npm run prisma:validate
npx prisma migrate dev --name <change>        # after schema edits
npm run start:dev                             # http://localhost:4010/health
npm test && npm run build && npm run lint
# frontend
cd frontend && cp .env.example .env.local && npm install
npm run dev                                   # http://localhost:3010
npm run typecheck && npm run lint && npm run build
# mobile
cd apps/mobile && cp .env.example .env && npm install
npx expo start                                # Android: press a
npm run typecheck && npx expo lint
```
Package manager: **npm** (no pnpm/yarn). Backend has `.npmrc legacy-peer-deps=true` (npm 10 arborist bug with Nest 12 peers).

## 5. Coding conventions
- TypeScript strict everywhere; no `any` (use `unknown` + Zod parse at boundaries).
- Backend: one Nest module per feature; controllers thin, services hold logic, pure functions for calculations (`*.engine.ts`) with unit tests; DTOs = Zod schemas (`StandardSchemaValidationPipe`); ESM imports end with `.js`.
- Errors: throw domain errors with `code` → mapped to problem+json with `messageBn`/`messageEn`.
- DB: migrations only via Prisma; raw SQL allowed in migrations for pg_trgm/partial indexes; transactions for multi-row writes; no N+1 (use `include`/`select`).
- Queues: every job idempotent, `jobId` = natural key; retries with backoff; DLQ.
- Frontend: Server Components by default; client islands only for calculator/forms; data via typed API client generated from `docs/openapi.json`; Tailwind; accessible (labels, 44px touch targets); no layout shift.
- Mobile: Expo Router; `expo install` for deps; TanStack Query for server state; offline outbox for mutations; no native dirs committed (CNG).
- Naming: files kebab-case; React components PascalCase; DB models PascalCase singular; enums UPPER_SNAKE.
- Commits: Conventional Commits (`feat(rates): …`). One milestone checklist item per PR where possible.

## 6. Testing
- Unit (Vitest): rate engine, recommender, risk rules, phone/money utils, status normalisers per courier, AI validators.
- Contract tests per courier adapter using recorded fixtures (`test/fixtures/couriers/<code>/`); sandbox live tests behind `COURIER_LIVE_TESTS=1`.
- E2E (backend, supertest + test DB): auth, tenant isolation, order→book→webhook→delivered, UNCERTAIN reconciliation, payment IPN.
- Frontend: Playwright smoke for calculator, route page SEO tags (title/canonical/hreflang/JSON-LD), dashboard booking flow.
- Mobile: typecheck + lint; Maestro flows later (verify).
- AI: offline eval `npm run eval:ai` over `fixtures/ai/orders.jsonl` (≥ 90% field accuracy gate).
- Definition of done: tests + typecheck + lint + build green; bn/en strings; spec checkbox ticked; docs updated.

## 7. Build order (milestones)

### M0 — Foundations (done in scaffold, verify)
- [x] Monorepo folders, Next/Nest/Expo scaffolds, Prisma schema v0, docker-compose, env examples, specs.
- [ ] CI workflow green (backend test/build, prisma validate, frontend build, mobile typecheck).

### M1 — Data & rate engine (week 1–2)
- [ ] Seed gazetteer: 8 divisions, 64 districts, Dhaka/Chattogram city thanas, aliases (bn/en/banglish), zoneClass.
- [ ] Seed couriers + PUBLISHED rate cards for Pathao, Steadfast, RedX from `docs/research/02-rates-2026.md` (with sourceUrl/date); Paperfly/eCourier/Sundarban as DRAFT until sourced.
- [ ] `RouteClass` classifier per courier + tests. Rate engine wired to DB (cached), `POST /quotes`, `GET /locations/search` (pg_trgm).
- [ ] Admin: rate-card CRUD + publish.

### M2 — Public site & SEO wave 1 (week 2–4)
- [ ] Frontend i18n (bn default, `/en`), layout, Bangla font, design tokens.
- [ ] Calculator island + route page template + courier page + compare page + tools.
- [ ] SeoPage builder job + quality score + sitemap/robots/hreflang/JSON-LD + revalidate endpoint.
- [ ] Lighthouse mobile ≥ 90 on route page.

### M3 — Auth & merchant (week 3–4)
- [ ] OTP auth, sessions, merchant onboarding, members/roles, tenant guard + e2e tests.

### M4 — Couriers & booking (week 4–7)
- [ ] CourierAccount connect/verify (encrypted creds).
- [ ] Adapters: RedX (sandbox first), Steadfast, Pathao — create/status/areas/stores/quote where available; contract tests.
- [ ] Area sync + mapping review queue.
- [ ] Orders/customers; COD computation; booking queue with lock + UNCERTAIN reconciliation; labels PDF.

### M5 — Tracking & notifications (week 6–8)
- [ ] Webhook inbox + processors (RedX, Pathao), polling worker (Steadfast), stale sweep.
- [ ] Public tracking page `/t/[token]`; push notifications; SMS driver.

### M6 — AI parser & risk (week 7–9)
- [ ] `/orders/parse` with provider abstraction + mock; validators; gazetteer resolver; eval set + gate.
- [ ] Risk check v1 (network + official sources + own history), bulk check, UI badges.

### M7 — Mobile app (week 5–10, parallel)
- [ ] Auth, tabs (Home/Quote, Orders, Track, More), new order with paste/share-intent, recommend & book, push, offline outbox.
- [ ] EAS build (Android preview APK).

### M8 — Billing & launch (week 9–10)
- [ ] Plans + limits; bKash + SSLCommerz sandbox; upgrade flow; analytics events; privacy policy/ToS (bn/en).

### v2/v3 backlog
See `PROJECT_SPEC.md` §4 — COD reconciliation, routing rules, WhatsApp, community reports, more couriers, API/Woo, Messenger inbox, inventory, voice orders.

## 8. When unsure
- Product question → follow `PROJECT_SPEC.md`; if missing, choose the simplest option that keeps data correct and note it in `docs/adr/`.
- API uncertainty → mark `TODO(verify)`, keep behind adapter, add fixture, ask the human.
