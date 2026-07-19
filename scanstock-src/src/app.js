/* ScanStock — production app logic. Bundled with esbuild into a single HTML file. */
import { createClient } from '@supabase/supabase-js';
import { BrowserMultiFormatReader } from '@zxing/library';

// ---------------- Config ----------------
const SUPABASE_URL = 'https://cynvjtxxrbbjfehchqhe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tuJmdu-WtnOg1SuvwOWwCA_99BLWYxw';
// Stripe Payment Link comes from the <meta name="ss-payment-link"> tag in the HTML head,
// so it can be edited on GitHub without rebuilding. Empty = subscribe screen shows "contact us".
const PAYMENT_LINK = document.querySelector('meta[name="ss-payment-link"]')?.content?.trim() || '';
const PRICE_TEXT = { en: '$9.99 / month', es: '$9.99 / mes', ar: '9.99$ / شهريًا' };
const TRIAL_DAYS = 14;

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------- i18n ----------------
const I18N = {
  en: {
    tagline: 'Scan a barcode. See the picture, price and stock — instantly.',
    heroSub: 'Made for shops and warehouses where workers should not need to read invoices. One scan shows everything.',
    startTrial: 'Start 14-day free trial', ownerLogin: 'Owner log in', workerLogin: 'Worker log in',
    feat1t: 'Scan & see', feat1d: 'Point the phone at any barcode. The product photo, price and stock appear.',
    feat2t: 'Every warehouse', feat2d: 'Out of stock? The app shows which other warehouse has it, and its price.',
    feat3t: 'No reading needed', feat3d: 'Pictures and numbers first. Workers log in with just a code and a PIN.',
    pricingT: 'Simple pricing', pricingTrial: '14 days free — no card needed',
    signupT: 'Create your business', loginT: 'Owner log in',
    email: 'Email', password: 'Password', bizName: 'Business name', yourName: 'Your name',
    createAccount: 'Create account', logIn: 'Log in', forgotPw: 'Forgot password?',
    haveAccount: 'Already have an account? Log in', noAccount: 'New here? Create your business',
    checkEmail: 'Check your email and click the confirmation link, then log in.',
    workerT: 'Worker log in', bizCode: 'BUSINESS CODE', pin: 'PIN',
    workerHint: 'Ask your boss for the code and your PIN',
    enter: 'ENTER', wrongLogin: 'Wrong code or PIN',
    scanBtn: 'SCAN BARCODE', searchPh: 'Search product…', typeBarcode: 'Type barcode number',
    products: 'Products', noProducts: 'No products yet. Open Manage to add your first product.',
    noProductsWorker: 'No products yet. Ask the owner to add products.',
    navHome: 'Home', navManage: 'Manage', scanHint: 'Point camera at the barcode',
    camError: 'Camera not available. You can type the barcode number instead.',
    keypadPh: 'Enter number…', productInfo: 'Product', notFoundTitle: 'Not found',
    notFoundMsg: 'This barcode is not in the system:', addThis: 'Add this product', scanAgain: 'Scan again',
    manage: 'Manage', warehouses: 'Warehouses', workers: 'Workers', settings: 'Settings',
    addProduct: 'Add product', editProduct: 'Edit product', takePhoto: 'Take a photo',
    barcode: 'Barcode', prodName: 'Product name', priceStockPerWh: 'Price & stock per warehouse',
    save: 'Save', delete: 'Delete product', chooseWh: 'Choose warehouse', newWhPh: 'New warehouse name…',
    inStock: 'IN STOCK', lowStock: 'LOW', outStock: 'OUT OF STOCK', noPrice: 'Not sold here',
    otherWh: 'Other warehouses', price: 'Price', stock: 'Stock',
    saved: 'Saved ✔', needName: 'Please add a name', needBarcode: 'Please add a barcode',
    dupBarcode: 'This barcode already exists', confirmDelete: 'Delete this product?',
    confirmDeleteWh: 'Delete this warehouse?', needOneWh: 'You need at least 1 warehouse',
    confirmDeleteWorker: 'Remove this worker?',
    addWorker: 'Add worker', workerName: 'Worker name', workerPin: 'PIN (4-6 numbers)',
    workerCreated: 'Worker added ✔ Give them the business code + their PIN',
    yourCode: 'Your business code', codeHint: 'Workers use this code + their PIN to log in',
    currency: 'Currency symbol', logout: 'Log out',
    trialLeft: (d) => `Free trial: ${d} day${d === 1 ? '' : 's'} left`,
    trialOver: 'Your free trial has ended',
    subT: 'Subscribe to keep using ScanStock',
    subMsg: 'Your 14-day free trial has ended. Subscribe to keep your products, warehouses and workers.',
    subBtn: 'Subscribe now', subAfter: 'After payment your account is activated within 24 hours.',
    subContact: 'Payment setup is being finished. Contact us to activate your account.',
    active: 'Subscription active ✔', offline: 'No connection — showing last saved data',
    loading: 'Loading…', errGeneric: 'Something went wrong. Try again.',
    pwShort: 'Password must be at least 8 characters', pinFormat: 'PIN must be 4-6 numbers',
    uploadingPhoto: 'Uploading photo…', readOnly: 'Only the owner can change products',
    importCsv: 'Import CSV', importT: 'Import products from CSV',
    importHint: 'Columns: barcode, name, warehouse, price, stock — one row per product per warehouse. Warehouse names must match exactly. Re-importing the same barcode + warehouse updates it.',
    downloadTemplate: 'Download template', chooseFile: 'Choose CSV file',
    importPreviewCount: (n) => `${n} row${n === 1 ? '' : 's'} ready to import`,
    importErrorsCount: (n) => `${n} row${n === 1 ? '' : 's'} skipped`,
    importConfirm: 'Import', importDone: (n) => `Imported ${n} row${n === 1 ? '' : 's'} ✔`,
    whNotFound: (name) => `Warehouse "${name}" not found`,
    invalidPrice: 'Invalid price', invalidStock: 'Invalid stock',
    missingBarcode: 'Missing barcode', missingName: 'Missing name', missingWarehouse: 'Missing warehouse',
    noValidRows: 'No rows found in this file', csvColumnsMissing: 'CSV must have columns: barcode, name, warehouse, price',
    row: 'Row',
  },
  es: {
    tagline: 'Escanee un código. Vea la foto, el precio y el stock — al instante.',
    heroSub: 'Hecho para tiendas y almacenes donde los trabajadores no necesitan leer facturas. Un escaneo lo muestra todo.',
    startTrial: 'Prueba gratis de 14 días', ownerLogin: 'Entrar (dueño)', workerLogin: 'Entrar (trabajador)',
    feat1t: 'Escanear y ver', feat1d: 'Apunte el teléfono a cualquier código. Aparece la foto, el precio y el stock.',
    feat2t: 'Cada almacén', feat2d: '¿Agotado? La app muestra qué otro almacén lo tiene y su precio.',
    feat3t: 'Sin lectura', feat3d: 'Fotos y números primero. Los trabajadores entran solo con un código y un PIN.',
    pricingT: 'Precio simple', pricingTrial: '14 días gratis — sin tarjeta',
    signupT: 'Cree su negocio', loginT: 'Entrar (dueño)',
    email: 'Correo', password: 'Contraseña', bizName: 'Nombre del negocio', yourName: 'Su nombre',
    createAccount: 'Crear cuenta', logIn: 'Entrar', forgotPw: '¿Olvidó su contraseña?',
    haveAccount: '¿Ya tiene cuenta? Entrar', noAccount: '¿Nuevo? Cree su negocio',
    checkEmail: 'Revise su correo y haga clic en el enlace de confirmación, luego entre.',
    workerT: 'Entrada de trabajador', bizCode: 'CÓDIGO DEL NEGOCIO', pin: 'PIN',
    workerHint: 'Pida a su jefe el código y su PIN',
    enter: 'ENTRAR', wrongLogin: 'Código o PIN incorrecto',
    scanBtn: 'ESCANEAR CÓDIGO', searchPh: 'Buscar producto…', typeBarcode: 'Escribir número de código',
    products: 'Productos', noProducts: 'Sin productos todavía. Abra Administrar para agregar el primero.',
    noProductsWorker: 'Sin productos todavía. Pida al dueño que agregue productos.',
    navHome: 'Inicio', navManage: 'Administrar', scanHint: 'Apunte la cámara al código de barras',
    camError: 'Cámara no disponible. Puede escribir el número del código.',
    keypadPh: 'Escriba el número…', productInfo: 'Producto', notFoundTitle: 'No encontrado',
    notFoundMsg: 'Este código no está en el sistema:', addThis: 'Agregar este producto', scanAgain: 'Escanear de nuevo',
    manage: 'Administrar', warehouses: 'Almacenes', workers: 'Trabajadores', settings: 'Ajustes',
    addProduct: 'Agregar producto', editProduct: 'Editar producto', takePhoto: 'Tomar una foto',
    barcode: 'Código de barras', prodName: 'Nombre del producto', priceStockPerWh: 'Precio y stock por almacén',
    save: 'Guardar', delete: 'Eliminar producto', chooseWh: 'Elegir almacén', newWhPh: 'Nombre del nuevo almacén…',
    inStock: 'HAY STOCK', lowStock: 'POCO', outStock: 'AGOTADO', noPrice: 'No se vende aquí',
    otherWh: 'Otros almacenes', price: 'Precio', stock: 'Stock',
    saved: 'Guardado ✔', needName: 'Agregue un nombre', needBarcode: 'Agregue un código de barras',
    dupBarcode: 'Este código ya existe', confirmDelete: '¿Eliminar este producto?',
    confirmDeleteWh: '¿Eliminar este almacén?', needOneWh: 'Necesita al menos 1 almacén',
    confirmDeleteWorker: '¿Quitar a este trabajador?',
    addWorker: 'Agregar trabajador', workerName: 'Nombre del trabajador', workerPin: 'PIN (4-6 números)',
    workerCreated: 'Trabajador agregado ✔ Dele el código del negocio + su PIN',
    yourCode: 'Código de su negocio', codeHint: 'Los trabajadores usan este código + su PIN para entrar',
    currency: 'Símbolo de moneda', logout: 'Salir',
    trialLeft: (d) => `Prueba gratis: ${d} día${d === 1 ? '' : 's'} restantes`,
    trialOver: 'Su prueba gratis terminó',
    subT: 'Suscríbase para seguir usando ScanStock',
    subMsg: 'Su prueba gratis de 14 días terminó. Suscríbase para conservar sus productos, almacenes y trabajadores.',
    subBtn: 'Suscribirse ahora', subAfter: 'Después del pago su cuenta se activa en 24 horas.',
    subContact: 'El sistema de pago se está terminando. Contáctenos para activar su cuenta.',
    active: 'Suscripción activa ✔', offline: 'Sin conexión — mostrando datos guardados',
    loading: 'Cargando…', errGeneric: 'Algo salió mal. Intente de nuevo.',
    pwShort: 'La contraseña debe tener al menos 8 caracteres', pinFormat: 'El PIN debe tener 4-6 números',
    uploadingPhoto: 'Subiendo foto…', readOnly: 'Solo el dueño puede cambiar productos',
    importCsv: 'Importar CSV', importT: 'Importar productos desde CSV',
    importHint: 'Columnas: barcode, name, warehouse, price, stock — una fila por producto y almacén. Los nombres de almacén deben coincidir exactamente. Reimportar el mismo código + almacén lo actualiza.',
    downloadTemplate: 'Descargar plantilla', chooseFile: 'Elegir archivo CSV',
    importPreviewCount: (n) => `${n} fila${n === 1 ? '' : 's'} lista${n === 1 ? '' : 's'} para importar`,
    importErrorsCount: (n) => `${n} fila${n === 1 ? '' : 's'} omitida${n === 1 ? '' : 's'}`,
    importConfirm: 'Importar', importDone: (n) => `${n} fila${n === 1 ? '' : 's'} importada${n === 1 ? '' : 's'} ✔`,
    whNotFound: (name) => `Almacén "${name}" no encontrado`,
    invalidPrice: 'Precio inválido', invalidStock: 'Stock inválido',
    missingBarcode: 'Falta el código de barras', missingName: 'Falta el nombre', missingWarehouse: 'Falta el almacén',
    noValidRows: 'No se encontraron filas en este archivo', csvColumnsMissing: 'El CSV debe tener las columnas: barcode, name, warehouse, price',
    row: 'Fila',
  },
  ar: {
    tagline: 'امسح الباركود. شاهد الصورة والسعر والمخزون — فورًا.',
    heroSub: 'صُمم للمتاجر والمستودعات حيث لا يحتاج العمال لقراءة الفواتير. مسحة واحدة تُظهر كل شيء.',
    startTrial: 'ابدأ تجربة مجانية 14 يومًا', ownerLogin: 'دخول المالك', workerLogin: 'دخول العامل',
    feat1t: 'امسح وشاهد', feat1d: 'وجّه الهاتف نحو أي باركود. تظهر صورة المنتج والسعر والمخزون.',
    feat2t: 'كل مستودع', feat2d: 'نفد المخزون؟ يُظهر التطبيق أي مستودع آخر لديه المنتج وسعره.',
    feat3t: 'بدون قراءة', feat3d: 'الصور والأرقام أولًا. يدخل العمال برمز ورقم سري فقط.',
    pricingT: 'سعر بسيط', pricingTrial: '14 يومًا مجانًا — بدون بطاقة',
    signupT: 'أنشئ عملك', loginT: 'دخول المالك',
    email: 'البريد الإلكتروني', password: 'كلمة المرور', bizName: 'اسم العمل', yourName: 'اسمك',
    createAccount: 'إنشاء حساب', logIn: 'دخول', forgotPw: 'نسيت كلمة المرور؟',
    haveAccount: 'لديك حساب؟ ادخل', noAccount: 'جديد هنا؟ أنشئ عملك',
    checkEmail: 'تحقق من بريدك واضغط رابط التأكيد، ثم ادخل.',
    workerT: 'دخول العامل', bizCode: 'رمز العمل', pin: 'الرقم السري',
    workerHint: 'اطلب من مديرك الرمز ورقمك السري',
    enter: 'دخول', wrongLogin: 'الرمز أو الرقم السري خاطئ',
    scanBtn: 'امسح الباركود', searchPh: 'ابحث عن منتج…', typeBarcode: 'اكتب رقم الباركود',
    products: 'المنتجات', noProducts: 'لا توجد منتجات بعد. افتح "إدارة" لإضافة أول منتج.',
    noProductsWorker: 'لا توجد منتجات بعد. اطلب من المالك إضافة منتجات.',
    navHome: 'الرئيسية', navManage: 'إدارة', scanHint: 'وجّه الكاميرا نحو الباركود',
    camError: 'الكاميرا غير متاحة. يمكنك كتابة رقم الباركود.',
    keypadPh: 'أدخل الرقم…', productInfo: 'المنتج', notFoundTitle: 'غير موجود',
    notFoundMsg: 'هذا الباركود غير موجود في النظام:', addThis: 'أضف هذا المنتج', scanAgain: 'امسح مرة أخرى',
    manage: 'إدارة', warehouses: 'المستودعات', workers: 'العمال', settings: 'الإعدادات',
    addProduct: 'إضافة منتج', editProduct: 'تعديل المنتج', takePhoto: 'التقط صورة',
    barcode: 'الباركود', prodName: 'اسم المنتج', priceStockPerWh: 'السعر والمخزون لكل مستودع',
    save: 'حفظ', delete: 'حذف المنتج', chooseWh: 'اختر المستودع', newWhPh: 'اسم المستودع الجديد…',
    inStock: 'متوفر', lowStock: 'قليل', outStock: 'نفد المخزون', noPrice: 'لا يباع هنا',
    otherWh: 'مستودعات أخرى', price: 'السعر', stock: 'المخزون',
    saved: 'تم الحفظ ✔', needName: 'أضف اسمًا', needBarcode: 'أضف باركود',
    dupBarcode: 'هذا الباركود موجود مسبقًا', confirmDelete: 'حذف هذا المنتج؟',
    confirmDeleteWh: 'حذف هذا المستودع؟', needOneWh: 'تحتاج إلى مستودع واحد على الأقل',
    confirmDeleteWorker: 'إزالة هذا العامل؟',
    addWorker: 'إضافة عامل', workerName: 'اسم العامل', workerPin: 'الرقم السري (4-6 أرقام)',
    workerCreated: 'تمت إضافة العامل ✔ أعطه رمز العمل + رقمه السري',
    yourCode: 'رمز عملك', codeHint: 'يستخدم العمال هذا الرمز + رقمهم السري للدخول',
    currency: 'رمز العملة', logout: 'خروج',
    trialLeft: (d) => `التجربة المجانية: ${d} يوم متبقٍ`,
    trialOver: 'انتهت تجربتك المجانية',
    subT: 'اشترك لمواصلة استخدام ScanStock',
    subMsg: 'انتهت تجربتك المجانية. اشترك للحفاظ على منتجاتك ومستودعاتك وعمالك.',
    subBtn: 'اشترك الآن', subAfter: 'بعد الدفع يتم تفعيل حسابك خلال 24 ساعة.',
    subContact: 'نظام الدفع قيد الإعداد. تواصل معنا لتفعيل حسابك.',
    active: 'الاشتراك فعال ✔', offline: 'لا يوجد اتصال — عرض آخر بيانات محفوظة',
    loading: 'جارٍ التحميل…', errGeneric: 'حدث خطأ. حاول مرة أخرى.',
    pwShort: 'كلمة المرور 8 أحرف على الأقل', pinFormat: 'الرقم السري 4-6 أرقام',
    uploadingPhoto: 'جارٍ رفع الصورة…', readOnly: 'المالك فقط يمكنه تغيير المنتجات',
    importCsv: 'استيراد CSV', importT: 'استيراد المنتجات من CSV',
    importHint: 'الأعمدة: barcode, name, warehouse, price, stock — صف لكل منتج ومستودع. يجب أن تطابق أسماء المستودعات تمامًا. إعادة استيراد نفس الباركود + المستودع يحدّثه.',
    downloadTemplate: 'تحميل نموذج', chooseFile: 'اختر ملف CSV',
    importPreviewCount: (n) => `${n} صف جاهز للاستيراد`,
    importErrorsCount: (n) => `${n} صف تم تخطيه`,
    importConfirm: 'استيراد', importDone: (n) => `تم استيراد ${n} صف ✔`,
    whNotFound: (name) => `المستودع "${name}" غير موجود`,
    invalidPrice: 'سعر غير صالح', invalidStock: 'مخزون غير صالح',
    missingBarcode: 'الباركود مفقود', missingName: 'الاسم مفقود', missingWarehouse: 'المستودع مفقود',
    noValidRows: 'لم يتم العثور على صفوف في هذا الملف', csvColumnsMissing: 'يجب أن يحتوي CSV على الأعمدة: barcode, name, warehouse, price',
    row: 'صف',
  },
};
const LANG_NAMES = { en: 'English', es: 'Español', ar: 'العربية' };
let lang = localStorage.getItem('ss_lang') || 'en';
function t(key, ...args) {
  const v = (I18N[lang] && I18N[lang][key]) ?? I18N.en[key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
}
function applyLang() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
  document.querySelectorAll('.price-text').forEach((el) => (el.textContent = PRICE_TEXT[lang] || PRICE_TEXT.en));
  document.querySelectorAll('.lang-row').forEach(renderLangRowIn);
}
function setLang(l) { lang = l; localStorage.setItem('ss_lang', l); applyLang(); renderAll(); }
function renderLangRowIn(row) {
  row.innerHTML = '';
  for (const code of Object.keys(I18N)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = LANG_NAMES[code];
    if (code === lang) b.classList.add('on');
    b.onclick = () => setLang(code);
    row.appendChild(b);
  }
}

