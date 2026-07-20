# ScanStock — Project Handoff

> Context file for Claude Code. Read this fully before making changes.
> Everything described here was built in a previous Claude session (July 2026) and is **live in production**.

## What ScanStock is

A mobile-first SaaS web app for small shops/warehouses whose workers often **cannot read English or invoices**. A worker points their phone at a product barcode and instantly sees the product **photo, price, and stock** for their selected warehouse. If it's out of stock, the app lists the **other warehouses that have it**, with prices — one tap switches warehouse. Owners manage products/warehouses/workers; the product is sold as a subscription ($9.99/month after a 14-day free trial).

- Owner: `tawrat1` (GitHub) / tawratrustam@gmail.com
- Live app: **https://tawrat1.github.io/scanner/** (GitHub Pages, repo `tawrat1/tawrat1.github.io`, folder `scanner/`)
- UI languages: English, Pashto (full RTL). Design is picture-first / minimal reading. (Spanish/Arabic were the original placeholder languages; replaced 2026-07-20 with Pashto since the actual target workers are Afghan.)

## Architecture (all live, do not rebuild from scratch)

| Layer | What | Where |
|---|---|---|
| Frontend | Single self-contained `index.html` (~700 KB), esbuild bundle of `src/app.js` + supabase-js + @zxing/library injected into `src/index.template.html`. No runtime CDN deps. | `scanner/index.html` in the Pages repo; source in `scanstock-source.zip` |
| Backend | Supabase project **cynvjtxxrbbjfehchqhe** (`https://cynvjtxxrbbjfehchqhe.supabase.co`, eu-west-1) — SHARED with an unrelated prayer-times app; all ScanStock objects are prefixed `ss_`. **Never touch non-`ss_` tables.** | Supabase dashboard |
| Auth | Supabase Auth. Owners: email+password. Workers: derived credentials (see below). | — |
| Storage | Public bucket `product-photos`, paths `{business_id}/{product_id}.jpg`, 2 MB limit, jpeg/png/webp. Public read via URL (no listing); writes owner-only via RLS. | Supabase Storage |
| Payments | Stripe Payment Link (NOT yet created — placeholder). Activation is currently manual SQL. | — |
| Design | Owner-dashboard concept (navy/electric-blue, MD3): Figma file https://www.figma.com/design/qfjChsLinhr7XncNXTI4BG + pixel-perfect HTML in `design/dashboard.html` (in source zip if included, else re-request) | Figma drafts |

Publishable anon key (safe to embed in client code):
`sb_publishable_tuJmdu-WtnOg1SuvwOWwCA_99BLWYxw`

## Database schema (already migrated — for reference only)

Tables (all in `public`, all RLS-enabled):

- `ss_businesses` — id, name, **join_code** (6 chars, unique, alphabet excludes 0/O/1/I/L), owner_id→auth.users, currency (default '$'), subscription_status ('trial'|'active'|'expired', default 'trial'), trial_ends_at (now()+14 days), payment_link (unused), created_at
- `ss_members` — id, business_id, user_id (unique)→auth.users, display_name, role ('owner'|'worker'), created_at
- `ss_warehouses` — id, business_id, name, color, created_at
- `ss_products` — id, business_id, barcode, name, photo_url, created_at, **unique(business_id, barcode)**
- `ss_stock` — pk(product_id, warehouse_id), business_id, price numeric(12,2) nullable, stock int default 0 (**can go negative**, see `ss_record_sale` below)
- `ss_sales` — id, business_id, product_id, warehouse_id, qty (>0), price_at_sale numeric(12,2), sold_by→ss_members(id), created_at. No client-facing write policy at all — every row is written by `ss_record_sale`. SELECT is owner-only (feeds the not-yet-built owner dashboard).

