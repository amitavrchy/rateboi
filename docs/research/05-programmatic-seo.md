# Programmatic SEO — guardrails

Sources:
- Google spam policies (scaled content abuse): https://developers.google.com/search/docs/essentials/spam-policies
- Google guidance on generative-AI content: https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- "Good vs bad pSEO" (SEJ): https://www.searchenginejournal.com/good-vs-bad-pseo-learnings-from-a-decade-of-building-scalable-content-engines/594204/

Takeaways applied to RateBoi:
1. Every page must be backed by **first-party structured data** (rate cards with source + date, crowd-reported actual charges, ETA, coverage, return rules). Pages without enough data → shorter honest page or `noindex`.
2. One page per **distinct intent** (route, courier, courier-vs-courier, district coverage, tool). Weight/COD variants are **interactive state, not separate URLs** (except top-searched "1kg" pages after demand proof in Search Console).
3. Launch in waves (wave 1 ≈ 100 pages: Dhaka → 63 districts + top couriers + tools), monitor index coverage / impressions per template, prune or merge underperformers.
4. AI copy is allowed only for summaries that are **fact-checked against data** (template slots, not free generation); show "last verified" date and sources.
5. Clean hierarchy: Home → Couriers / Districts / Routes / Tools / Guides; breadcrumbs; internal links "nearby districts", "compare couriers on this route".
6. Bangla-first: default locale `bn` with `hreflang` `bn-BD` / `en-BD`; Latin transliterated slugs (`dhaka-to-chattogram`) + Bangla titles ("ঢাকা থেকে চট্টগ্রাম কুরিয়ার চার্জ").