// ---------------- State ----------------
const WH_COLORS = ['#00d4ff', '#ffc24b', '#ff7ac8', '#7cff6b', '#b28bff', '#ff9f5c'];
let session = null;
let member = null;      // { id, display_name, role, business_id }
let business = null;    // ss_businesses row
let warehouses = [];
let products = [];      // ss_products rows
let stock = {};         // `${product_id}|${warehouse_id}` -> {price, stock}
let members = [];
let currentWhId = localStorage.getItem('ss_current_wh') || null;
let currentProductId = null;
let editingProductId = null;
let formPhoto = null;        // data URL for preview / upload
let formPhotoChanged = false;
let lastUnknownBarcode = '';
let scanMode = 'lookup';
let scanReturnTo = 'home';
let offline = false;

const $ = (id) => document.getElementById(id);
const isOwner = () => member && member.role === 'owner';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => (business?.currency || '$') + Number(n).toFixed(2);
const stKey = (p, w) => `${p}|${w}`;
const getWh = (id) => warehouses.find((w) => w.id === id);
const stockClass = (s) => (s <= 0 ? 'stock-out' : s <= 5 ? 'stock-low' : 'stock-ok');
const stockLabel = (s) => (s <= 0 ? t('outStock') : s <= 5 ? `${t('lowStock')} · ${s}` : `${t('inStock')} · ${s}`);