Helper functions (SECURITY DEFINER, granted to `authenticated` only, `anon` explicitly revoked):
- `ss_my_business_id()` → uuid of caller's business
- `ss_i_am_owner()` → bool
- `ss_subscription_ok()` → bool, true if `subscription_status='active'` or trial not yet expired. Gates INSERT/UPDATE on `ss_products`/`ss_stock`/`ss_warehouses` (added 2026-07-19, see weakness #1 in REVIEW.md) and sales in `ss_record_sale`.
- `ss_create_business(p_name, p_display_name)` → creates business + owner member + 'Main Warehouse' (used as fallback; normal signup goes through the edge function)
- `ss_record_sale(p_product_id, p_warehouse_id, p_qty)` → row-locks the `ss_stock` row, decrements `stock` by `p_qty` (no floor — can go negative), inserts an `ss_sales` row, returns `(new_stock, sale_id)`. This is how Sell mode writes — workers never get a raw UPDATE policy on `ss_stock`'s `stock` column.

RLS pattern: SELECT for any member of the business (`business_id = ss_my_business_id()`); INSERT/UPDATE on `ss_products`/`ss_stock`/`ss_warehouses` require `ss_i_am_owner()` **and** `ss_subscription_ok()`. `ss_members` writes happen only via service role (edge functions). `ss_businesses` has a trigger (`ss_businesses_protect_billing_columns`) that pins `subscription_status`/`trial_ends_at`/`join_code`/`owner_id` against any client-authenticated UPDATE — only service-role calls (edge functions, SQL editor) can change them. Realtime publication includes ss_products, ss_stock, ss_warehouses, ss_businesses (not ss_sales). Indexes exist on all business_id FKs + ss_businesses.owner_id + ss_stock.warehouse_id + ss_sales(business_id, created_at desc).

## Edge functions (deployed, verify_jwt=true)

1. **`ss-signup`** — POST {email, password, business_name, display_name}. Creates a **pre-confirmed** user via admin API (no email-confirmation step), then business + owner member + first warehouse atomically (rolls back user on failure). Rejects emails ending `@workers.scanstock.app`. Client then calls `signInWithPassword`.
2. **`ss-workers`** — Owner-only (checks caller's ss_members role via JWT). Actions:
   - `create` {name, pin}: pin must be /^\d{4,6}$/. Creates auth user with **email `w-{join_code_lower}-{pin}@workers.scanstock.app`, password `SS-{JOIN_CODE}-{pin}`**, pre-confirmed, + ss_members row (role worker). Duplicate email ⇒ "PIN already used".
   - `delete` {member_id}: deletes the auth user (cascades to ss_members). Cannot delete owner.

**Worker login is derived client-side** from business code + PIN using the same formula — no lookup needed. If you ever change this formula, change it in BOTH the edge function and the frontend, and know that existing workers' credentials won't match (recreate workers).

## Frontend structure (source zip: `app.js`, `index.template.html`, `build.mjs`, `package.json`)

- Screens (`.screen` divs, `showScreen(name)` router): landing (marketing + pricing), auth (owner signup/login tabs), worker (code+PIN), createbiz (resume interrupted signup), home, scan, keypad, detail, notfound, admin, form, subscribe. Sheets: wh-picker, wh-manager, workers-sheet, settings-sheet, import-sheet.
- **Bulk CSV import** (owner-only, `admin-import` button → `import-sheet`): columns `barcode,name,warehouse,price,stock`, one row per product+warehouse — lets a shop with prices that differ per warehouse express that directly, rather than one row per product. Warehouse names must match an existing warehouse exactly (case-insensitive); unmatched names are reported as per-row errors rather than silently creating warehouses. Re-importing the same barcode+warehouse **upserts** (updates name/price/stock) — safe to fix a CSV and re-upload. Product photos are not part of the CSV; add them per-product afterward via the existing edit-product photo picker. Client-side only (`ss_products`/`ss_stock` upsert via the browser's Supabase client, batched in chunks of 300 rows) — no new edge function, gated by the same `ss_subscription_ok()` RLS check as manual product entry.
- Barcode scanning: native `BarcodeDetector` when available, bundled ZXing `BrowserMultiFormatReader` fallback, manual big-keypad entry as last resort.
- **Sell mode**: green "SELL MODE" button on Home calls `startSellMode()` → `startScan('sell')`. `scanMode` (`'lookup' | 'form' | 'sell'`) is a persistent global read by `onScanResult()`/the keypad's GO handler — in `'sell'` it calls `handleSell(code)` instead of navigating to the detail screen, and critically the scan loop keeps running (`stopScan()` is *not* called) so a worker can scan item after item without re-opening the camera each time; lookup/form mode still stops after one hit. A ×N quantity stepper (`sell-qty-bar`, resets to ×1 after each sale) sits on the scan screen. `handleSell` calls the `ss_record_sale` RPC, optimistically patches the local `stock` cache with the returned `new_stock`, and toasts `"Sold N× Name — X left"` (or `OUT OF STOCK`). Falls back to keypad manual entry if the camera errors — **`scanMode` is explicitly reset to `'lookup'` whenever the keypad is opened directly from Home or the scan screen is closed**, so a worker can't accidentally sell on a later plain lookup after leaving an interrupted sell session (this was a real bug caught in testing, not a hypothetical). No sales-history UI exists yet client-side; `ss_sales` is written but only the owner dashboard (roadmap #4) will read it back.
- Data flow: `loadAll()` fetches member→business→warehouses/products/stock/members in parallel; in-memory state + `localStorage` cache (`ss_cache`) for offline read; Supabase Realtime channel triggers debounced refetch. Photos: canvas-downscaled to ≤800px JPEG, uploaded to storage, public URL + cache-bust query saved on product.
- Roles: workers get read-only UI (no Manage tab, no edit buttons, no add-product on not-found).
- Trial/paywall: computed client-side from `trial_ends_at`/`subscription_status`; expired owners are routed to the subscribe screen. **Stripe Payment Link is read at runtime from `<meta name="ss-payment-link" content="">` (~line 8 of index.html)** so it can be edited without rebuilding. Empty ⇒ "contact us" fallback text.
- i18n: `I18N` dict (en/ps), `t(key)`, `data-i18n` attributes, `dir=rtl` for Pashto.

### Build & test

```bash
npm install            # @supabase/supabase-js, @zxing/library, esbuild
node build.mjs         # → dist/index.html (single file, everything inlined)
node test.js           # Playwright suite — mocks the Supabase API via page.route()
```

The test suite covers: landing/auth/worker screens, full signup→home flow, owner home/detail/warehouse-switch/admin/workers/form/keypad/not-found, worker read-only mode, expired-trial paywall, ES/AR language. Keep it green; extend it for new features using the same route-mocking pattern.

## GitHub repo & live URL — how to connect from the terminal

- **Repository:** `https://github.com/tawrat1/tawrat1.github.io` (the owner's GitHub Pages site)
- **Live app URL:** `https://tawrat1.github.io/scanner/` — served from the `scanner/index.html` file on the `main` branch. GitHub Pages redeploys automatically ~1–5 min after any commit to `main`.

Set up the working copy (if this handoff isn't already inside a clone):

```bash
git clone https://github.com/tawrat1/tawrat1.github.io
cd tawrat1.github.io
# put the project files (src/, build.mjs, package.json, test.js, design/, *.md) in here too —
# commit them so the source finally lives in version control, e.g. under scanstock-src/
```

Deploy routine from the terminal (this replaces last session's manual uploads):

```bash
node build.mjs                          # produces dist/index.html
cp dist/index.html scanner/index.html   # the live path
git add -A && git commit -m "Deploy ScanStock <change summary>"
git push origin main
# verify ~2 min later at https://tawrat1.github.io/scanner/
```

Notes:
- The terminal uses the OWNER's git credentials, which have full write access — the read-only problem described below was specific to the previous cloud session's app token.
- Work on feature branches if you like, but the live site only updates from `main`.
- The repo root currently has **no `index.html`** (the owner's portfolio page was displaced during a manual upload — see below). If the owner provides `portfolio-index.html`, commit it back as root `index.html` to fix the 404 at `tawrat1.github.io`.

## Deployment history (context — why last session deployed manually)

- **Target:** replace `scanner/index.html` on the `main` branch of `tawrat1/tawrat1.github.io`. GitHub Pages serves it in 1–5 min.
- Last session's Claude GitHub app token was **read-only** ("Permission to … denied", "Resource not accessible by integration") — pushes, branch creation, and repo creation all 403'd. The owner uploads files manually via GitHub web UI as fallback. **First thing to try in your session: a normal `git push`. If it works, deploy directly; if 403, produce the file and let the owner upload it.**
- Branch note: remote branch `claude/product-barcode-lookup-4v28xh` never got created (read-only token); the prototype commit's content reached `main` via manual upload. Also: the repo's root `index.html` (owner's CS portfolio) was accidentally overwritten during a manual upload and later moved to `scanner/`; the portfolio has NOT been restored — repo root currently 404s. The original portfolio HTML was sent to the owner as `portfolio-index.html`.

## Manual owner runbook (things only the owner does)

- **Activate a paying business:** Supabase → SQL Editor: `update ss_businesses set subscription_status='active' where join_code='XXXXXX';`
- **Set Stripe link:** create Payment Link at stripe.com, paste into the `ss-payment-link` meta tag on GitHub (single-line edit).
- Optional Supabase dashboard settings (not doable via MCP): Auth → URL Configuration → Site URL/redirect `https://tawrat1.github.io/scanner/` (only needed for password-reset emails now); enable leaked-password protection.

## Agreed roadmap (next work, in priority order)

1. **Sell mode** — scan → stock −1 (with ×N multiplier); writes a sales log table (new: e.g. `ss_sales`) for reports. Workers need INSERT rights on sales + UPDATE on ss_stock.stock only — design RLS carefully (current policy is owner-only writes).
2. **Receive mode** — scan + quantity → stock +N (delivery intake without reading invoices).
3. **Low-stock alerts** — per-product minimum threshold + owner dashboard badge/list.
4. **Owner dashboard screen** — already fully designed (Figma + `design/dashboard.html`): sales-goal progress ring, stat cards, weekly bar chart, "needs attention" list, new bottom nav (Home/Reports/[Scan FAB]/Stock/Manage). Implement it as the owner home when sales data exists.
5. Stripe webhook auto-activation (needs owner's Stripe keys; edge function + `client_reference_id` = business_id is already appended to the payment link URL).
6. PWA manifest ("Add to Home Screen"), pricing tiers, stock-count/audit mode, more languages (each ~30 min: extend I18N dict).

## Design system (for any new screens)

Dark navy + electric blue. Tokens: bg `#060D1F`/`#0b1015`, card `#101E3C`–`#1a242f`, border `#27374a`, primary `#3B82F6`, accent `#38BDF8`/`#00d4ff`, success `#34D399`/`#00e5a0`, warn `#FBBF24`, danger `#F87171`/`#ff5c72`, text `#F2F6FF`, muted `#9FB0CC`. 8pt spacing grid, radii 12/18/24, big touch targets (≥44px), status always icon+label (never color alone), picture-first minimal-text UX. System sans (Inter on desktop).

## Hard-won gotchas

- Emojis are used as image placeholders and demo-product images (canvas-rendered data URLs).
- `ss_stock` upserts need `business_id` set (RLS checks it); price cleared in the form ⇒ delete that stock row.
- The whole app is ONE html file on purpose — the owner deploys by drag-and-drop. Keep it that way unless the owner agrees to a real pipeline.
- Playwright in cloud sandboxes: launch with `executablePath: '/opt/pw-browsers/chromium'` if `PLAYWRIGHT_BROWSERS_PATH` is set; locally, plain `chromium.launch()` is fine.
- Do not create a second Supabase project (the owner declined the cost prompt); stay on `cynvjtxxrbbjfehchqhe` with the `ss_` prefix convention.
