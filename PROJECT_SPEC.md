# RateBoi — Master Product & Engineering Spec

> **One-liner:** Bangladesh's courier-rate comparison + booking hub for one-person F-commerce sellers.
> Compare Pathao / Steadfast / RedX / Paperfly / eCourier / Sundarban charges in seconds, check if a COD customer is risky,
> book the cheapest-real-cost courier, and track every parcel in one place — Bangla-first, Android-first.
>
> **Bangla te:** "Kon courier e pathale kom khoroch, kon customer fake — ek jaygay dekho, ek click e book koro."
>
> Status: v0 spec (Nov 2026). Research + sources: `docs/research/*`, `docs/sources.md`.
> Rule: anything about a courier/payment API that is marked **(verify)** must be confirmed in sandbox before coding against it.

---

## 0. Table of contents
1. Vision, goals, non-goals
2. Market context & positioning
3. Personas & jobs-to-be-done
4. Phases: MVP (v1) → v2 → v3
5. Feature modules with acceptance criteria
6. Advanced business logic (rate engine, recommender, risk, booking, tracking, reconciliation, AI parser)
7. State machines
8. Data model (summary — source of truth `backend/prisma/schema.prisma`)
9. REST API
10. Background jobs & schedules
11. Programmatic SEO page generation plan
12. Security & privacy
13. Performance & reliability budgets
14. Analytics & KPIs
15. Monetization
16. In-product growth hooks
17. Risks & open questions
18. Glossary

---

## 1. Vision, goals, non-goals

### Vision
Become the default "first tab" a Bangladeshi Facebook/Instagram/WhatsApp seller opens before sending a parcel. Start as
a free, SEO-driven **rate comparison** utility (top of funnel), convert to a **daily-use shipping desk** (booking, risk check,
tracking, COD reconciliation), then expand into **OrderKhata** — a light order-management tool for one-person sellers.

### Product goals (12 months)
| Goal | Target |
|---|---|
| Organic users on public calculator/pages | 60k+/month sessions by month 9 |
| Registered sellers | 25k |
| **Regular users** (weekly active sellers: ≥1 booking or ≥3 quotes/risk checks in a week) | **10–15k by month 12** |
| Parcels booked through RateBoi | 150k/month by month 12 |
| Paid sellers | 4–6% of WAU |

### Engineering goals
- Deterministic, audited **rate engine** with versioned rate cards and "last verified" provenance.
- **Multi-courier adapter layer** with idempotent booking, webhook + polling status sync, forward-only state machine.
- **Phone-based COD risk check** built on legal data sources only (own network + official courier endpoints).
- **AI order parser** for Bangla/Banglish chat text → structured order with confidence, < 3 s p95.
- **Programmatic SEO** engine generating ~1,000 high-quality bn/en pages from first-party data, with quality gates.
- **Offline-tolerant** Android app + installable PWA (2G/3G, low-end devices).
- Near-zero infra cost at launch (single small VPS / free tiers; see §13).

### Non-goals (for now)
- Becoming a courier or running riders/hubs.
- Holding merchant or customer money (no wallet, no payment facilitation) — avoids PSP licensing (verify with Bangladesh Bank rules).
- Scraping courier merchant panels or using merchant passwords to fetch data not exposed by official APIs.
- Full e-commerce storefront builder (OrderKhata v3 may add a lightweight order form only).
- International shipping.

---

## 2. Market context & positioning
- Bangladesh F-commerce: an estimated 2–2.5 lakh active Facebook sellers (from research report); the overwhelming majority ship COD via 3–6 couriers.
- Published list rates differ by only ৳5–20/parcel, but **COD %, return charges and return rates** change the real cost far more
  (e.g. 1% COD on ৳3,000 = ৳30; Pathao charges 50% of delivery as return fee outside Dhaka). Source: `docs/research/02-rates-2026.md`.
- Competitors: courier panels themselves (single-courier), WooCommerce plugins, multi-courier aggregators/plugins, and many "fraud checker" sites
  (several rely on scraping/proxy rotation — legal/ToS risk). **Gap:** a neutral, Bangla-first, mobile-first tool that combines
  *real cost comparison + legal risk check + booking + tracking* for sellers who don't have a website.
- Positioning: **"Neutral. Bangla. Free to compare."** We never take a cut on delivery charges in v1 (trust); money from SaaS plans.

---

## 3. Personas & jobs-to-be-done