function toast(msg, ms = 2400) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}
function busy(on) { $('busy').style.display = on ? 'flex' : 'none'; }

function showScreen(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $('screen-' + name).classList.add('active');
  if (name === 'home') renderHome();
  if (name === 'admin') renderAdmin();
  if (name === 'keypad') { keypadValue = ''; renderKeypadDisplay(); }
  if (name === 'subscribe') renderSubscribe();
  window.scrollTo(0, 0);
}

// ---------------- Data loading ----------------
function cacheSave() {
  try {
    localStorage.setItem('ss_cache', JSON.stringify({ member, business, warehouses, products, stock, members }));
  } catch (e) { /* cache is best-effort */ }
}
function cacheLoad() {
  try {
    const c = JSON.parse(localStorage.getItem('ss_cache'));
    if (!c) return false;
    ({ member, business, warehouses, products, stock, members } = { members: [], ...c });
    return !!(member && business);
  } catch (e) { return false; }
}

async function loadAll() {
  const uid = session.user.id;
  const { data: mem, error: memErr } = await sb.from('ss_members').select('*').eq('user_id', uid).maybeSingle();
  if (memErr) throw memErr;
  if (!mem) return false; // authenticated but no business yet
  member = mem;
  const [bizQ, whQ, prodQ, stockQ, memQ] = await Promise.all([
    sb.from('ss_businesses').select('*').eq('id', mem.business_id).single(),
    sb.from('ss_warehouses').select('*').eq('business_id', mem.business_id).order('created_at'),
    sb.from('ss_products').select('*').eq('business_id', mem.business_id).order('created_at', { ascending: false }),
    sb.from('ss_stock').select('*').eq('business_id', mem.business_id),
    sb.from('ss_members').select('id, display_name, role, created_at').eq('business_id', mem.business_id).order('created_at'),
  ]);
  for (const q of [bizQ, whQ, prodQ, stockQ, memQ]) if (q.error) throw q.error;
  business = bizQ.data;
  warehouses = whQ.data;
  products = prodQ.data;
  members = memQ.data;
  stock = {};
  for (const r of stockQ.data) stock[stKey(r.product_id, r.warehouse_id)] = { price: r.price == null ? null : Number(r.price), stock: r.stock };
  if (!warehouses.find((w) => w.id === currentWhId)) currentWhId = warehouses[0]?.id || null;
  offline = false;
  cacheSave();
  return true;
}

