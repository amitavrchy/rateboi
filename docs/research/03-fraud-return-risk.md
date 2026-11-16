# COD fraud & return-risk checks

Problem: fake/refused COD orders cost sellers a delivery + return charge each. "Fraud checker by phone" tools are a
crowded but **very high-frequency** use case (sellers check every order) → strong retention hook.

## Landscape (Nov 2026)
- Steadfast: official merchant fraud score endpoint reported by SDKs: `GET https://portal.packzy.com/api/v1/fraud_check/score/{phone}` (verify scope/ToS). Panel "Delivery Risk Check".
  Source: https://github.com/Sifat07/steadfast-merchant-sdk
- Pathao / RedX: merchant APIs exist but **no public customer-history contract**. Several tools scrape merchant panels with merchant credentials — **we will not do this** (ToS + credential risk).
  Source: https://github.com/TeamRSBDigital/bd-courier-history-checker (explicit "documentation blockers" design)
- Third-party aggregators: Pixahunt API https://www.pixahunt.com/developers/docs/cross-platform-courier-fraud-checker-api (mentions proxy rotation — legal/ToS risk, avoid), Fraud Checker BD https://fraud-check.ihossain.site/ , https://courier.naimurrahmannahid.com/
- OSS: https://github.com/programmertowheed/BD-Courier-Fraud-Checker

## RateBoi approach (legal-first)
1. **Sources, in order:** (a) the merchant's *own* connected courier accounts via official endpoints (Steadfast fraud score if permitted); (b) RateBoi network data: hashed-phone delivery outcomes from shipments booked through RateBoi (consented, aggregated, k-anonymity ≥ 3 merchants before showing); (c) community fraud reports with evidence + moderation.
2. Phone stored as normalized E.164 + **HMAC-SHA256 hash with server pepper** for cross-merchant lookups. Raw phone visible only to the merchant who owns the customer.
3. Output: success rate, total parcels, returned, risk level (`SAFE | WATCH | RISKY | BLOCKLISTED`), Bangla + English recommendation (e.g. "ডেলিভারি চার্জ অগ্রিম নিন").
4. Rate limits per plan; cache snapshots 24h; never put phone in URLs (POST only).
5. Personal Data Protection Act 2026 (Bangladesh): consent must be specific & withdrawable; publish purpose/retention; support deletion. Sources: https://bdlaws.minlaw.gov.bd/act-details-1692.html?lang=en , https://trw.co/bangladesh-data-protection-law-2026/ — have a lawyer review the cross-merchant data sharing model (verify).
