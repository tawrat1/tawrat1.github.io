const { chromium } = require('playwright');
const path = require('path');

const REF = 'cynvjtxxrbbjfehchqhe';
const UID = '11111111-1111-1111-1111-111111111111';
const BIZ = '22222222-2222-2222-2222-222222222222';
const WH_A = '33333333-3333-3333-3333-333333333331';
const WH_B = '33333333-3333-3333-3333-333333333332';
const PROD = '44444444-4444-4444-4444-444444444441';

function fakeSession(role) {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: 'fake.jwt.token', token_type: 'bearer', expires_in: 3600, expires_at: now + 3600,
    refresh_token: 'fake-refresh',
    user: { id: UID, aud: 'authenticated', role: 'authenticated', email: 'owner@test.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
  };
}

function makeData({ role = 'owner', trialDaysLeft = 10 } = {}) {
  const trialEnds = new Date(Date.now() + trialDaysLeft * 86400000).toISOString();
  return {
    member: { id: 'm1', business_id: BIZ, user_id: UID, display_name: 'Tawrat', role, created_at: new Date().toISOString() },
    business: { id: BIZ, name: 'Test Shop', join_code: 'ABC234', owner_id: UID, currency: '$', subscription_status: 'trial', trial_ends_at: trialEnds, payment_link: null, created_at: new Date().toISOString() },
    warehouses: [
      { id: WH_A, business_id: BIZ, name: 'Warehouse A', color: '#00d4ff', created_at: '2026-01-01' },
      { id: WH_B, business_id: BIZ, name: 'Warehouse B', color: '#ffc24b', created_at: '2026-01-02' },
    ],
    products: [{ id: PROD, business_id: BIZ, barcode: '012345678905', name: 'Rice 5kg', photo_url: null, created_at: '2026-01-03' }],
    stock: [
      { product_id: PROD, warehouse_id: WH_A, business_id: BIZ, price: 12.99, stock: 0 },
      { product_id: PROD, warehouse_id: WH_B, business_id: BIZ, price: 12.50, stock: 40 },
    ],
    members: [
      { id: 'm1', display_name: 'Tawrat', role: 'owner', created_at: '2026-01-01' },
      { id: 'm2', display_name: 'Ali', role: 'worker', created_at: '2026-01-02' },
    ],
  };
}

async function mockSupabase(page, data) {
  await page.route(`**/${REF}.supabase.co/**`, async (route) => {
    const url = route.request().url();
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.includes('/auth/v1/user')) return json(fakeSession().user);
    if (url.includes('/auth/v1/token')) return json(fakeSession());
    if (url.includes('/functions/v1/ss-signup')) return json({ ok: true });
    if (url.includes('/rest/v1/ss_members')) {
      if (url.includes('user_id=eq.')) return json(data.member); // maybeSingle
      return json(data.members);
    }
    if (url.includes('/rest/v1/ss_businesses')) return json(data.business); // single
    if (url.includes('/rest/v1/ss_warehouses')) return json(data.warehouses);
    if (url.includes('/rest/v1/ss_products')) return json(data.products);
    if (url.includes('/rest/v1/ss_stock')) return json(data.stock);
    if (url.includes('/rest/v1/rpc/ss_record_sale')) {
      const body = route.request().postDataJSON();
      return json([{ new_stock: 100 - body.p_qty, sale_id: 'sale-1' }]);
    }
    if (url.includes('/realtime/')) return route.abort();
    return json([]);
  });
}

async function seedSession(page) {
  await page.addInitScript(([ref, sess]) => {
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(sess));
  }, [REF, fakeSession()]);
}