let realtimeChannel = null;
function subscribeRealtime() {
  if (realtimeChannel || !business) return;
  let timer = null;
  const refresh = () => { clearTimeout(timer); timer = setTimeout(async () => { try { await loadAll(); renderAll(); } catch (e) {} }, 400); };
  realtimeChannel = sb.channel('ss-live');
  for (const table of ['ss_products', 'ss_stock', 'ss_warehouses', 'ss_businesses']) {
    realtimeChannel.on('postgres_changes', { event: '*', schema: 'public', table, filter: table === 'ss_businesses' ? `id=eq.${business.id}` : `business_id=eq.${business.id}` }, refresh);
  }
  realtimeChannel.subscribe();
}

// ---------------- Subscription / trial ----------------
function trialDaysLeft() {
  if (!business) return 0;
  return Math.max(0, Math.ceil((new Date(business.trial_ends_at) - Date.now()) / 86400000));
}
function subscriptionOk() {
  return business && (business.subscription_status === 'active' || (business.subscription_status === 'trial' && trialDaysLeft() > 0));
}
function renderTrialBanner() {
  const el = $('trial-banner');
  if (!business || business.subscription_status === 'active') { el.style.display = 'none'; return; }
  const d = trialDaysLeft();
  if (d > 0) {
    el.style.display = 'block';
    el.className = 'trial-banner ' + (d <= 3 ? 'warn' : '');
    el.textContent = t('trialLeft', d);
  } else {
    el.style.display = 'block';
    el.className = 'trial-banner over';
    el.textContent = t('trialOver');
  }
}
function enforceSubscription() {
  if (business && !subscriptionOk() && isOwner()) { showScreen('subscribe'); return true; }
  return false;
}

// ---------------- Routing ----------------
async function route() {
  const { data } = await sb.auth.getSession();
  session = data.session;
  if (!session) { showScreen('landing'); return; }
  busy(true);
  try {
    const has = await loadAll();
    busy(false);
    if (!has) {
      // Owner signed up but business not created yet (e.g. closed the tab mid-signup)
      showScreen('createbiz');
      return;
    }
    subscribeRealtime();
    if (enforceSubscription()) return;
    showScreen('home');
  } catch (e) {
    busy(false);
    if (cacheLoad()) {
      offline = true;
      toast(t('offline'), 4000);
      showScreen('home');
    } else {
      console.error(e);
      toast(t('errGeneric'));
      showScreen('landing');
    }
  }
}

// ---------------- Auth ----------------
async function ownerSignup() {
  const email = $('su-email').value.trim();
  const pw = $('su-password').value;
  const bizName = $('su-bizname').value.trim();
  const myName = $('su-myname').value.trim();
  if (!email || !bizName) { toast(t('errGeneric')); return; }
  if (pw.length < 8) { toast(t('pwShort')); return; }
  busy(true);
  // Signup runs through an edge function that creates the account pre-confirmed
  // plus the business + first warehouse atomically — no email confirmation step.
  const { error } = await callFn('ss-signup', { email, password: pw, business_name: bizName, display_name: myName });
  if (error) { busy(false); toast(error, 4000); return; }
  const { error: liErr } = await sb.auth.signInWithPassword({ email, password: pw });
  busy(false);
  if (liErr) { toast(liErr.message); return; }
  await route();
}

async function createBusinessFlow(bizName, myName) {
  busy(true);
  const { error } = await sb.rpc('ss_create_business', { p_name: bizName, p_display_name: myName || 'Owner' });
  busy(false);
  if (error && !/already a member/.test(error.message)) { toast(error.message); showScreen('createbiz'); return; }
  localStorage.removeItem('ss_pending_biz');
  await route();
}

async function ownerLogin() {
  const email = $('li-email').value.trim();
  const pw = $('li-password').value;
  busy(true);
  const { error } = await sb.auth.signInWithPassword({ email, password: pw });
  busy(false);
  if (error) { toast(error.message); return; }
  await afterLogin();
}

async function afterLogin() {
  const { data } = await sb.auth.getSession();
  session = data.session;
  // finish business creation if signup was interrupted
  const pending = localStorage.getItem('ss_pending_biz');
  const { data: mem } = await sb.from('ss_members').select('id').eq('user_id', session.user.id).maybeSingle();
  if (!mem && pending) {
    const { bizName, myName } = JSON.parse(pending);
    await createBusinessFlow(bizName, myName);
    return;
  }
  await route();
}

async function forgotPassword() {
  const email = $('li-email').value.trim() || prompt(t('email'));
  if (!email) return;
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  toast(error ? error.message : t('checkEmail'), 4000);
}

async function workerLogin() {
  const code = $('wl-code').value.trim().toUpperCase();
  const pin = $('wl-pin').value.trim();
  if (code.length !== 6 || !/^\d{4,6}$/.test(pin)) { toast(t('wrongLogin')); return; }
  busy(true);
  const email = `w-${code.toLowerCase()}-${pin}@workers.scanstock.app`;
  const password = `SS-${code}-${pin}`;
  const { error } = await sb.auth.signInWithPassword({ email, password });
  busy(false);
  if (error) { toast(t('wrongLogin')); return; }
  await route();
}

