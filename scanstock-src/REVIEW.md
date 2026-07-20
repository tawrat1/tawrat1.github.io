# ScanStock — Technical Review & State of the Project

> Honest assessment written by the Claude session that built this (July 2026).
> Read together with `SCANSTOCK-HANDOFF.md` (facts/architecture). This file is judgment:
> what is solid, what is weak, and what deserves attention first.

## Executive summary

ScanStock went from idea → deployed product in one session. The core loop (scan → photo/price/stock → cross-warehouse fallback) works and is tested; the backend is a properly secured multi-tenant Supabase setup; the app is live on GitHub Pages. It is a **strong MVP with real production foundations**, but it has known compromises — most chosen deliberately for speed and for a non-technical owner — that the next developer should understand before building on top.

Overall grade: **solid MVP, ~80% of the way to chargeable production**. The missing 20% is payments automation, server-side paywall enforcement, and operational polish.

---

## What is genuinely solid ✅

1. **Multi-tenant data security.** Every `ss_` table has RLS scoped by `ss_my_business_id()`; writes additionally require `ss_i_am_owner()`. Cross-business data leakage is blocked at the database layer, not in JS. Supabase's security advisors were run and their findings fixed (bucket listing exposure removed, function EXECUTE revoked from `anon`, per-row auth re-evaluation fixed, FKs indexed).
2. **Worker UX matches the actual users.** Code + PIN login, picture-first screens, big touch targets, EN/ES/AR with RTL. This is the product's moat — keep every future screen to this standard.
3. **Atomic signup.** The `ss-signup` edge function creates user + business + first warehouse in one call with rollback on failure, pre-confirmed (no email round-trip). Onboarding is ~20 seconds.
4. **Zero-dependency deploys.** One self-contained HTML file; supabase-js and ZXing are bundled at build time. Nothing can break because a CDN changed. Deploy = drag one file.
5. **Test coverage of user flows.** The Playwright suite drives the real UI against a mocked Supabase API: signup, owner flows, worker read-only mode, expired-trial paywall, language switching. All green at handoff. Extend it — don't let it rot.
6. **Editable payment link.** The Stripe link lives in a `<meta>` tag, so the (non-technical) owner can activate payments with a one-line GitHub edit, no rebuild.

## Known weaknesses & compromises ⚠️ (ranked by importance)

