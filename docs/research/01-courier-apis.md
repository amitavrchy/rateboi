# Courier merchant APIs — research notes (checked Nov 2026)

> Rule for agents: **never invent an endpoint.** Everything below is either from an official page or from a
> widely used open-source SDK. Items marked **(verify)** must be confirmed against the courier's own docs /
> merchant panel / sandbox before code depends on them. Each adapter must keep its own contract tests
> against recorded sandbox responses (`backend/test/fixtures/couriers/<courier>/`).

## Summary matrix

| Courier | Public docs? | Auth | Sandbox | Webhooks | Quote/price API | Confidence |
|---|---|---|---|---|---|---|
| RedX | Yes — official OpenAPI page | `API-ACCESS-TOKEN: Bearer <jwt>` | `sandbox.redx.com.bd/v1.0.0-beta` | Yes (POST to callback URL, token in query string) | `GET /charge/charge_calculator` | High |
| Steadfast | Google-Doc/Postman docs from merchant panel; official WP plugin lists endpoints | `Api-Key` + `Secret-Key` headers | Not published (verify) | Not described publicly (verify) — poll | No public quote API; published rate calculator page | Medium-High |
| Pathao | Behind merchant login; unofficial SDKs widely used | OAuth2 password grant (`client_id`, `client_secret`, `username`, `password`) → bearer | Sandbox base URL in merchant docs (verify) | Yes per SDKs: `X-PATHAO-Signature`, must echo secret header (verify) | `POST /aladdin/api/v1/merchant/price-plan` | Medium |
| Paperfly | PDF "Merchant API Document" (v5.5) shared to merchants | Basic Auth + `paperflykey` header (per SDKs) | verify | verify | verify | Low-Medium |
| eCourier | verify (merchant API exists per market knowledge) | verify | verify | verify | verify | Low |
| Sundarban Courier | No merchant API found — treat as **rate-card only** (manual/branch drop) | — | — | — | — | — |
| CarryBee | Appears in fraud-checker tools; API not verified | verify | verify | verify | verify | Low |

## RedX (ShopUp) — best documented
Source: https://redx.com.bd/developer-api/ (official), summarized in https://arrowbin.com/blog/courier-api-integration-bangladesh (Oct 15 2026), OpenAPI listing https://apis.apievangelist.com/store/shopup-parcels-api/
- Base URLs: production `https://openapi.redx.com.bd/v1.0.0-beta`, sandbox `https://sandbox.redx.com.bd/v1.0.0-beta`.
- Header: `API-ACCESS-TOKEN: Bearer {jwt}` (token from merchant dashboard → developer API).
- `POST /parcel` — required: `customer_name, customer_phone, delivery_area, delivery_area_id, customer_address, cash_collection_amount, parcel_weight, value`; optional `merchant_invoice_id, paid_return_charge, instruction, is_closed_box, pickup_store_id, parcel_details_json[]`, `type` (reverse/exchange). Returns `tracking_id`.
- `GET /parcel/track/{trackingId}` (messages), `GET /parcel/info/{trackingId}` (authoritative status), `PATCH /parcels` (update / cancel with reason).
- Areas: `/areas` (filter by `post_code` or `district_name`; returns id, name, post_code, division_name, zone_id). Post code alone is ambiguous (1206 → Kochukhet & Ibrahimpur).
- Pickup stores: list/create via API. **pickup_store_id ≠ shop_id** (common bug; see pub.dev `redx_courier` docs).
- Charge calculator: `GET /charge/charge_calculator` with pickup area, delivery area, COD amount, weight (grams) → `deliveryCharge`, `codCharge`.
- Webhook payload: `tracking_number, timestamp, status, message_en, message_bn, invoice_number, delivery_type`. Statuses: `ready-for-delivery, delivery-in-progress, delivered, agent-hold, agent-returning, returned, agent-area-change, paid` (+ `pickup-pending` seen in samples). Delivery types: regular, reverse, exchange-delivery, exchange-return, partial-delivery, partial-return.
- Weight unit ambiguity (kg vs g) in create endpoint → **verify in sandbox**.