(async () => {
  const browser = await chromium.launch(
    process.env.PLAYWRIGHT_BROWSERS_PATH ? { executablePath: '/opt/pw-browsers/chromium' } : {}
  );
  const errors = [];
  const file = 'file://' + path.resolve(__dirname, 'dist/index.html');

  // ---------- 1. Logged-out: landing page ----------
  let page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  await mockSupabase(page, makeData());
  await page.goto(file);
  await page.waitForTimeout(700);
  console.log('landing visible:', await page.locator('#screen-landing.active').count());
  console.log('hero headline:', (await page.locator('.hero h1').textContent()).slice(0, 40) + '…');
  // auth screen tabs
  await page.click('#cta-signup');
  console.log('auth screen:', await page.locator('#screen-auth.active').count(), '| signup pane shown:', await page.locator('#pane-signup').isVisible());
  await page.click('#tab-login');
  console.log('login pane shown:', await page.locator('#pane-login').isVisible());
  await page.click('#auth-back');
  await page.click('#cta-worker');
  console.log('worker login screen:', await page.locator('#screen-worker.active').count());
  // language switch on landing
  await page.click('#worker-back');
  await page.locator('#screen-landing .lang-row button', { hasText: 'پښتو' }).click();
  console.log('PS hero:', (await page.locator('.hero h1').textContent()).slice(0, 30) + '…');
  console.log('PS dir:', await page.evaluate(() => document.documentElement.dir));
  await page.locator('#screen-landing .lang-row button', { hasText: 'English' }).click();
  await page.close();

  // ---------- 1b. Full signup flow through the UI ----------
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => errors.push('PAGEERROR1b: ' + e.message));
  await mockSupabase(page, makeData());
  await page.goto(file);
  await page.waitForTimeout(700);
  await page.click('#cta-signup');
  await page.fill('#su-bizname', 'My Test Shop');
  await page.fill('#su-myname', 'Tawrat');
  await page.fill('#su-email', 'owner@test.com');
  await page.fill('#su-password', 'password123');
  await page.click('#su-submit');
  await page.waitForTimeout(1500);
  console.log('\n[signup] lands on home after instant signup:', await page.locator('#screen-home.active').count());
  await page.close();

  // ---------- 2. Logged-in owner, active trial ----------
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => errors.push('PAGEERROR2: ' + e.message));
  await mockSupabase(page, makeData({ trialDaysLeft: 10 }));
  await seedSession(page);
  await page.goto(file);
  await page.waitForTimeout(1200);
  console.log('\n[owner] home visible:', await page.locator('#screen-home.active').count());
  console.log('[owner] warehouse pill:', await page.locator('#home-wh-name').textContent());
  console.log('[owner] trial banner:', await page.locator('#trial-banner').textContent());
  console.log('[owner] product cards:', await page.locator('.prod-card').count());
  console.log('[owner] manage tab visible:', await page.locator('#nav-admin').isVisible());
  // product detail with out-of-stock + other warehouse
  await page.locator('.prod-card').first().click();
  await page.waitForTimeout(300);
  console.log('[owner] detail name:', await page.locator('.detail-name').textContent());
  console.log('[owner] main price:', await page.locator('.price-box .amount').textContent());
  console.log('[owner] other-wh rows:', await page.locator('.other-wh-list .wh-row').count());
  await page.locator('.other-wh-list .wh-row').first().click();
  await page.waitForTimeout(300);
  console.log('[owner] after switch price:', await page.locator('.price-box .amount').textContent());
  // manage screen
  await page.click('#detail-back');
  await page.click('#nav-admin');
  await page.waitForTimeout(300);
  console.log('[owner] admin visible:', await page.locator('#screen-admin.active').count());
  console.log('[owner] join code shown:', await page.locator('#admin-code').textContent());
  console.log('[owner] product count:', await page.locator('#admin-count').textContent());
  // workers sheet
  await page.click('#admin-workers');
  await page.waitForTimeout(200);
  console.log('[owner] workers listed:', await page.locator('#workers-list .wh-row').count());
  await page.mouse.click(10, 100);
  // CSV import sheet
  await page.click('#admin-import');
  await page.waitForTimeout(200);
  console.log('[owner] import sheet open:', await page.locator('#import-sheet.open').count());
  const csv = 'barcode,name,warehouse,price,stock\n'
    + '5000000000001,Cooking Oil 1L,Warehouse A,4.50,120\n'
    + '5000000000001,Cooking Oil 1L,Warehouse B,4.25,30\n'
    + '5000000000002,Cola 12-pack,Nonexistent Warehouse,8.00,60\n';
  await page.setInputFiles('#import-file', { name: 'products.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.waitForTimeout(200);
  console.log('[owner] import preview:', (await page.locator('#import-summary').textContent()).replace(/\s+/g, ' '));
  console.log('[owner] import confirm visible:', await page.locator('#import-confirm').isVisible());
  await page.click('#import-confirm');
  await page.waitForTimeout(300);
  console.log('[owner] import sheet closed after confirm:', await page.locator('#import-sheet.open').count() === 0);
  // Sell mode (camera is unavailable in this headless run, so it falls through to
  // the existing "type barcode" manual-entry path -- exercises the same handleSell()
  // code a real scan would call)
  await page.click('#nav-home2');
  await page.waitForTimeout(200);
  await page.click('#sell-btn');
  await page.waitForTimeout(800);
  console.log('[sell] qty bar visible:', await page.locator('#sell-qty-bar.show').count());
  await page.click('#sell-qty-plus');
  await page.click('#sell-qty-plus');
  console.log('[sell] qty after 2 taps:', await page.locator('#sell-qty-val').textContent());
  console.log('[sell] camera error fallback shown:', await page.locator('#scan-err').isVisible());
  await page.click('#scan-manual2');
  await page.waitForTimeout(200);
  console.log('[sell] on keypad after camera-fail fallback:', await page.locator('#screen-keypad.active').count());
  for (const d of '012345678905') await page.locator('#keypad button', { hasText: new RegExp('^' + d + '$') }).click();
  await page.locator('#keypad .go').click();
  await page.waitForTimeout(300);
  console.log('[sell] toast after sale:', await page.locator('#toast').textContent());
  console.log('[sell] stayed on keypad (continuous sell):', await page.locator('#screen-keypad.active').count());
  // leaving sell mode via home should not leave scanMode stuck on 'sell'
  await page.click('#keypad-back');
  await page.click('#open-keypad');
  await page.waitForTimeout(200);
  for (const d of '012345678905') await page.locator('#keypad button', { hasText: new RegExp('^' + d + '$') }).click();
  await page.locator('#keypad .go').click();
  await page.waitForTimeout(300);
  console.log('[sell] scanMode reset -> plain lookup opens detail:', await page.locator('#screen-detail.active').count());
  await page.click('#detail-back');
  await page.click('#nav-admin');
  await page.waitForTimeout(200);
  // add product form
  await page.click('#admin-add');
  await page.waitForTimeout(200);
  console.log('[owner] form visible:', await page.locator('#screen-form.active').count(), '| wh price rows:', await page.locator('#form-wh-list .wh-price-row').count());
  // keypad lookup
  await page.click('#form-back');
  await page.click('#nav-home2');
  await page.click('#open-keypad');
  for (const d of '012345678905') await page.locator('#keypad button', { hasText: new RegExp('^' + d + '$') }).click();
  await page.locator('#keypad .go').click();
  await page.waitForTimeout(200);
  console.log('[owner] keypad lookup → detail:', await page.locator('#screen-detail.active').count());
  // unknown barcode → notfound with add (owner)
  await page.click('#detail-back');
  await page.click('#open-keypad');
  for (const d of '777') await page.locator('#keypad button', { hasText: new RegExp('^' + d + '$') }).click();
  await page.locator('#keypad .go').click();
  await page.waitForTimeout(200);
  console.log('[owner] notfound shown:', await page.locator('#screen-notfound.active').count(), '| add btn visible:', await page.locator('#notfound-add').isVisible());
  await page.screenshot({ path: 'shot2-home.png' });
  await page.close();

  // ---------- 3. Worker role: read-only ----------
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => errors.push('PAGEERROR3: ' + e.message));
  await mockSupabase(page, makeData({ role: 'worker' }));
  await seedSession(page);
  await page.goto(file);
  await page.waitForTimeout(1200);
  console.log('\n[worker] home visible:', await page.locator('#screen-home.active').count());
  console.log('[worker] manage tab hidden:', !(await page.locator('#nav-admin').isVisible()));
  await page.locator('.prod-card').first().click();
  await page.waitForTimeout(300);
  console.log('[worker] edit btn hidden:', !(await page.locator('#detail-edit').isVisible()));
  await page.close();

  // ---------- 4. Expired trial → subscribe screen ----------
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => errors.push('PAGEERROR4: ' + e.message));
  await mockSupabase(page, makeData({ trialDaysLeft: -1 }));
  await seedSession(page);
  await page.goto(file);
  await page.waitForTimeout(1200);
  console.log('\n[expired] subscribe screen:', await page.locator('#screen-subscribe.active').count());
  console.log('[expired] note shown:', (await page.locator('#sub-note').textContent()).slice(0, 40) + '…');
  await page.screenshot({ path: 'shot2-subscribe.png' });
  await page.close();

  // ---------- 5. Landing screenshot (desktop) ----------
  page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await mockSupabase(page, makeData());
  await page.goto(file);
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'shot2-landing.png' });
  await page.close();

  console.log('\nJS errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch((e) => { console.error('TEST CRASH:', e.message); process.exit(1); });
