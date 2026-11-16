This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

---

# RateBoi mobile rules (read `../../AGENTS.md` + `../../PROJECT_SPEC.md` first)

Android-first seller app (Expo SDK 58, Expo Router, TypeScript). Target: low/mid Android (2–3 GB RAM), flaky 3G/4G, Bangla UI.

## Screens (Expo Router, `src/app/`)
- `(auth)/login` (phone OTP) · `(auth)/onboarding` (shop name, pickup area, connect courier)
- `(tabs)/index` — Quick quote (from/to/weight/COD) + today's summary
- `(tabs)/orders` — list, filters (ready / shipped / problem), bulk risk badges
- `order/new` — form + **Paste chat** button (AI parse) with low-confidence fields highlighted
- `order/[id]` — recommend couriers (expected cost, ETA, success rate) → Book → label share/print
- `(tabs)/track` — shipments timeline, search by phone/tracking
- `risk` — phone check (paste/clipboard detect), result in Bangla
- `(tabs)/more` — courier accounts, plan, language, support
- `share-intent` — receive text shared from Messenger/WhatsApp → order/new prefilled

## Rules
- Install deps with `npx expo install <pkg>` only. Check Expo SDK 58 docs (`https://docs.expo.dev/versions/v58.0.0/`) before using any API.
- Share-intent receiving requires a config plugin (e.g. `expo-share-intent` — verify SDK 58 compatibility) → needs a development build, not Expo Go.
- Server state: TanStack Query; local persistence: `expo-sqlite` (orders outbox, cached quotes, rate cards for offline quote).
- **Offline outbox:** mutations (create order, book) saved locally with an `Idempotency-Key`, replayed when online; UI shows "queued".
- Push: `expo-notifications` (booking result, out for delivery, returned). Register token via `POST /devices/push-token`.
- Secure storage: `expo-secure-store` for refresh token. Never store courier credentials on device.
- Phone actions: one-tap call/WhatsApp customer via `Linking`.
- i18n: `src/i18n/{bn,en}.ts`; Bangla default; font that renders Bangla conjuncts correctly (Noto Sans Bengali).
- Performance: FlashList for long lists (verify), memoized rows, images via `expo-image`; app start < 2.5 s on mid Android.
- No `android/` or `ios/` dirs in git (Continuous Native Generation). App id: `com.rateboi.app` (set in app.json before first EAS build).
- Commands: `npx expo start`, `npm run typecheck`, `npx expo lint`, `npx eas-cli@latest build -p android --profile preview`.