## Steadfast (Packzy)
Sources: official WP plugin https://wordpress.org/plugins/steadfast-api/ ; merchant doc (Google Doc mirror) https://www.pzsalumni.org/stedfast.pdf ; Postman https://documenter.getpostman.com/view/26211192/2sAYJ1mhpk ; SDK https://github.com/Sifat07/steadfast-merchant-sdk ; .NET SDK coverage https://nugetz.dev/package/Steadfast.Courier
- Base URL: `https://portal.packzy.com/api/v1`; headers `Api-Key`, `Secret-Key`, `Content-Type: application/json`.
- `POST /create_order` — `invoice` (unique per account → natural idempotency key), `recipient_name` (≤100), `recipient_phone` (11 digits), `alternative_phone?`, `recipient_email?`, `recipient_address`, `cod_amount` (BDT incl. charges), `note?`, `item_description?`, `total_lot?`, `delivery_type?` (0 home, 1 point/hub pickup). Returns `consignment_id, tracking_code, status: in_review`.
- `POST /create_order/bulk-order` (≤500 per call per SDK).
- Status: `GET /status_by_cid/{id}`, `/status_by_invoice/{invoice}`, `/status_by_trackingcode/{code}`; `/status_with_return_status_by_cid/{id}` (return leg progress) — SDK-reported, verify.
- `GET /get_balance`, `POST /create_return_request`, `GET /get_return_request/{id}`, `GET /get_return_requests`, `GET /payments`, `GET /payments/{id}`, `GET /police_stations` (SDK-reported; verify).
- **Fraud / delivery-risk check:** `GET /fraud_check/score/{phone}` reported by SDKs (returns delivery/cancel ratios, score/level) — verify scope & ToS. Steadfast business page also describes a "Delivery Risk Check" in the panel.
- Status cached ~60s on Steadfast side (SDK note) → don't poll faster.

## Pathao Courier (Aladdin API)
Sources: https://hackmd.io/@saikat/HyX7Wa2eR ; npm `pathao-merchant-sdk` types https://cdn.jsdelivr.net/npm/pathao-merchant-sdk@3.0.2/dist/index.d.mts ; https://github.com/kejubayer/pathao-api-integration ; .NET https://nugetz.dev/package/Pathao.Courier
- Base: `https://api-hermes.pathao.com` (prod) — sandbox URL from merchant docs (verify).
- Token: `POST /aladdin/api/v1/issue-token` (password grant; refresh grant).
- Stores: `GET/POST /aladdin/api/v1/stores`.
- Locations: `GET /aladdin/api/v1/city-list`, `/cities/{cityId}/zone-list`, `/zones/{zoneId}/area-list` (area has `home_delivery_available`, `pickup_available`).
- Orders: `POST /aladdin/api/v1/orders`, `POST /orders/bulk`, `GET /orders/{consignmentId}/info`. delivery_type 48 = normal, 12 = on-demand; item_type 1 document, 2 parcel; weight 0.5–10 kg; phone 11 digits; address 10–220 chars. Nulls must be omitted.
- Price: `POST /aladdin/api/v1/merchant/price-plan` → `price, discount, promo_discount, plan_id, cod_enabled, cod_percentage, additional_charge, final_price`.
- Cancel: `POST /orders/{id}/cancel` appears in one community repo only → verify.
- Webhooks (per SDK/Nudova docs https://docs.nudova.dev/configuration/courier-providers/): verify `X-PATHAO-Signature`, reply 2xx within 10s with header `X-Pathao-Merchant-Webhook-Integration-Secret`. Events `order.created, order.updated, order.pickup-requested, order.picked, order.in-transit, order.delivered, order.delivery-failed, order.returned`, return-journey events. **verify** in panel.

## Paperfly
Sources: https://nugetz.dev/package/Paperfly.Courier ; https://pub.dev/packages/paperfly_courier ; doc listing https://www.scribd.com/document/1031765266/Paperfly-Merchant-API-Document-Reseller-v5-5
- Create: `POST https://api.paperfly.com.bd/merchant/api/service/new_order_v2.php` (Basic Auth + `paperflykey`) fields `merchantOrderReference, storeName, productBrief, packagePrice, max_weight, customerName, customerAddress, customerPhone` — **verify**.
- Track: `POST https://api.paperfly.com.bd/API-Order-Tracking` `{ReferenceNumber}` — **verify**.

## Integration rules we adopt (from Arrowbin field guide + SDK notes)
1. One adapter per courier behind `CourierAdapter { quote, createShipment, getStatus, cancel, listAreas, listStores, verifyWebhook, normalizeStatus }`.
2. Idempotent booking keyed on our `invoice`/`merchant_invoice_id` = `RB-{orderCode}-{attempt}`; lock per order while booking.
3. **Never blindly retry a timed-out create.** Mark `BOOKING_UNCERTAIN`, reconcile via status-by-invoice or webhook, then rebook.
4. Webhook = hint. Before marking `DELIVERED` or `PAID`, confirm via the info/status endpoint.
5. Forward-only status state machine; out-of-order events logged, not applied.
6. Daily sweep polls parcels with no event in N hours.
7. COD amount computed server-side from saved order; edits after booking → update parcel or cancel+rebook.
8. Address → courier area via our own gazetteer + per-courier mapping table + human review queue.