async function logout() {
  if (realtimeChannel) { sb.removeChannel(realtimeChannel); realtimeChannel = null; }
  await sb.auth.signOut();
  member = business = null; products = []; warehouses = []; stock = {}; members = [];
  localStorage.removeItem('ss_cache');
  showScreen('landing');
}

// Handle "create business" screen (interrupted signup)
async function createBizSubmit() {
  const bizName = $('cb-bizname').value.trim();
  const myName = $('cb-myname').value.trim();
  if (!bizName) { toast(t('errGeneric')); return; }
  await createBusinessFlow(bizName, myName);
}

// ---------------- Home ----------------
function renderHome() {
  const w = getWh(currentWhId);
  $('home-wh-name').textContent = w ? w.name : '—';
  $('home-wh-dot').style.background = w ? w.color : '#666';
  $('nav-admin').style.display = isOwner() ? 'flex' : 'none';
  renderTrialBanner();
  renderHomeList();
}
function renderHomeList() {
  const q = $('search-input').value.trim().toLowerCase();
  const grid = $('home-grid');
  const list = products.filter((p) => !q || p.name.toLowerCase().includes(q) || p.barcode.includes(q));
  grid.innerHTML = '';
  const empty = $('home-empty');
  empty.style.display = products.length ? 'none' : 'block';
  empty.querySelector('span[data-i18n]').textContent = isOwner() ? t('noProducts') : t('noProductsWorker');
  for (const p of list) {
    const e = stock[stKey(p.id, currentWhId)];
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'prod-card';
    card.onclick = () => showProduct(p.id);
    const priceHtml = e && e.price != null
      ? `<div class="price">${money(e.price)}</div><span class="stock-chip ${stockClass(e.stock)}">${stockLabel(e.stock)}</span>`
      : `<div class="price none">${t('noPrice')}</div>`;
    card.innerHTML = `
      <div class="thumb-wrap">${p.photo_url ? `<img class="thumb" loading="lazy" src="${esc(p.photo_url)}" alt="">` : '<div class="thumb ph">📦</div>'}</div>
      <div class="info"><div class="name">${esc(p.name)}</div>${priceHtml}</div>`;
    grid.appendChild(card);
  }
}

// ---------------- Warehouse picker ----------------
function openWhPicker() {
  const list = $('wh-picker-list');
  list.innerHTML = '';
  for (const w of warehouses) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'wh-row';
    b.innerHTML = `<span class="dot" style="background:${w.color}"></span>
      <span class="grow wname">${esc(w.name)}</span>
      ${w.id === currentWhId ? '<span style="color:var(--green); font-size:20px">✔</span>' : ''}`;
    b.onclick = () => {
      currentWhId = w.id;
      localStorage.setItem('ss_current_wh', w.id);
      $('wh-picker').classList.remove('open');
      renderHome();
    };
    list.appendChild(b);
  }
  $('wh-picker').classList.add('open');
}

// ---------------- Product lookup / detail ----------------
function lookupBarcode(code) {
  code = String(code).trim();
  const p = products.find((p) => p.barcode === code);
  if (p) showProduct(p.id);
  else {
    lastUnknownBarcode = code;
    $('notfound-code').textContent = code;
    $('notfound-add').style.display = isOwner() ? 'block' : 'none';
    showScreen('notfound');
  }
}

function showProduct(id) {
  const p = products.find((p) => p.id === id);
  if (!p) return;
  currentProductId = id;
  $('detail-edit').style.display = isOwner() ? 'flex' : 'none';
  const body = $('detail-body');
  const cur = getWh(currentWhId);
  const e = stock[stKey(p.id, currentWhId)];
  let mainBox;
  if (e && e.price != null) {
    mainBox = `
      <div class="price-box" style="border-color:${e.stock > 0 ? 'var(--green)' : 'var(--red)'}">
        <span class="dot" style="background:${cur.color}"></span>
        <div class="grow">
          <div class="wh-name">${esc(cur.name)}</div>
          <div class="amount ${e.stock > 0 ? '' : 'out'}">${money(e.price)}</div>
          <span class="stock-chip ${stockClass(e.stock)}">${stockLabel(e.stock)}</span>
        </div>
      </div>`;
  } else {
    mainBox = `
      <div class="price-box" style="border-color:var(--border)">
        <span class="dot" style="background:${cur ? cur.color : '#666'}"></span>
        <div class="grow">
          <div class="wh-name">${esc(cur ? cur.name : '—')}</div>
          <div class="amount out">${t('noPrice')}</div>
        </div>
      </div>`;
  }
  const otherRows = warehouses.filter((w) => w.id !== currentWhId).map((w) => {
    const we = stock[stKey(p.id, w.id)];
    const priceHtml = we && we.price != null
      ? `<div class="wprice">${money(we.price)}</div><span class="stock-chip ${stockClass(we.stock)}">${stockLabel(we.stock)}</span>`
      : `<div class="wprice none">${t('noPrice')}</div>`;
    return `
      <button type="button" class="wh-row" data-wh="${w.id}">
        <span class="dot" style="background:${w.color}"></span>
        <div class="grow"><div class="wname">${esc(w.name)}</div></div>
        <div style="text-align:end">${priceHtml}</div>
      </button>`;
  }).join('');
  body.innerHTML = `
    ${p.photo_url ? `<img class="detail-photo" src="${esc(p.photo_url)}" alt="">` : '<div class="detail-photo ph">📦</div>'}
    <div class="detail-info">
      <div>
        <div class="detail-name">${esc(p.name)}</div>
        <div class="detail-barcode">▮▮▮ ${esc(p.barcode)}</div>
      </div>
      ${mainBox}
      ${otherRows ? `<div class="section-label">${t('otherWh')}</div><div class="other-wh-list">${otherRows}</div>` : ''}
    </div>`;
  body.querySelectorAll('[data-wh]').forEach((b) => (b.onclick = () => {
    currentWhId = b.dataset.wh;
    localStorage.setItem('ss_current_wh', currentWhId);
    showProduct(currentProductId);
  }));
  showScreen('detail');
}

// ---------------- Keypad ----------------
let keypadValue = '';
function buildKeypad() {
  const pad = $('keypad');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'GO'];
  pad.innerHTML = '';
  for (const k of keys) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = k === 'GO' ? '✔' : k;
    if (k === 'GO') b.className = 'go';
    if (k === '⌫') b.className = 'del';
    b.onclick = () => {
      if (k === 'GO') { if (keypadValue) lookupBarcode(keypadValue); return; }
      if (k === '⌫') keypadValue = keypadValue.slice(0, -1);
      else if (keypadValue.length < 20) keypadValue += k;
      renderKeypadDisplay();
    };
    pad.appendChild(b);
  }
}
function renderKeypadDisplay() {
  $('keypad-display').innerHTML = keypadValue ? esc(keypadValue) : `<span class="ph">${t('keypadPh')}</span>`;
}

// ---------------- Scanner ----------------
let scanStream = null;
let scanActive = false;
let zxingReader = null;
let nativeDetector = null;