| Persona | Description | Top jobs |
|---|---|---|
| **Rima — solo FB seller** (primary) | Sells clothes from home in Mirpur; 10–40 orders/day from Messenger; Android, Bangla; uses 2 couriers | "Which courier is cheapest for this Sylhet order?", "Is this customer fake?", "Book fast from my phone", "Where is my parcel?", "Did courier pay me all COD?" |
| **Tanvir — small brand owner** | 2–5 staff, 100–300 orders/day, FB + small website | Bulk booking, multi-courier routing rules, staff roles, COD reconciliation, API |
| **Anonymous researcher** | New seller / buyer googling "Dhaka theke Chattogram courier charge" | Fast, trustworthy answer; compare; understand COD/return rules |
| **Customer (end buyer)** | Receives parcel | Track parcel without login in Bangla |
| **Rate editor (internal)** | RateBoi ops | Update rate cards with sources, review area mappings, moderate fraud reports |

---

## 4. Phases

### v1 — MVP (weeks 0–10): "Compare + Book + Track" (web PWA + Android)
1. Public calculator & comparison (6 couriers, rate-card based) + ~100 pSEO pages (wave 1).
2. Phone OTP sign-up; merchant profile; pickup location.
3. Connect courier accounts: **RedX, Steadfast, Pathao** (API); others rate-card only.
4. Create order (manual form + **paste-to-parse AI**), customer book.
5. Courier recommendation (expected cost incl. COD & return) + one-tap booking; label/print.
6. Tracking: webhook (RedX, Pathao) + polling (Steadfast), unified timeline, public tracking page.
7. Risk check v1: RateBoi network history + Steadfast official fraud score where permitted + merchant's own history.
8. Android app (Expo) with share-intent "Share chat → RateBoi", offline draft queue, push notifications.
9. Billing: Free + Pro via bKash/SSLCommerz.

### v2 (months 3–6): "Daily desk"
- COD reconciliation (API + CSV import), payout mismatch alerts.
- Bulk booking (CSV / multi-select), routing rules ("Dhaka → RedX, outside → Steadfast, value > ৳3000 → Pathao").
- Paperfly + eCourier adapters (after verification); CarryBee evaluation.
- WhatsApp utility notifications ("out for delivery"), SMS fallback.
- Crowd-reported actual charges; courier performance by district (median delivery time, success rate).
- Community fraud reports with moderation; risk model v2.
- Staff roles; public API keys; WooCommerce plugin (thin client).
- pSEO waves 2–3 (~1,000 pages), embeddable calculator widget.

### v3 (months 6–12): "OrderKhata"
- Messenger Page inbox integration (Meta App Review) → AI turns chats into draft orders automatically.
- Inventory-lite (product list, stock decrement on ship, restock on verified return).
- Customer CRM (repeat buyers, tags, broadcast via WhatsApp templates with opt-in).
- Voice-note order input (Bangla speech → order).
- Bluetooth thermal label printing from Android (verify library).
- Insights: profit per order after courier costs, return-rate heatmap by district, best courier per district for *you*.
- Seller order form link (lightweight checkout page that collects district/thana from lists → feeds orders).

---

## 5. Feature modules (with acceptance criteria)

Each module maps to a NestJS module in `backend/src/<module>` and UI in `frontend/src/app/...` / `apps/mobile/src/app/...`.

### M-01 Auth & accounts
- Phone OTP login (SMS), optional password; JWT access (15 m) + rotating refresh (30 d, hashed, revocable).
- Locale preference `bn|en`; device push token registration.
- AC:
  - [ ] OTP: 6 digits, 5 min TTL, max 5 attempts, 3 sends / 15 min / phone, hashed at rest.
  - [ ] Refresh token rotation detects reuse → revokes session family.
  - [ ] Phone normalised to E.164 (accepts Bangla digits, +880, 01…).

### M-02 Merchant workspace
- Merchant (shop) with slug, FB page URL, default pickup location, members (`OWNER|MANAGER|PACKER`), settings JSON (courier priorities, routing rules, notification prefs).
- AC:
  - [ ] Every merchant-scoped query filters by `merchantId` from the JWT membership (tenant isolation tests).
  - [ ] PACKER cannot see revenue, payouts, or billing.

### M-03 Gazetteer (locations)
- Division → District (64) → City Corporation / Thana → Area, with `nameBn`, `nameEn`, `aliases[]` (Banglish/old names: "ctg", "chittagong", "চিটাগাং", "comilla"→Cumilla), post codes, `zoneClass`.
- Per-courier area lists synced (`CourierArea`) and mapped (`LocationCourierMap`) with confidence + human review queue.
- AC:
  - [ ] Search endpoint returns top-10 locations for Bangla, Banglish or English input in < 50 ms (pg_trgm index).
  - [ ] Unmapped/low-confidence (< 0.8) mappings appear in admin review queue; a human decision is remembered.
  - [ ] Nightly area sync flags disappeared courier areas (`disappearedAt`) and re-queues affected mappings.

