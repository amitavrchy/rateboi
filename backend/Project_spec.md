# RateBoi — Backend Project Spec

> Stack: **NestJS 12 (ESM) + Prisma 7 + PostgreSQL 17 + Redis/BullMQ + Zod**
> Bangladesh courier-rate comparison & booking hub: rate engine, multi-courier adapters (RedX, Steadfast, Pathao, …),
> idempotent booking, webhook/poll tracking, COD risk check, AI order parsing, COD reconciliation, programmatic SEO data.
> Master spec: `../PROJECT_SPEC.md` · API research: `../docs/research/01-courier-apis.md`

---

## 1. Overview & Goals

### Product
One-person Facebook sellers compare real courier cost (delivery + COD + VAT + expected return), check whether a COD customer
is risky, book the best courier from web or Android, and track every parcel in one timeline. Public pages ("Dhaka theke
Chattogram courier charge") bring organic users.

### Engineering goals
- Pure, versioned **rate engine** with provenance (source URL + last verified).
- **CourierAdapter** abstraction with contract tests; exactly-once booking intent (invoice key + lock + UNCERTAIN reconciliation).
- **Forward-only** shipment state machine fed by webhooks + polling; critical states confirmed via API.
- **Risk service** on legal data only (own network, official endpoints, moderated reports), k-anonymity ≥ 3.
- **AI order parser** (Bangla/Banglish) with deterministic guards and eval gate.
- SEO data API + revalidation hooks for ~1,000 pages.

### Non-goals
- Holding money / wallets / payouts to merchants.
- Scraping courier panels.
- Running last-mile operations.

---

## 2. User Roles & Permissions (RBAC)

| Role | Scope | Permissions |
|------|-------|-------------|
| `PLATFORM_ADMIN` | global | Everything incl. merchants, billing, moderation, webhook replay |
| `RATE_EDITOR` | global | Rate cards CRUD/publish, area-mapping review, SEO page status |
| `OWNER` (MerchantMember) | merchant | All merchant data, courier accounts, billing, members, API keys |
| `MANAGER` | merchant | Orders, shipments, customers, risk checks, payouts (read) |
| `PACKER` | merchant | Orders assigned/ready list, book, print labels; no revenue/billing |
| Anonymous | public | Quotes, location search, public rates, public tracking by token |
| Buyer | public | Tracking page `/track/:publicToken` only |

---

## 3. Feature Modules

1. `auth` — phone OTP, JWT access/refresh rotation, sessions
2. `merchants` — workspace, members, settings, referral codes
3. `locations` — gazetteer, search (pg_trgm), courier area sync & mapping review
4. `rates` — rate cards, slabs, overrides, crowd reports, route stats, engine
5. `quotes` — compare API, QuoteLog, live quotes for connected accounts
6. `couriers` — adapters (`redx`, `steadfast`, `pathao`, `paperfly`(verify)), credentials vault
7. `customers` / `orders` — CRUD, COD computation, duplicate detection, CSV import (v2)
8. `ai` — order parser, address resolver, reply drafts; provider abstraction + mock
9. `shipments` — recommend, book queue, cancel, labels
10. `tracking` / `webhooks` — inbox, processors, polling, stale sweep, public tracking
11. `risk` — phone risk check, bulk, fraud reports + moderation
12. `payouts` — COD reconciliation (v2)
13. `notifications` — push/SMS/WhatsApp with dedupe & metering
14. `billing` — plans, limits, bKash, SSLCommerz
15. `seo` — page builder, quality score, sitemap data, revalidate trigger
16. `admin` — consoles for the above
17. `health` — liveness/readiness

---

## 4. Advanced Business Logic

### 4.1 Rate engine (`src/rates/rate-engine.ts`, implemented + tested)
```
slab by weight (grams, incl. packaging) → delivery (+ extra per started kg beyond last slab)
codCharge = round(codBase × codBps / 10000)   codBase ∈ PRODUCT_PRICE | CASH_COLLECTED | CASH_COLLECTED_MINUS_DELIVERY
vat       = vatIncluded ? 0 : round((delivery + cod) × vatBps / 10000)
expected  = total + P(return) × delivery × returnBps(route) / 10000      ← ranking key
```
- RouteClass classification is **per courier** (suburb lists differ). Cards cached in memory; invalidated on publish.
- Quotes persist the card version used.

### 4.2 Recommender
```
score = 0.6·norm(expected) + 0.15·norm(etaMax) + 0.25·(1 − successRate)
successRate = (merchantDelivered + 10·networkRate) / (merchantTotal + 10)     // Bayesian blend per destination district
```
Routing rules (v2) override: ordered `{when, use}` list in `Merchant.settings.routingRules`.

### 4.3 Booking (exactly-once intent)
- `POST /shipments` with `Idempotency-Key`; Redis lock `book:{orderId}`; `Shipment.invoice = RB-{orderCode}-{attempt}` unique per courier.
- Worker outcome: BOOKED | FAILED (4xx validation) | **UNCERTAIN** (timeout/5xx — never auto-retry create).
- `booking-reconcile` job: findByInvoice (Steadfast `status_by_invoice`; others verify) / webhook with invoice → resolve.

### 4.4 Tracking
- Webhook → verify → `WebhookInbox` (dedupe) → 200 fast → `webhook-process` job → `ShipmentEvent` (dedupeKey) → `canTransition` → apply.
- DELIVERED / PAID re-confirmed via `getStatus`. Pathao: reply 2xx < 10 s + echo `X-Pathao-Merchant-Webhook-Integration-Secret` (verify).
- Polling: active shipments without events in `COURIER_POLL_STALE_HOURS`; Steadfast at most every 30 min (their cache ~60 s).

### 4.5 Risk check
- Inputs: phoneHash. Sources: RATEBOI_NETWORK (aggregate shipments by phoneHash across merchants, shown only if ≥ 3 merchants),
  COURIER_API (Steadfast `fraud_check` with the merchant's own keys — verify), MERCHANT_HISTORY, COMMUNITY_REPORT (APPROVED only).
- Rules v1 (spec §6.3) → `RiskLevel` + `adviceBn/adviceEn`. Snapshot cached 24 h.

### 4.6 COD computation & reconciliation
- `codAmount = itemsTotal + shippingFee − discount − advancePaid` (≥ 0), server-side only.
- Reconciliation: payout lines matched by consignment/tracking; `expectedNet` from saved actual charges; ±৳1 tolerance.

### 4.7 AI order parser
- Pre-extract (phones regex incl. Bangla digits, amounts, qty) → LLM JSON schema → validators (phone must exist in input) → gazetteer resolve → per-field confidence.
- Provider interface `AiProvider.parseOrder(text, hints)`; `mock` provider for tests; log redacted to `AiParseLog`.

### 4.8 Edge cases
- Two devices book same order → one shipment (unique + lock).
- Courier area disappeared → booking blocked `COURIER_AREA_UNMAPPED`, mapping re-queued.
- Order edited after booking → `ORDER_CHANGED_AFTER_BOOKING` → update parcel (RedX PATCH) or cancel+rebook.
- Out-of-order webhook (in-progress after delivered) → stored `applied=false`.
- Unknown courier status → `UNKNOWN`, alert, keep polling.
- Rate source conflict → both stored; public uses conservative; merchant override wins.
- Weight beyond courier max → not serviceable.

---

## 5. State Machines

**Order**: `DRAFT → CONFIRMED → READY_TO_SHIP → SHIPPED → DELIVERED | PARTIAL_DELIVERED | RETURNED`; `CANCELLED` pre-ship
**Booking**: `QUEUED → BOOKING → BOOKED | FAILED | UNCERTAIN → BOOKED | FAILED`; `BOOKED → CANCELLED`
**Shipment**: `CREATED → PICKUP_PENDING → PICKED_UP → IN_TRANSIT/AT_HUB → ON_HOLD ↔ OUT_FOR_DELIVERY → DELIVERED | PARTIAL_DELIVERED | RETURNING → RETURNED`; `CANCELLED | LOST`
**RateCard**: `DRAFT → PUBLISHED → ARCHIVED`
**FraudReport**: `PENDING → APPROVED | REJECTED`
**Payment**: `INITIATED → PENDING → SUCCEEDED | FAILED | CANCELLED → REFUNDED`
**Subscription**: `TRIALING → ACTIVE → PAST_DUE → CANCELLED`
**CredentialStatus**: `PENDING → VERIFIED | INVALID → REVOKED`

---

## 6. Prisma Schema

Source of truth: `prisma/schema.prisma` (validated). Models:
User, OtpCode, Session, PushToken · Merchant, MerchantMember, ApiKey, Subscription, Payment ·
Location, Courier, CourierArea, LocationCourierMap · RateCard, RateSlab, MerchantRateOverride, CrowdRateReport, CourierRouteStat, QuoteLog ·
CourierAccount, PickupStore · Customer, RiskSnapshot, FraudReport · Order, OrderItem, Shipment, ShipmentEvent, WebhookInbox ·
CodPayout, CodPayoutLine · ChannelConnection, InboundMessage, Notification, AiParseLog · SeoPage · AuditLog.

Post-generate SQL migration (M1):
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX location_name_trgm ON "Location" USING gin ("nameEn" gin_trgm_ops, "nameBn" gin_trgm_ops);
CREATE INDEX shipment_active ON "Shipment" ("lastEventAt") WHERE status NOT IN ('DELIVERED','RETURNED','CANCELLED','LOST');
```

---

## 7. REST API
Full list: `../PROJECT_SPEC.md` §9. Prefix `/api/v1`. Errors problem+json `{type,title,status,code,messageBn,messageEn}`.
- Public: `GET /locations/search`, `GET /couriers`, `POST /quotes`, `GET /rates/routes/:from/:to`, `GET /rates/couriers/:code`, `GET /track/:token`, `POST /crowd-rates`
- Auth: `POST /auth/otp/request|verify`, `POST /auth/refresh|logout`, `GET|PATCH /me`
- Merchant: merchants, members, rate-overrides, courier-accounts (+verify, pickup-stores, sync-areas), customers, orders (+parse, import, recommend), shipments (+bulk, cancel, refresh, label.pdf), risk (check, check-bulk), fraud-reports, payouts, insights, billing, api-keys, devices
- Webhooks: `/webhooks/couriers/:courier/:accountToken`, `/webhooks/payments/bkash`, `/webhooks/payments/sslcommerz/ipn`, `/webhooks/meta`
- Admin: rate-cards (+publish), mappings review, fraud moderation, seo pages, webhook replay

---

## 8. Real-time
- Server-Sent Events `GET /events/stream` (merchant-scoped): shipment status changes, booking results (web dashboard).
- Mobile: Expo push notifications for booking result, out-for-delivery, returned, payout mismatch.

---

## 9. Jobs
`booking`, `booking-reconcile` (2 min), `webhook-process`, `tracking-poll` (30 min), `stale-sweep` (daily 09:00 BDT),
`area-sync` (03:00), `route-stats` (04:00), `crowd-rates`, `risk-refresh`, `payout-import` (v2), `notifications`,
`seo-build`, `seo-metrics`, `billing` (daily), `retention` (weekly). All idempotent with `jobId` keys + DLQ.

---

## 10. Security
- Courier credentials & channel tokens AES-256-GCM (`CREDENTIALS_ENC_KEY`, key id); never returned.
- Phone: E.164 + HMAC (`PHONE_HASH_PEPPER`); no raw phones in logs/URLs.
- Tenant guard + Prisma extension injecting `merchantId`.
- Webhook tokens per courier account; signature verification where provided; replay dedupe.
- Throttler: public quotes 120/min/IP; OTP 3/15 min/phone; risk checks per plan.
- Audit log for sensitive actions. PDPA 2026: consent, retention (chat text 30 d), export/delete endpoints.

---

## 11. Caching
- Published rate cards + RouteClass tables in memory (refresh on publish via Redis pub/sub).
- Location search results 10 min (Redis).
- Route SEO data 1 h + tag revalidate on publish.
- RiskSnapshot 24 h.

---

## 12. Testing
- Rate engine slab/COD/VAT/extra-kg/return expected-cost (done: `src/rates/rate-engine.spec.ts`).
- Phone normalisation (done: `src/common/phone.spec.ts`); status machine (done: `src/couriers/courier-adapter.spec.ts`).
- Adapter contract tests with fixtures; UNCERTAIN reconciliation; concurrent booking → one shipment.
- Webhook dedupe & out-of-order; DELIVERED requires confirm.
- Tenant isolation e2e for each endpoint.
- Risk k-anonymity threshold; AI parser guards (no hallucinated phones).

---

## 13. Folder Structure
```
backend/
  prisma/ schema.prisma seed.ts migrations/
  prisma.config.ts
  src/ main.ts app.module.ts common/ prisma/ rates/ couriers/ health/ (+ feature modules per §3)
  test/ e2e + fixtures/
```

---

## 14. Env vars
See `.env.example`: `DATABASE_URL`, `REDIS_URL`, `RUN_WORKER`, `JWT_*`, `OTP_TTL_SECONDS`, `PHONE_HASH_PEPPER`, `CREDENTIALS_ENC_KEY`,
`COURIER_MODE`, `REDX_BASE_URL`, `STEADFAST_BASE_URL`, `PATHAO_BASE_URL`, `PAPERFLY_BASE_URL`, `COURIER_POLL_STALE_HOURS`, `BOOKING_LOCK_SECONDS`,
`PAYMENT_MODE`, `BKASH_*`, `SSLCOMMERZ_*`, `SMS_*`, `WHATSAPP_*`, `PUSH_DRIVER`, `AI_*`, `STORAGE_DRIVER`, `S3_*`, `RATE_LIMIT_*`, `RISK_CHECKS_PER_DAY_FREE`.

---

## 15. Milestones
1. Seeds (gazetteer, couriers, rate cards) + engine wired + quotes API + location search
2. Auth + merchants + tenant guard
3. Courier accounts + adapters (RedX → Steadfast → Pathao) + area sync/mapping
4. Orders/customers + booking queue + UNCERTAIN reconcile + labels
5. Webhooks + polling + public tracking + notifications
6. AI parser + risk check
7. Billing + limits + SEO data/revalidate
8. v2: payouts, routing rules, WhatsApp, more couriers, API keys

---

## 16. Acceptance Criteria
- [ ] Same quote input → identical output; source + verified date returned.
- [ ] Concurrent booking of one order creates exactly one courier consignment.
- [ ] Timed-out create never produces a duplicate consignment.
- [ ] Webhook ack < 200 ms; duplicates ignored; regressions not applied.
- [ ] DELIVERED applied only after API confirmation.
- [ ] Cross-tenant access returns 404 for every merchant endpoint.
- [ ] Risk network stats hidden below 3 contributing merchants.
- [ ] AI parser ≥ 90% field accuracy on eval set; zero hallucinated phones.
- [ ] Seed: 64 districts with bn/en/aliases; Pathao/Steadfast/RedX cards with sources.

---

## 17. Agent Notes
- Bangla-first messages (`messageBn`) on every error.
- Money ints (poisha); grams; Asia/Dhaka for schedules and display.
- Never invent courier endpoints — see `../docs/research/01-courier-apis.md`, mark `TODO(verify)`.
- Nest 12 is ESM: relative imports end in `.js`; tests use Vitest (`vi.fn()`).
- Prisma 7: client generated to `src/generated/prisma` (git-ignored) — run `npm run prisma:generate` after install.
