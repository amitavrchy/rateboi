# Messaging (WhatsApp / Messenger) & AI notes

## WhatsApp Business Platform pricing (Meta, page updated Sep 30 2026)
Source: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
- Per-message pricing; charged only on delivery; categories: marketing, utility, authentication, service, Meta Business Agent.
- **Bangladesh is a standalone market from Oct 1 2026** with *decreased* utility/auth rates.
- From Oct 1 2026: utility templates are charged even inside the 24h customer-service window; service messages have a free tier of **1,000/month per business phone number**.
- Non-template messages only inside an open 24h window; templates (utility) for "out for delivery" notices.
- Click-to-WhatsApp ads open a 7-day free entry point window.
→ RateBoi: utility templates only for high-value events (`OUT_FOR_DELIVERY`, `DELIVERED`, `RETURNING`), opt-in captured, cost metered per merchant plan; SMS fallback via local SMS gateway.

## Messenger
- Sellers live in Facebook Page inbox. v1 = **copy-paste / Android share-sheet** of chat text into RateBoi → AI parser (no Meta app review needed).
- v2 = Messenger Platform webhook integration (Page subscription, `pages_messaging` permission; requires Meta App Review — verify current permission names & 24h/human-agent tag policy).

## AI features (design notes)
- Order text parser: Bangla/Banglish/English mixed text → JSON (`customerName, phones[], address, district, thana, items[{name, qty, unitPrice}], codAmount, deliveryChargePaidBy, notes`) via LLM structured output + deterministic validators (BD phone regex `^01[3-9]\d{8}$`, amount sanity) + gazetteer resolver. Per-field confidence; UI highlights low-confidence fields.
- Courier recommender: expected-cost model (delivery + COD + P(return)×return cost) + ETA + merchant's own district success rate.
- Return-risk score: logistic model / rules v1 on phone history, order value, district return rate, new-customer flag, time-of-day; v2 gradient boosting trained on network outcomes.
- Provider abstraction `AiProvider` (env `AI_PROVIDER`, `AI_MODEL`); log prompts/outputs to `AiParseLog` (PII-redacted) for eval set; offline eval suite of 200 real anonymized messages before each prompt change.