async function startScan(mode) {
  scanMode = mode;
  scanReturnTo = mode === 'form' ? 'form' : 'home';
  $('scan-err').style.display = 'none';
  showScreen('scan');
  const video = $('scan-video');
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    video.srcObject = scanStream;
    await video.play();
    scanActive = true;
    if ('BarcodeDetector' in window) {
      try {
        nativeDetector = nativeDetector || new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'],
        });
        nativeLoop(video);
        return;
      } catch (e) { /* fall back to ZXing */ }
    }
    zxingLoop(video);
  } catch (err) {
    $('scan-err').style.display = 'flex';
  }
}
async function nativeLoop(video) {
  while (scanActive) {
    try {
      const codes = await nativeDetector.detect(video);
      if (codes.length && codes[0].rawValue) { onScanResult(codes[0].rawValue); return; }
    } catch (e) { /* frame not ready */ }
    await new Promise((r) => setTimeout(r, 180));
  }
}
function zxingLoop(video) {
  zxingReader = zxingReader || new BrowserMultiFormatReader();
  zxingReader.decodeFromVideoElementContinuously(video, (result) => {
    if (result && scanActive) onScanResult(result.getText());
  }).catch(() => { $('scan-err').style.display = 'flex'; });
}
function onScanResult(code) {
  if (!scanActive) return;
  stopScan();
  if (navigator.vibrate) navigator.vibrate(80);
  if (scanMode === 'form') { $('form-barcode').value = code; showScreen('form'); }
  else lookupBarcode(code);
}
function stopScan() {
  scanActive = false;
  if (zxingReader) { try { zxingReader.stopContinuousDecode(); } catch (e) {} }
  if (scanStream) { scanStream.getTracks().forEach((tr) => tr.stop()); scanStream = null; }
  $('scan-video').srcObject = null;
}

// ---------------- Admin ----------------
function renderAdmin() {
  if (!isOwner()) { showScreen('home'); return; }
  $('admin-code').textContent = business ? business.join_code : '—';
  $('admin-count').textContent = products.length;
  const subEl = $('admin-substatus');
  if (business.subscription_status === 'active') { subEl.textContent = t('active'); subEl.className = 'sub-status ok'; }
  else if (trialDaysLeft() > 0) { subEl.textContent = t('trialLeft', trialDaysLeft()); subEl.className = 'sub-status'; }
  else { subEl.textContent = t('trialOver'); subEl.className = 'sub-status over'; }
  const list = $('admin-list');
  list.innerHTML = '';
  for (const p of products) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'admin-row';
    b.onclick = () => editProduct(p.id);
    const whCount = warehouses.filter((w) => stock[stKey(p.id, w.id)]?.price != null).length;
    b.innerHTML = `
      ${p.photo_url ? `<img loading="lazy" src="${esc(p.photo_url)}" alt="">` : '<div class="mini-ph">📦</div>'}
      <div class="grow">
        <div class="name">${esc(p.name)}</div>
        <div class="sub">▮▮ ${esc(p.barcode)} · ${whCount} 🏭</div>
      </div>
      <span class="chev">›</span>`;
    list.appendChild(b);
  }
}

// Warehouses sheet
function openWhManager() {
  const list = $('wh-manager-list');
  list.innerHTML = '';
  for (const w of warehouses) {
    const row = document.createElement('div');
    row.className = 'wh-row';
    row.innerHTML = `<span class="dot" style="background:${w.color}"></span>`;
    const input = document.createElement('input');
    input.value = w.name;
    input.className = 'inline-edit';
    input.onchange = async () => {
      const name = input.value.trim();
      if (!name) return;
      const { error } = await sb.from('ss_warehouses').update({ name }).eq('id', w.id);
      if (error) toast(error.message); else { w.name = name; renderHome(); }
    };
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '🗑';
    del.className = 'icon-only';
    del.onclick = () => deleteWarehouse(w.id);
    row.appendChild(input);
    row.appendChild(del);
    list.appendChild(row);
  }
  $('wh-manager').classList.add('open');
}
async function addWarehouse() {
  const input = $('new-wh-name');
  const name = input.value.trim();
  if (!name) return;
  const color = WH_COLORS[warehouses.length % WH_COLORS.length];
  const { data, error } = await sb.from('ss_warehouses').insert({ business_id: business.id, name, color }).select().single();
  if (error) { toast(error.message); return; }
  warehouses.push(data);
  input.value = '';
  cacheSave();
  openWhManager();
}
async function deleteWarehouse(id) {
  if (warehouses.length <= 1) { toast(t('needOneWh')); return; }
  if (!confirm(t('confirmDeleteWh'))) return;
  const { error } = await sb.from('ss_warehouses').delete().eq('id', id);
  if (error) { toast(error.message); return; }
  warehouses = warehouses.filter((w) => w.id !== id);
  for (const k of Object.keys(stock)) if (k.endsWith('|' + id)) delete stock[k];
  if (currentWhId === id) currentWhId = warehouses[0].id;
  cacheSave();
  openWhManager();
  renderHome();
}

// Workers sheet
function openWorkers() {
  const list = $('workers-list');
  list.innerHTML = '';
  for (const m of members) {
    const row = document.createElement('div');
    row.className = 'wh-row';
    row.innerHTML = `<span style="font-size:20px">${m.role === 'owner' ? '👑' : '👤'}</span>
      <span class="grow wname">${esc(m.display_name)}</span>`;
    if (m.role !== 'owner') {
      const del = document.createElement('button');
      del.type = 'button';
      del.textContent = '🗑';
      del.className = 'icon-only';
      del.onclick = async () => {
        if (!confirm(t('confirmDeleteWorker'))) return;
        busy(true);
        const { error } = await callWorkersFn({ action: 'delete', member_id: m.id });
        busy(false);
        if (error) { toast(error); return; }
        members = members.filter((x) => x.id !== m.id);
        cacheSave();
        openWorkers();
      };
      row.appendChild(del);
    }
    list.appendChild(row);
  }
  $('workers-sheet').classList.add('open');
}
async function addWorker() {
  const name = $('new-worker-name').value.trim();
  const pin = $('new-worker-pin').value.trim();
  if (!name) { toast(t('needName')); return; }
  if (!/^\d{4,6}$/.test(pin)) { toast(t('pinFormat')); return; }
  busy(true);
  const { error } = await callWorkersFn({ action: 'create', name, pin });
  busy(false);
  if (error) { toast(error); return; }
  $('new-worker-name').value = '';
  $('new-worker-pin').value = '';
  toast(t('workerCreated'), 4000);
  try { await loadAll(); } catch (e) {}
  openWorkers();
}
async function callWorkersFn(body) { return callFn('ss-workers', body); }
async function callFn(name, body) {
  try {
    const { data, error } = await sb.functions.invoke(name, { body });
    if (error) {
      let msg = error.message;
      try { const ctx = await error.context?.json?.(); if (ctx?.error) msg = ctx.error; } catch (e) {}
      return { error: msg };
    }
    return { data };
  } catch (e) {
    return { error: t('errGeneric') };
  }
}

// Settings sheet
function openSettings() {
  $('set-currency').value = business.currency || '$';
  $('settings-sheet').classList.add('open');
}
async function saveCurrency() {
  const c = $('set-currency').value.trim() || '$';
  const { error } = await sb.from('ss_businesses').update({ currency: c }).eq('id', business.id);
  if (error) { toast(error.message); return; }
  business.currency = c;
  cacheSave();
  toast(t('saved'));
  $('settings-sheet').classList.remove('open');
  renderAll();
}