### M-04 Rate cards (admin)
- Versioned `RateCard` per courier with slabs by `RouteClass × ServiceLevel × maxWeight`, COD bps (incl. Dhaka-metro override), COD base, VAT flag, return policy, `sourceUrl`, `sourceCheckedAt`.
- Workflow: DRAFT → PUBLISHED (requires source URL + checker) → ARCHIVED; publishing triggers SEO revalidation.
- Merchant negotiated overrides (`MerchantRateOverride`) with evidence screenshot.
- AC:
  - [ ] Publishing a new version never mutates old quotes (quotes store card version).
  - [ ] Cards older than 45 days show "needs re-verification" in admin and a softer "last verified" badge publicly.

### M-05 Quote & compare (public + merchant)
- Inputs: from (default merchant pickup), to (district/thana), weight (g, default 500), COD amount, service level, product price.
- Output per courier: delivery, COD charge, VAT, total, return fee, **expected cost**, ETA band, serviceability, badges (Cheapest / Fastest / Best value / 0% COD in Dhaka).
- Uses merchant overrides when logged in; uses live courier quote API when connected and available (RedX charge calculator, Pathao price-plan) and shows "live" badge.
- AC:
  - [ ] p95 < 150 ms for rate-card quotes (in-memory cached cards).
  - [ ] Every result displays rate source + last verified date.
  - [ ] Same input → same output (pure engine; unit tests with published rate tables).
  - [ ] QuoteLog written asynchronously (does not block response).

### M-06 Courier accounts
- Connect via API credentials (form per courier), verify via a harmless read call, store encrypted (AES-256-GCM, key id), list/choose pickup stores.
- Per-account webhook URL with random token: `/webhooks/couriers/{courier}/{accountToken}`.
- AC:
  - [ ] Credentials never returned by any API; audit log on create/rotate/delete.
  - [ ] Invalid credentials surface clear Bangla error and mark `INVALID`.

### M-07 Orders & customers
- Create order manually or via AI paste/share; customer auto-upsert by `(merchantId, phone)`; items, prices, shipping fee to customer, advance paid → **server-computed COD**.
- Duplicate detection: same phone + similar address + < 24 h → warn.
- AC:
  - [ ] COD = items + shipping − discount − advance, never negative, never trusted from client.
  - [ ] Order edit after booking → prompts update/cancel+rebook; COD mismatch blocks "ready".
  - [ ] Idempotency-Key header supported on POST /orders (mobile offline replays).

### M-08 AI order parser
- Input: pasted Messenger/WhatsApp text (Bangla, Banglish, English, mixed), optional screenshot OCR (v2).
- Output: `{customerName, phones[], address, districtId?, thanaId?, items[{name, qty, unitPrice}], codAmount?, deliveryChargePaidBy?, note, confidence{field:0..1}}`.
- Pipeline: deterministic pre-extract (phones, amounts "1200tk/১২০০ টাকা", qty) → LLM structured output → validators → gazetteer resolver → confidence merge.
- AC:
  - [ ] ≥ 90% field-level accuracy on the 200-message eval set (`backend/test/fixtures/ai/orders.jsonl`) before launch.
  - [ ] Phone never hallucinated: must appear in input (string check) or field is empty.
  - [ ] Works with mock provider in tests; per-plan monthly quota enforced.

### M-09 Recommendation & booking
- Recommender ranks connected couriers by score (see §6.2); user can override; routing rules auto-select (v2).
- Booking queue (BullMQ) with per-order lock, idempotent invoice `RB-{orderCode}-{attempt}`, retries only for safe failures.
- Labels: printable A6/A4 PDF + courier's own label link when available.
- AC:
  - [ ] Double-tap / two devices booking the same order → exactly one shipment.
  - [ ] Timed-out create → `UNCERTAIN`, reconciliation job resolves via find-by-invoice or webhook; no blind duplicate.
  - [ ] Booking from Android works on flaky network (queued + push on result).

### M-10 Tracking hub
- Unified timeline from webhooks (RedX, Pathao) + polling (Steadfast; fallback for all) with normalized statuses.
- Public tracking page `/t/{publicToken}` (Bangla default, seller-branded, "Powered by RateBoi").
- AC:
  - [ ] Webhook ack < 200 ms (store in `WebhookInbox` then process async).
  - [ ] DELIVERED / PAID transitions confirmed via courier status API before applying.
  - [ ] Out-of-order events stored with `applied=false`; never regress state.
  - [ ] Stale sweep: parcels without events for `COURIER_POLL_STALE_HOURS` are polled.

