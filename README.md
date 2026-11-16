# RateBoi 🇧🇩📦

**Courier rate compare + booking + tracking + COD risk check** for Bangladeshi F-commerce sellers.
"Kon courier e pathale kom khoroch, kon customer fake — ek jaygay dekho, ek click e book koro."

| Part | Path | Stack |
|---|---|---|
| API + worker | [`backend/`](backend/) | NestJS 12, Prisma 7, PostgreSQL 17, Redis/BullMQ |
| Web (SEO site + dashboard PWA + admin) | [`frontend/`](frontend/) | Next.js 16, React 19, Tailwind 4 |
| Android-first app | [`apps/mobile/`](apps/mobile/) | Expo SDK 58, React Native 0.88 |

- Product & engineering spec: [`PROJECT_SPEC.md`](PROJECT_SPEC.md)
- Instructions for AI coding agents: [`AGENTS.md`](AGENTS.md)
- Backend spec: [`backend/Project_spec.md`](backend/Project_spec.md)
- Research (courier APIs, rates, fraud, payments, SEO, messaging) + sources: [`docs/`](docs/)

## Quick start
```bash
cd backend && docker compose up -d && cp .env.example .env && npm install && npm run prisma:generate && npm run start:dev
cd frontend && cp .env.example .env.local && npm install && npm run dev      # http://localhost:3010
cd apps/mobile && cp .env.example .env && npm install && npx expo start
```
Ports: web 3010 · API 4010 · Postgres 5560 · Redis 6390 · Expo 8081.

## Roadmap
v1 MVP: compare + book (RedX, Steadfast, Pathao) + track + AI paste-to-order + risk check + Android app →
v2: COD reconciliation, routing rules, WhatsApp, more couriers, API →
v3: OrderKhata (Messenger inbox → orders, inventory-lite, CRM).