// ---------------- Product form ----------------
function newProduct() {
  editingProductId = null;
  formPhoto = null;
  formPhotoChanged = false;
  openForm({ barcode: '', name: '', photo_url: null });
  $('form-title').textContent = t('addProduct');
  $('form-delete').style.display = 'none';
}
function addProductWithBarcode() {
  newProduct();
  $('form-barcode').value = lastUnknownBarcode;
}
function editProduct(id) {
  const p = products.find((p) => p.id === id);
  if (!p) return;
  editingProductId = id;
  formPhoto = p.photo_url;
  formPhotoChanged = false;
  openForm(p);
  $('form-title').textContent = t('editProduct');
  $('form-delete').style.display = 'block';
}
function openForm(p) {
  if (enforceSubscription()) return;
  $('form-barcode').value = p.barcode || '';
  $('form-name').value = p.name || '';
  const img = $('photo-preview');
  if (formPhoto) { img.src = formPhoto; img.style.display = 'block'; }
  else { img.style.display = 'none'; img.removeAttribute('src'); }
  const list = $('form-wh-list');
  list.innerHTML = '';
  for (const w of warehouses) {
    const e = p.id ? stock[stKey(p.id, w.id)] || {} : {};
    const row = document.createElement('div');
    row.className = 'wh-price-row';
    row.dataset.whId = w.id;
    row.innerHTML = `
      <span class="dot" style="background:${w.color}"></span>
      <span class="wname">${esc(w.name)}</span>
      <div><span class="mini-label">${t('price')}</span>
        <input class="price-in" inputmode="decimal" placeholder="—" value="${e.price != null ? e.price : ''}"></div>
      <div><span class="mini-label">${t('stock')}</span>
        <input class="stock-in" inputmode="numeric" placeholder="0" value="${e.stock != null ? e.stock : ''}"></div>`;
    list.appendChild(row);
  }
  showScreen('form');
}
function onPhotoPicked(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const MAX = 800;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      formPhoto = c.toDataURL('image/jpeg', 0.8);
      formPhotoChanged = true;
      const prev = $('photo-preview');
      prev.src = formPhoto;
      prev.style.display = 'block';
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
  ev.target.value = '';
}
async function uploadPhoto(productId) {
  const blob = await (await fetch(formPhoto)).blob();
  const path = `${business.id}/${productId}.jpg`;
  const { error } = await sb.storage.from('product-photos').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw error;
  const { data } = sb.storage.from('product-photos').getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`; // cache-bust on re-upload
}
async function saveProduct() {
  const barcode = $('form-barcode').value.trim();
  const name = $('form-name').value.trim();
  if (!barcode) { toast(t('needBarcode')); return; }
  if (!name) { toast(t('needName')); return; }
  const dup = products.find((p) => p.barcode === barcode && p.id !== editingProductId);
  if (dup) { toast(t('dupBarcode')); return; }
  busy(true);
  try {
    const id = editingProductId || crypto.randomUUID();
    let photo_url = editingProductId ? (products.find((p) => p.id === id)?.photo_url ?? null) : null;
    if (formPhotoChanged && formPhoto) {
      toast(t('uploadingPhoto'));
      photo_url = await uploadPhoto(id);
    }
    if (editingProductId) {
      const { error } = await sb.from('ss_products').update({ barcode, name, photo_url }).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await sb.from('ss_products').insert({ id, business_id: business.id, barcode, name, photo_url });
      if (error) throw error;
    }
    // per-warehouse price/stock
    const upserts = [];
    const deletes = [];
    document.querySelectorAll('#form-wh-list .wh-price-row').forEach((row) => {
      const priceRaw = row.querySelector('.price-in').value.trim().replace(',', '.');
      const stockRaw = row.querySelector('.stock-in').value.trim();
      const whId = row.dataset.whId;
      if (priceRaw !== '' && !isNaN(parseFloat(priceRaw))) {
        upserts.push({ product_id: id, warehouse_id: whId, business_id: business.id, price: parseFloat(priceRaw), stock: Math.max(0, parseInt(stockRaw, 10) || 0) });
      } else {
        deletes.push(whId);
      }
    });
    if (upserts.length) {
      const { error } = await sb.from('ss_stock').upsert(upserts);
      if (error) throw error;
    }
    if (deletes.length && editingProductId) {
      await sb.from('ss_stock').delete().eq('product_id', id).in('warehouse_id', deletes);
    }
    await loadAll();
    busy(false);
    toast(t('saved'));
    showScreen('admin');
  } catch (e) {
    busy(false);
    toast(e.message || t('errGeneric'));
  }
}
async function deleteProduct() {
  if (!editingProductId || !confirm(t('confirmDelete'))) return;
  busy(true);
  const { error } = await sb.from('ss_products').delete().eq('id', editingProductId);
  busy(false);
  if (error) { toast(error.message); return; }
  products = products.filter((p) => p.id !== editingProductId);
  cacheSave();
  showScreen('admin');
}

// ---------------- CSV import ----------------
let importValidRows = [];
function openImportSheet() {
  if (enforceSubscription()) return;
  importValidRows = [];
  $('import-file').value = '';
  $('import-summary').innerHTML = '';
  $('import-confirm').style.display = 'none';
  $('import-sheet').classList.add('open');
}
function csvEscape(s) {
  s = String(s ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function downloadCsvTemplate() {
  const whName = warehouses[0]?.name || 'Main Warehouse';
  const rows = [
    ['barcode', 'name', 'warehouse', 'price', 'stock'],
    ['5012345678900', 'Rice 5kg', whName, '12.99', '40'],
  ];
  const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'scanstock-products-template.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
// Minimal RFC4180-ish parser: handles quoted fields, escaped quotes, CRLF/LF.
function parseCsvText(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}
function onImportFilePicked(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try { previewImport(String(reader.result)); }
    catch (e) { $('import-summary').innerHTML = `<div>${esc(e.message)}</div>`; $('import-confirm').style.display = 'none'; }
  };
  reader.readAsText(file);
}
function previewImport(text) {
  const rows = parseCsvText(text).filter((r) => r.some((c) => c.trim() !== ''));
  if (!rows.length) throw new Error(t('noValidRows'));
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = {
    barcode: header.indexOf('barcode'), name: header.indexOf('name'),
    warehouse: header.indexOf('warehouse'), price: header.indexOf('price'), stock: header.indexOf('stock'),
  };
  if (idx.barcode < 0 || idx.name < 0 || idx.warehouse < 0 || idx.price < 0) throw new Error(t('csvColumnsMissing'));
  const whByName = new Map(warehouses.map((w) => [w.name.trim().toLowerCase(), w]));
  const valid = [];
  const errors = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const lineNo = i + 1;
    const barcode = (r[idx.barcode] || '').trim();
    const name = (r[idx.name] || '').trim();
    const whName = (r[idx.warehouse] || '').trim();
    const priceRaw = (r[idx.price] || '').trim().replace(',', '.');
    const stockRaw = idx.stock >= 0 ? (r[idx.stock] || '').trim() : '';
    if (!barcode) { errors.push(`${t('row')} ${lineNo}: ${t('missingBarcode')}`); continue; }
    if (!name) { errors.push(`${t('row')} ${lineNo}: ${t('missingName')}`); continue; }
    if (!whName) { errors.push(`${t('row')} ${lineNo}: ${t('missingWarehouse')}`); continue; }
    const wh = whByName.get(whName.toLowerCase());
    if (!wh) { errors.push(`${t('row')} ${lineNo}: ${t('whNotFound', whName)}`); continue; }
    const price = parseFloat(priceRaw);
    if (priceRaw === '' || isNaN(price) || price < 0) { errors.push(`${t('row')} ${lineNo}: ${t('invalidPrice')}`); continue; }
    const stock = stockRaw === '' ? 0 : parseInt(stockRaw, 10);
    if (isNaN(stock) || stock < 0) { errors.push(`${t('row')} ${lineNo}: ${t('invalidStock')}`); continue; }
    valid.push({ barcode, name, warehouseId: wh.id, price, stock });
  }
  importValidRows = valid;
  const parts = [`<div>${t('importPreviewCount', valid.length)}</div>`];
  if (errors.length) {
    parts.push(`<div style="color:var(--amber)">${t('importErrorsCount', errors.length)}</div>`);
    parts.push(`<div style="max-height:140px;overflow:auto;opacity:.85">${errors.slice(0, 50).map((e) => `<div>${esc(e)}</div>`).join('')}</div>`);
  }
  $('import-summary').innerHTML = parts.join('');
  $('import-confirm').style.display = valid.length ? 'block' : 'none';
}
function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
async function runImport() {
  if (!importValidRows.length) return;
  busy(true);
  try {
    const nameByBarcode = new Map();
    for (const r of importValidRows) if (!nameByBarcode.has(r.barcode)) nameByBarcode.set(r.barcode, r.name);
    const productUpserts = [...nameByBarcode.entries()].map(([barcode, name]) => ({ business_id: business.id, barcode, name }));
    let allProducts = [];
    for (const c of chunk(productUpserts, 300)) {
      const { data, error } = await sb.from('ss_products').upsert(c, { onConflict: 'business_id,barcode' }).select('id,barcode');
      if (error) throw error;
      allProducts = allProducts.concat(data);
    }
    const idByBarcode = new Map(allProducts.map((p) => [p.barcode, p.id]));
    const stockUpserts = importValidRows.map((r) => ({
      product_id: idByBarcode.get(r.barcode), warehouse_id: r.warehouseId, business_id: business.id, price: r.price, stock: r.stock,
    }));
    for (const c of chunk(stockUpserts, 300)) {
      const { error } = await sb.from('ss_stock').upsert(c, { onConflict: 'product_id,warehouse_id' });
      if (error) throw error;
    }
    await loadAll();
    busy(false);
    toast(t('importDone', stockUpserts.length));
    $('import-sheet').classList.remove('open');
    showScreen('admin');
  } catch (e) {
    busy(false);
    toast(e.message || t('errGeneric'));
  }
}

// ---------------- Subscribe screen ----------------
function renderSubscribe() {
  $('sub-price').textContent = PRICE_TEXT[lang] || PRICE_TEXT.en;
  const btn = $('sub-btn');
  const note = $('sub-note');
  if (PAYMENT_LINK) {
    btn.style.display = 'block';
    btn.onclick = () => { location.href = PAYMENT_LINK + '?client_reference_id=' + business.id; };
    note.textContent = t('subAfter');
  } else {
    btn.style.display = 'none';
    note.textContent = t('subContact');
  }
}

// ---------------- Render all ----------------
function renderAll() {
  applyLangStatics();
  if ($('screen-home').classList.contains('active')) renderHome();
  if ($('screen-admin').classList.contains('active')) renderAdmin();
  if ($('screen-subscribe').classList.contains('active')) renderSubscribe();
}
function applyLangStatics() { applyLang(); }

// ---------------- Wire up ----------------
function on(id, fn) { const el = $(id); if (el) el.onclick = fn; }
document.addEventListener('DOMContentLoaded', async () => {
  buildKeypad();
  applyLang();

  // landing
  on('cta-signup', () => { $('su-done').style.display = 'none'; showScreen('auth'); switchAuthTab('signup'); });
  on('cta-login', () => { showScreen('auth'); switchAuthTab('login'); });
  on('cta-worker', () => showScreen('worker'));
  on('nav-brand', () => showScreen('landing'));

  // auth
  on('auth-back', () => showScreen('landing'));
  on('tab-signup', () => switchAuthTab('signup'));
  on('tab-login', () => switchAuthTab('login'));
  on('su-submit', ownerSignup);
  on('li-submit', ownerLogin);
  on('li-forgot', forgotPassword);
  on('worker-back', () => showScreen('landing'));
  on('wl-submit', workerLogin);
  on('cb-submit', createBizSubmit);

  // app
  on('scan-btn', () => startScan('lookup'));
  on('open-keypad', () => showScreen('keypad'));
  on('keypad-back', () => showScreen('home'));
  on('detail-back', () => showScreen('home'));
  on('detail-edit', () => editProduct(currentProductId));
  on('notfound-back', () => showScreen('home'));
  on('notfound-add', addProductWithBarcode);
  on('notfound-rescan', () => startScan('lookup'));
  on('scan-close', () => { stopScan(); showScreen(scanReturnTo); });
  on('scan-manual', () => { stopScan(); showScreen('keypad'); });
  on('scan-manual2', () => { stopScan(); showScreen('keypad'); });
  on('home-wh-pill', openWhPicker);
  on('nav-home', () => showScreen('home'));
  on('nav-admin', () => showScreen('admin'));
  on('nav-home2', () => showScreen('home'));
  on('admin-add', newProduct);
  on('admin-wh', openWhManager);
  on('admin-workers', openWorkers);
  on('admin-import', openImportSheet);
  on('admin-settings', openSettings);
  on('admin-logout', logout);
  on('add-wh-btn', addWarehouse);
  on('add-worker-btn', addWorker);
  on('save-currency', saveCurrency);
  on('form-back', () => showScreen('admin'));
  on('photo-pick', () => $('photo-input').click());
  on('form-scan', () => startScan('form'));
  on('form-save', saveProduct);
  on('form-delete', deleteProduct);
  on('sub-logout', logout);
  on('import-template-btn', downloadCsvTemplate);
  on('import-pick-btn', () => $('import-file').click());
  on('import-confirm', runImport);
  $('import-file').addEventListener('change', onImportFilePicked);
  $('photo-input').addEventListener('change', onPhotoPicked);
  $('search-input').addEventListener('input', renderHomeList);
  document.querySelectorAll('.sheet-backdrop').forEach((el) => {
    el.addEventListener('click', (ev) => { if (ev.target === el) el.classList.remove('open'); });
  });

  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') { showScreen('landing'); }
  });

  await route();
});

function switchAuthTab(which) {
  $('tab-signup').classList.toggle('on', which === 'signup');
  $('tab-login').classList.toggle('on', which === 'login');
  $('pane-signup').style.display = which === 'signup' ? 'flex' : 'none';
  $('pane-login').style.display = which === 'login' ? 'flex' : 'none';
}