### M-11 Risk check (COD fraud)
- Lookup by phone (POST body only): network stats (k-anon ≥ 3 merchants), official courier score (when the merchant's own account permits), merchant's own history, approved community reports → `RiskLevel` + Bangla advice.
- Bulk check for today's orders; auto-check on order create (configurable).
- AC:
  - [ ] Phone never in URL/logs (log only hash prefix).
  - [ ] Network stats hidden if fewer than 3 distinct merchants contributed.
  - [ ] Free plan: `RISK_CHECKS_PER_DAY_FREE` per merchant; cached 24 h.

### M-12 COD reconciliation (v2)
- Import payouts (Steadfast `/payments` (verify), CSV for others); match lines to shipments by tracking/consignment; compute expected net from saved quote.
- AC:
  - [ ] Each line lands in `MATCHED | AMOUNT_MISMATCH | UNMATCHED_LINE`; delivered-but-unpaid after N days → `MISSING_PAYOUT` alert.
  - [ ] Monthly report export (CSV/PDF) per courier.

### M-13 Notifications
- Channels: push (Expo), SMS (local gateway), WhatsApp utility templates (v2), email (optional).
- Templates bn/en; per-merchant toggles; per-event dedupe (`shipmentId+templateKey+channel` unique).
- AC: [ ] "Out for delivery" sent at most once per shipment per channel; cost metered to merchant plan.

### M-14 Billing
- Plans Free/Pro/Business; bKash tokenized checkout + SSLCommerz; monthly/annual; grace period 3 days.
- AC: [ ] Plan activated only after server-side execute/validation; IPN replay-safe.

### M-15 Programmatic SEO (see §11)

### M-16 Admin console
- Rate cards, area-mapping review queue, fraud report moderation, merchants, feature flags, SEO page quality dashboard, webhook inbox viewer.

### M-17 Public API & integrations (v2)
- API keys (hashed, prefix shown), scopes `quotes:read orders:write shipments:read`; WooCommerce plugin calls it.

---

## 6. Advanced business logic

### 6.1 Rate engine (pure function — `backend/src/rates/rate-engine.ts`)
```
routeClass = classify(pickupLocation.zoneClass, deliveryLocation.zoneClass, sameDistrict?)
slab       = first slab where weight ≤ maxWeight (weight incl. packaging, grams)
delivery   = slab.price  OR  last.price + ceil((w − last.max)/1000) × extraPerKg
codBase    = PRODUCT_PRICE | CASH_COLLECTED | CASH_COLLECTED_MINUS_DELIVERY (per courier)
codCharge  = round(codBase × codBps/10000)   (Dhaka-metro override bps if applicable; min charge if any)
vat        = vatIncluded ? 0 : round((delivery + codCharge) × vatBps/10000)
total      = delivery + codCharge + vat
returnFee  = round(delivery × returnBps(route)/10000)
expected   = total + P(return) × returnFee            ← ranking key
```
- `RouteClass` mapping table lives in code + tests (e.g. Pathao "ISD→Suburbs", Steadfast "Dhaka City→suburbs (Gazipur, Narayanganj, Savar)", RedX "Dhaka suburbs (Savar, Ashulia, Tongi…)"). Suburb lists differ per courier → **per-courier zone overrides** on `CourierArea`/mapping.
- Rounding: half-up to poisha; display rounded to whole taka.

### 6.2 Courier recommender
```
score(c) = w1·norm(expectedCost) + w2·norm(etaMax) + w3·(1 − successRate(c, district, merchant)) + w4·penalty(issues)
defaults: w1=0.6 w2=0.15 w3=0.25 w4=0.0
successRate: Bayesian blend = (merchant_delivered + α·network_rate) / (merchant_total + α), α=10
```
- Explain the winner in Bangla: "RedX: ৳12 কম, ঢাকার বাইরে আপনার ডেলিভারি সফলতা 94%".
- Routing rules (v2) evaluate before score: ordered list of `{when: {districtIn, codGte, weightGte, tag}, use: courier}`.

### 6.3 Return-risk / fraud model
- v1 rules: `level = BLOCKLISTED` if ≥1 approved community report with evidence & ≥2 returns; `RISKY` if success < 60% with ≥3 parcels; `WATCH` if new phone + COD > ৳3,000 or district return rate > 25%; else `SAFE`; `UNKNOWN` if no data.
- v2 model: gradient-boosted classifier on (phone history, order value, district/thana return rate, item category, hour, first order?, address completeness score, alt-phone present, AI confidence). Outputs `P(return)` → fed into §6.1 `expected`.
- Suggested actions: ask advance delivery charge (merchant's own bKash number/link), call to confirm (one-tap call), switch to point delivery.

### 6.4 Booking (exactly-once intent)
1. `POST /shipments` → validate order READY + COD matches → acquire Redis lock `book:{orderId}` (60 s) → create `Shipment(QUEUED, invoice=RB-{code}-{attempt})` (unique `(courierId, invoice)`).
2. Worker: adapter.createShipment. Success → BOOKED + externalId. Validation error (4xx) → FAILED (user fixes). Timeout/5xx → **UNCERTAIN**.
3. Reconcile UNCERTAIN every 2 min ×10: findByInvoice (Steadfast `status_by_invoice`; RedX/Pathao verify) or matching webhook with invoice → BOOKED; else after window → FAILED with "check courier panel" + manual link.
4. Rebook increments `attempt` (new invoice) only after previous attempt is FAILED/CANCELLED.

### 6.5 Tracking ingestion
- Webhook → verify (token / `X-PATHAO-Signature` (verify)) → `WebhookInbox` (dedupe key) → 200 → job: map to shipment by externalId/invoice → normalize → `ShipmentEvent(dedupeKey)` → `canTransition` → update → side-effects (notifications, stats, CrowdRateReport from actual charges).
- DELIVERED/PAID: confirm via `getStatus` before apply. Pathao webhook needs 2xx within 10 s + echo secret header (verify).
- Polling budget: Steadfast caches ~60 s → poll active parcels at most every 30 min; backoff for long-transit.

### 6.6 COD reconciliation
`expectedNet = codCollected − actualDelivery − actualCodCharge − returnFee − VAT`; tolerance ±৳1; aggregate per payout; alert merchant on mismatch with list of tracking IDs (copy-ready Bangla message for courier support).

### 6.7 AI order parser details
- Prompt: few-shot with Bangla/Banglish examples; JSON-schema output; temperature 0; max 400 output tokens.
- Deterministic guards: BD phone regex, amounts must appear in text, qty ≤ 50, address min length 10.
- Address resolver: tokenise → alias dictionary (bn/en/banglish) → trigram match on Location → pick deepest confident level; fallback LLM classification over top-20 candidates.
- Cost control: cache by hash of normalized text; small/fast model; free plan quota `AI_MONTHLY_FREE_PARSES`.
- Privacy: inputs redacted (phones masked) in `AiParseLog`; raw text retention 30 days (configurable).

### 6.8 Edge cases
- Same phone, different merchants → risk aggregated by hash, never reveal other merchant identity.
- Exchange / partial delivery → second leg shipment linked to order; COD = price difference.
- Courier area renamed/removed → mapping re-queue; booking blocked with clear message.
- Weight > courier max (Pathao 10 kg) → courier marked not serviceable.
- Rate card conflict (official pages disagree, e.g. Pathao COD 0.5% vs 1%) → store both with note; use conservative (higher) for public, merchant override wins when logged in.
- Ramadan/Eid surges & courier holidays → banner + ETA widening (admin flag).

---

## 7. State machines
- **Order:** `DRAFT → CONFIRMED → READY_TO_SHIP → SHIPPED → DELIVERED | PARTIAL_DELIVERED | RETURNED`; `CANCELLED` from any pre-SHIPPED state.
- **Shipment booking:** `QUEUED → BOOKING → BOOKED | FAILED | UNCERTAIN → (BOOKED | FAILED)`; `BOOKED → CANCELLED`.
- **Shipment status (normalized, forward-only):** `CREATED → PICKUP_PENDING → PICKED_UP → IN_TRANSIT/AT_HUB → (ON_HOLD ↔ OUT_FOR_DELIVERY) → DELIVERED | PARTIAL_DELIVERED | RETURNING → RETURNED`; terminal `CANCELLED | LOST`.
- **Rate card:** `DRAFT → PUBLISHED → ARCHIVED`.
- **Fraud report:** `PENDING → APPROVED | REJECTED`.
- **Payment:** `INITIATED → PENDING → SUCCEEDED | FAILED | CANCELLED → (REFUNDED)`.
- **SEO page:** `DRAFT → NOINDEX ↔ INDEXABLE → PRUNED`.

Courier status mapping tables (RedX 8 statuses, Steadfast `in_review|pending|delivered|partial_delivered|cancelled|hold|…`, Pathao events) live in each adapter's `normalizeStatus` with unit tests.

---

## 8. Data model (summary)
Full schema: `backend/prisma/schema.prisma` (Prisma 7, PostgreSQL). Key aggregates:

| Area | Models |
|---|---|
| Identity | User, OtpCode, Session, PushToken, AuditLog |
| Merchant | Merchant, MerchantMember, ApiKey, Subscription, Payment |
| Geography | Location (tree + aliases + zoneClass), Courier, CourierArea, LocationCourierMap |
| Rates | RateCard, RateSlab, MerchantRateOverride, CrowdRateReport, CourierRouteStat, QuoteLog |
| Shipping | CourierAccount, PickupStore, Customer, Order, OrderItem, Shipment, ShipmentEvent, WebhookInbox |
| Risk | RiskSnapshot, FraudReport |
| Money | CodPayout, CodPayoutLine |
| Channels/AI | ChannelConnection, InboundMessage, Notification, AiParseLog |
| SEO | SeoPage |

Conventions: cuid ids; `*Minor` = poisha ints; grams; timestamps UTC; soft-delete avoided (use status); PII columns documented.
Extra SQL (migrations): `pg_trgm` + GIN indexes on `Location.nameEn/nameBn/aliases`, partial index on active shipments.

---

## 9. REST API (prefix `/api/v1`, JSON, Bearer JWT unless public)

**Public (no auth, rate-limited)**
- `GET  /locations/search?q=&type=` — gazetteer autocomplete (bn/en/banglish)
- `GET  /couriers` — couriers + integration type + logos
- `POST /quotes` — compare (anonymous ok; anonId cookie)
- `GET  /rates/routes/{fromSlug}/{toSlug}` — route data used by SEO pages
- `GET  /rates/couriers/{code}` — current published card summary
- `GET  /track/{publicToken}` — public tracking
- `POST /crowd-rates` — report an actual charge (captcha / logged-in)

**Auth**
- `POST /auth/otp/request`, `POST /auth/otp/verify`, `POST /auth/refresh`, `POST /auth/logout`, `GET /me`, `PATCH /me`

**Merchant**
- `POST /merchants`, `GET/PATCH /merchants/current`, `GET/POST/DELETE /merchants/current/members`
- `GET/PUT /merchants/current/rate-overrides/{courier}`
- `GET/POST /courier-accounts`, `POST /courier-accounts/{id}/verify`, `DELETE /courier-accounts/{id}`, `GET /courier-accounts/{id}/pickup-stores`, `POST /courier-accounts/{id}/sync-areas`
- `GET/POST /customers`, `GET/PATCH /customers/{id}`
- `GET/POST /orders`, `GET/PATCH/DELETE /orders/{id}`, `POST /orders/parse` (AI), `POST /orders/import` (CSV, v2)
- `POST /orders/{id}/recommend` — ranked couriers for this order
- `POST /shipments` (book; `Idempotency-Key`), `POST /shipments/bulk` (v2), `GET /shipments`, `GET /shipments/{id}`, `POST /shipments/{id}/cancel`, `POST /shipments/{id}/refresh`, `GET /shipments/{id}/label.pdf`
- `POST /risk/check` `{phone}` , `POST /risk/check-bulk` `{phones[]}`, `POST /fraud-reports`
- `GET /payouts`, `POST /payouts/import` (CSV), `GET /payouts/{id}` (v2)
- `GET /insights/summary?from=&to=` (v2)
- `POST /billing/checkout` `{plan, provider}`, `GET /billing/subscription`
- `GET/POST/DELETE /api-keys` (v2)
- `POST /devices/push-token`

**Webhooks (no JWT; verified)**
- `POST /webhooks/couriers/redx/{accountToken}` (token in path; RedX docs say credentials in query — support `?token=` too)
- `POST /webhooks/couriers/pathao/{accountToken}` (signature header — verify)
- `POST /webhooks/payments/bkash`, `POST /webhooks/payments/sslcommerz/ipn`
- `GET/POST /webhooks/meta` (v3 Messenger/WhatsApp; verify token + `X-Hub-Signature-256`)

**Admin** (`PLATFORM_ADMIN`/`RATE_EDITOR`)
- `CRUD /admin/rate-cards`, `POST /admin/rate-cards/{id}/publish`
- `GET /admin/mappings/review`, `POST /admin/mappings/{id}/decide`
- `GET /admin/fraud-reports`, `POST /admin/fraud-reports/{id}/moderate`
- `GET /admin/seo/pages`, `POST /admin/seo/rebuild`, `POST /admin/seo/pages/{id}/status`
- `GET /admin/webhooks`, `POST /admin/webhooks/{id}/replay`

Errors: RFC 9457 problem+json with `code` (e.g. `COURIER_AREA_UNMAPPED`), `messageBn`, `messageEn`.
OpenAPI generated at `/api/docs` (dev) and exported to `docs/openapi.json` for frontend/mobile typed clients.

---

## 10. Background jobs (BullMQ queues; `@nestjs/schedule` for cron)

| Queue / cron | Trigger | Work |
|---|---|---|
| `booking` | POST /shipments | create shipment at courier; lock; UNCERTAIN handling |
| `booking-reconcile` | every 2 min | resolve UNCERTAIN via findByInvoice / webhook |
| `webhook-process` | webhook received | normalize, apply events, side effects |
| `tracking-poll` | every 30 min | poll active shipments without recent events (per-courier rate limits) |
| `stale-sweep` | daily 09:00 Asia/Dhaka | flag parcels stuck > 5 days; notify merchant |
| `area-sync` | nightly 03:00 | sync courier area lists; mark disappeared; re-queue mappings |
| `route-stats` | nightly 04:00 | recompute CourierRouteStat (90-day window) |
| `crowd-rates` | on delivered | create CrowdRateReport from actual charges |
| `risk-refresh` | on order create | fetch/refresh RiskSnapshot (cache 24 h) |
| `payout-import` | daily + on demand | pull payouts (where API), match lines, alerts |
| `notifications` | events | push/SMS/WhatsApp with dedupe & cost metering |
| `seo-build` | rate card publish / nightly | recompute SeoPage dataSnapshot + qualityScore; ISR revalidate; sitemap |
| `seo-metrics` | daily | Search Console API pull → impressions/clicks per page (verify API quota) |
| `billing` | daily | renewals, grace, downgrade |
| `retention` | weekly | purge raw chat text > 30 d, AI logs > 90 d, OTPs > 1 d |

All jobs idempotent, with `jobId` dedupe keys and dead-letter queue + admin replay.

---

## 11. Programmatic SEO plan
Guardrails & sources: `docs/research/05-programmatic-seo.md` (Google scaled-content-abuse policy).

### 11.1 Page types & URL patterns (bn default at `/`, English under `/en`)
| Type | URL | Example title (bn) | Count (wave) |
|---|---|---|---|
| Route | `/delivery-charge/{from}-to-{to}` | ঢাকা থেকে চট্টগ্রাম কুরিয়ার চার্জ ২০২৬ — Pathao, Steadfast, RedX তুলনা | 63 (W1) → ~500 (W2: 8 origin hubs × 63) |
| Courier | `/courier/{code}` | Pathao কুরিয়ার চার্জ, COD ও রিটার্ন চার্জ ২০২৬ | 6 (W1) |
| Courier × route | `/courier/{code}/{from}-to-{to}` | only when courier data differs materially & crowd data ≥ 5 reports | ~150 (W3) |
| Courier vs courier | `/compare/{a}-vs-{b}` | Pathao vs Steadfast: কোনটা সস্তা? | 15 (W1) |
| District coverage | `/district/{slug}` | সিলেটে কোন কুরিয়ার কত দিনে পৌঁছায় | 64 (W2) |
| Tools | `/tools/cod-calculator`, `/tools/return-cost`, `/tools/fraud-check` (gated), `/tools/weight-guide` | — | 4 (W1) |
| Guides | `/guides/{slug}` (human-written: "COD charge ki", "return charge kivabe komabo") | — | 10–20 |

Weight / COD variants are **interactive** (query state, `rel=canonical` to base page); separate "1kg" URLs only if Search Console shows demand.

### 11.2 Page anatomy (each block data-backed)
1. H1 + one-sentence answer ("ঢাকা থেকে চট্টগ্রাম ১ কেজি পার্সেল: সর্বনিম্ন ৳120 (RedX), COD সহ ৳135…") — computed.
2. Interactive calculator pre-filled with route.
3. Comparison table (delivery, COD %, return fee, VAT, ETA, last verified + source link).
4. "Real cost" block: expected cost at typical return rate for the destination district.
5. Crowd/actual charges block (median of reports; hidden if < 5 reports).
6. Courier performance in destination (median days, success rate; hidden if < 30 shipments).
7. FAQ generated from data slots (no free-form AI claims), Bangla & English.
8. Internal links: nearby districts, reverse route, courier pages, compare pages.
9. CTA: "Free te book koro / app download".

### 11.3 Quality gate (`qualityScore` 0–100)
- +30 ≥ 3 couriers with PUBLISHED cards verified ≤ 45 days; +20 crowd data present; +15 performance stats present; +15 unique computed summary differs from sibling pages (similarity < 0.8); +10 bn & en complete; +10 internal links ≥ 6.
- Index only if score ≥ 60 (`INDEXABLE`); else `NOINDEX` (still useful for users). Prune if 0 impressions after 120 days → merge/redirect.

### 11.4 Technical
- Next.js App Router, `generateStaticParams` for W1, ISR (`revalidate` tag `route:{from}-{to}`) on rate-card publish via backend → `POST /api/revalidate` (secret).
- `sitemap.xml` index split by type (≤ 5k URLs each), `lastmod` = data change time; `robots.txt`; `hreflang` bn-BD/en-BD + x-default; canonical; Breadcrumb + Organization JSON-LD; `Table` semantics; OG images generated per route (`next/og`).
- Core Web Vitals budget: LCP < 2.0 s on 4G Moto-class device, JS < 90 KB on SEO pages (server components, no client libs except calculator island).
- Bangla font: self-hosted subset (Hind Siliguri / Noto Sans Bengali), `font-display: swap`.

### 11.5 Distribution
- Share cards ("Ajker courier rate chart") auto-generated images for FB seller groups.
- Embeddable widget `<script src="https://rateboi.com/widget.js" data-from="dhaka">` with backlink.

---

## 12. Security & privacy
- OWASP ASVS L2 baseline; Helmet; strict CORS; CSRF not needed for bearer APIs (web uses httpOnly refresh cookie + double-submit token on refresh).
- Tenant isolation via Prisma middleware/extension that injects `merchantId`; e2e tests attempt cross-tenant access.
- Secrets: courier credentials & channel tokens AES-256-GCM with key id (KMS later); rotation runbook.
- PII: phones E.164 + HMAC hash; raw chat text retention 30 days; export/delete my data endpoint (Personal Data Protection Act 2026 — consent, purpose, retention notices; legal review **(verify)**).
- Webhooks: path token + signature where available; replay protection (dedupe key, timestamp window); confirm critical states via API.
- Rate limiting: per IP + per merchant (Redis); risk-check abuse detection (many distinct phones/hour → captcha/lock).
- Audit log for credentials, rate-card publish, fraud moderation, plan changes.
- Dependency & secret scanning in CI (reuse `.github` malware-check pattern from other projects).

## 13. Performance, reliability & cost
- Budgets: public quote p95 < 150 ms; dashboard API p95 < 300 ms; booking end-to-end p95 < 5 s (courier-dependent).
- Availability target 99.5% (MVP). Courier outage isolates per adapter (circuit breaker; booking queue holds).
- Low-cost hosting plan: 1 × 2 vCPU/4 GB VPS (Docker: api + worker + postgres + redis) or Render/Neon free tiers for staging; Cloudflare in front (cache SEO pages); frontend on Vercel hobby/Cloudflare Pages; Expo EAS free tier. Backups: nightly pg_dump to R2.
- Observability: structured JSON logs (pino), OpenTelemetry traces, error tracking (Sentry free tier / NestJS Observe), uptime checks; dashboards for webhook lag, booking failure rate, poll backlog.

## 14. Analytics & KPIs
- Product analytics: PostHog (self-host or cloud free tier) with event taxonomy: `quote_run, quote_result_clicked, signup_started, otp_verified, courier_connected, order_created{source}, ai_parse_{shown,accepted,edited}, risk_check, shipment_booked{courier}, tracking_viewed{public}, plan_upgraded`.
- **North-star:** Weekly Active Shipping Sellers (WASS) — sellers with ≥1 booking OR ≥3 quotes/risk checks in 7 days. Target 10–15k.
- Funnel KPIs: SEO session → calculator use (40%) → signup (6%) → courier connected (50%) → first booking within 7 days (60%) → W4 retention (35%).
- Quality KPIs: AI parse acceptance without edits ≥ 70%; booking failure < 2%; webhook-to-UI lag p95 < 60 s; rate-card freshness ≤ 45 days for 100% of PUBLISHED cards.
- SEO KPIs: indexed/submitted ratio ≥ 70% per template; CTR by template; pages pruned.

## 15. Monetization
| Plan | Price (BDT, verify willingness-to-pay) | Includes |
|---|---|---|
| Free | ৳0 | Unlimited compare; 50 bookings/mo; 20 risk checks/day; 50 AI parses/mo; tracking page with RateBoi branding |
| Pro | ৳299/mo or ৳2,990/yr | Unlimited bookings, 300 AI parses, unlimited risk checks (fair use), routing rules, COD reconciliation, CSV import/export, WhatsApp notifications (pay-per-message credits), remove branding |
| Business | ৳999/mo | 5 staff seats, API keys, WooCommerce plugin, bulk booking, priority support |
Other revenue (later, keep neutrality): courier referral partnerships for new merchant sign-ups (disclosed), packaging-supplier marketplace links, SMS/WhatsApp credit packs.

## 16. In-product growth hooks
1. **Public tracking page** sent to every buyer → "Powered by RateBoi — tumi o seller? Free te try koro".
2. **Share rate chart** image for FB groups (auto-branded, route-specific).
3. **Referral:** give 1 month Pro to both when referred seller books 10 parcels.
4. **Embeddable calculator widget** for blogs/courier-agents → backlinks.
5. **Risk-check result share** (anonymised) to warn seller community (with moderation).
6. **Weekly WhatsApp/push digest:** "Ei shoptaho RedX e pathiye ৳420 bachiyecho" → habit loop.
7. **Android share-sheet target**: share any chat → RateBoi; keeps app top-of-mind.
8. **Seller order-form link** (v3) customers fill → order auto-created (viral via every seller's page).

## 17. Risks & open questions
- Courier API access/ToS (Pathao docs gated; Paperfly/eCourier unverified) → start with RedX + Steadfast + Pathao; others rate-card only.
- Courier rate changes without notice → crowd reports + freshness alerts.
- Legal: cross-merchant risk data sharing under PDPA 2026 → consent in ToS, k-anonymity, lawyer review (verify).
- Meta platform policy for Messenger automation (v3) → App Review timeline.
- Rate neutrality vs partnerships → disclose; ranking never paid.
- Bangla NLP accuracy on mixed scripts → eval set + human-in-loop UI.

## 18. Glossary
ISD = inside Dhaka; OSD = outside Dhaka; COD = cash on delivery; consignment = courier's parcel record; point delivery = hub pickup;
poisha = 1/100 taka; WASS = weekly active shipping sellers; pSEO = programmatic SEO.