1. ~~**Paywall is client-side only.**~~ **Fixed 2026-07-19** (see `supabase/migrations/20260719_server_side_paywall_enforcement.sql`). `ss_subscription_ok()` now gates INSERT/UPDATE on `ss_products`/`ss_stock`/`ss_warehouses`, and a trigger blocks owners from self-mutating `subscription_status`/`trial_ends_at`/`join_code`/`owner_id` via direct REST calls — the latter was a real hole (any owner could previously PATCH their own business row to `active` with a far-future trial). `subscriptionOk()` in `app.js` still runs client-side for UX (routing to the subscribe screen); the DB is now the source of truth backing it up. Remaining edge-function gap: `ss-workers` (create) doesn't check subscription state, so an expired owner can still add workers via that path — low priority since it doesn't itself unlock revenue-generating writes.
2. **Payments are manual.** No Stripe webhook; the owner activates subscribers by SQL. Fine at 5 customers, painful at 50. → *Fix: `ss-stripe-webhook` edge function verifying Stripe signatures, matching `client_reference_id` (already passed = business_id), setting `subscription_status`. Needs the owner's Stripe secret key as a function secret.*
3. **Worker auth is deliberately weak.** Credentials are derived (`w-{code}-{pin}@workers.scanstock.app` / `SS-{CODE}-{pin}`). Anyone who learns a business's join code can brute-force 4-digit PINs against the auth endpoint (Supabase's rate limiting is the only brake). Judged acceptable: workers are read-only and the data (grocery prices) is low-sensitivity. → *If risk profile changes: lengthen PINs, add join-code rotation, or move worker login behind an edge function with attempt counting. Any change to the formula must be made in BOTH `ss-workers` and the frontend, and existing workers must be recreated.*
4. **Two signup paths exist.** The `ss_create_business` RPC remains as a fallback alongside `ss-signup`. Divergence risk (e.g. RPC doesn't reject `@workers.scanstock.app` emails — harmless today since that path requires an authed user, but keep them in sync or retire the RPC).
5. **Single 4,000-line HTML file.** Right call for drag-and-drop deployment; wrong shape for a growing team/codebase. → *Once terminal-based git works, split `app.js` into modules (auth, data, scanner, screens, i18n) — the build already supports it since esbuild bundles anyway. Keep the single-file OUTPUT.*
6. **Realtime = refetch everything.** Any product/stock change refetches the whole dataset (debounced). Fine under ~1,000 products; will need incremental updates at scale.
7. **Offline is read-only.** Cached data displays without a connection, but writes fail. Sell/Receive modes (next features) in a warehouse with bad signal will want an offline write queue — design it into those features from the start rather than bolting on later.
8. **No error tracking or analytics.** If a customer hits a bug, nobody knows. → *Consider a tiny error beacon (even a Supabase `ss_errors` table) before charging money.*
9. **Bundle is ~700 KB**, dominated by ZXing, which is only used on iOS/Safari (Android Chrome uses native BarcodeDetector). → *Optional: lazy-build ZXing into a second file loaded on demand — halves first-load for most users. Conflicts slightly with the one-file rule; decide with the owner.*
10. **Photos bucket is public-read.** Product photos are visible to anyone with the URL (UUID paths, effectively unguessable, not listable). Judged fine for product photos. Don't reuse this bucket for anything sensitive.
11. **Loose ends outside the app:** repo root `index.html` (owner's portfolio) still missing — site root 404s (restore file was sent to the owner as `portfolio-index.html`); the `claude/product-barcode-lookup-4v28xh` branch never reached the remote (read-only token); Supabase Auth Site URL still unset (only matters for password-reset emails); leaked-password protection off.

## Code-quality notes for the next developer

- All user content rendered via `innerHTML` goes through `esc()` — **maintain this discipline** for every new template string; it's the app's XSS defense.
- State is module-level singletons (`products`, `stock`, `warehouses`, `member`, `business`) + `renderX()` functions per screen. Simple and predictable — don't introduce a framework mid-stream; it would force a full rewrite for little gain at this size.
- `ss_stock` upserts MUST include `business_id` (RLS checks it) — an easy bug to reintroduce.
- Money is `numeric(12,2)` in the DB and floats in JS — fine for display; if you ever compute totals for accounting (Sell mode reports!), round at each step or work in cents.
- The demo/test data and the Playwright mocks encode the API contract — when you change a query in `loadAll()`, update `test.js` mocks to match or tests will silently test the wrong shape.
- Fonts/emoji: product placeholder images are emoji-on-canvas data URLs; Figma renders these differently — cosmetic only.

## Suggested order of work (agreed with owner)

1. ~~**Server-side paywall enforcement**~~ Done 2026-07-19.
2. ~~**Sell mode**~~ Done 2026-07-20. `ss_sales` table (owner-read-only via RLS; no direct write policy at all — every write goes through `ss_record_sale`, a `SECURITY DEFINER` RPC that row-locks the stock row, decrements it, and inserts the sale atomically). Frontend: a green "SELL MODE" button on Home starts continuous scan-to-sell (camera stays open between sales, unlike lookup mode which navigates away after one scan) with a ×N quantity stepper; falls back to keypad manual entry if the camera is unavailable. Stock is allowed to go negative by design (see migration comment) rather than blocking a sale at checkout. No sales-history UI yet — that's part of the owner dashboard (#4 below).
3. **Receive mode** — same pattern, `ss_receipts` or reuse a signed-quantity movements table (`ss_stock_moves` with type sell/receive/adjust is the cleaner design — one table, reports fall out of it).
4. **Low-stock alerts** — add `min_stock` to `ss_stock`, badge/list in Manage; later a daily email via scheduled edge function.
5. **Owner dashboard** — implement `design/dashboard.html` (already pixel-final, tokens listed in handoff) as the owner's home screen, fed by the movements table. Figma reference: https://www.figma.com/design/qfjChsLinhr7XncNXTI4BG
6. **Stripe webhook** (needs owner's Stripe account first)
7. PWA manifest, then pricing tiers, then more languages.

## How to verify the current system end-to-end (do this first in the terminal)

```bash
npm install && node build.mjs && node test.js   # expect: all green, "JS errors: none"
```
Then a real-backend smoke test in a browser (`npx serve dist` or open the live site):
sign up a throwaway business → add a product with photo → open a second browser
as a worker (code+PIN) → confirm the product syncs and worker UI is read-only.
Clean up test businesses via Supabase dashboard when done.

---

*Bottom line: the foundations are trustworthy — build features, don't rebuild. The two things standing between this and confidently charging customers are webhook-automated payments and server-enforced trial expiry. Do those early.*
