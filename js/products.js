/* ===========================================================
   PIBO — product catalogue (reads/writes through js/store.js)
=========================================================== */

/* رنگ خمیر — shared between admin panel and the customer-facing menu */
const PIBO_DOUGH_COLORS = {
  red:   { label: "قرمز", color: "#E5483C" },
  green: { label: "سبز",  color: "#2F9E5B" },
  plain: { label: "ساده", color: "#F1DFB2" }
};
function pibo_doughMeta(key){
  return PIBO_DOUGH_COLORS[key] || PIBO_DOUGH_COLORS.plain;
}

/* returns this product's usable sizes (hasSizes + at least diameter & price),
   in stored order — includes disabled ones; callers filter `.enabled` as needed */
function pibo_productSizes(product){
  if(!product || !product.hasSizes || !Array.isArray(product.sizes)) return [];
  return product.sizes
    .map((s, i) => ({ ...s, index: i }))
    .filter(s => Number.isFinite(s.diameter) && Number.isFinite(s.price) && s.diameter > 0);
}

/* the price to show on a card before a size is picked: the cheapest
   *enabled* size, or the legacy flat price when this item has no sizes */
function pibo_productDisplayPrice(product){
  const sizes = pibo_productSizes(product).filter(s => s.enabled !== false);
  if(sizes.length) return Math.min(...sizes.map(s => s.price));
  return product.price || 0;
}

async function pibo_getProducts(){
  const store = await pibo_loadStore();
  const list = Object.keys(store.products).map(id => ({ id, ...store.products[id] }));
  // sort by the admin-defined "order" field (lower = shown first).
  // items without one (e.g. imported/legacy data) fall back to the
  // order they appear in the file, kept stable via the index below.
  return list
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const oa = Number.isFinite(a.p.order) ? a.p.order : a.i;
      const ob = Number.isFinite(b.p.order) ? b.p.order : b.i;
      return oa - ob;
    })
    .map(x => x.p);
}

async function pibo_getProduct(id){
  const store = await pibo_loadStore();
  const p = store.products[id];
  return p ? { id, ...p } : null;
}

/* create or update a pizza. pass an id to update, omit to create */
async function pibo_saveProduct(product, existingId){
  const store = await pibo_loadStore();
  const id = existingId || pibo_slugify(product.name) + "-" + Date.now().toString(36);
  const data = { ...product };
  delete data.id;

  // keep the existing order when editing; new items (or items whose
  // category just changed) go to the end of their category's list.
  const previous = existingId ? store.products[existingId] : null;
  if(!Number.isFinite(data.order) || (previous && previous.category !== data.category)){
    data.order = pibo_nextOrderInCategory(store, data.category, existingId);
  }

  store.products[id] = data;
  pibo_saveDraft();
  return id;
}

async function pibo_deleteProduct(id){
  const store = await pibo_loadStore();
  delete store.products[id];
  pibo_saveDraft();
}

function pibo_nextOrderInCategory(store, category, excludeId){
  const orders = Object.keys(store.products)
    .filter(id => id !== excludeId && (store.products[id].category || "پیتزا") === (category || "پیتزا"))
    .map(id => store.products[id].order)
    .filter(n => Number.isFinite(n));
  return orders.length ? Math.max(...orders) + 1 : 0;
}

/* swap this product's order with the sibling above/below it within the
   same category. direction: -1 = move up, 1 = move down. */
async function pibo_moveProduct(id, direction){
  const store = await pibo_loadStore();
  const target = store.products[id];
  if(!target) return;
  const category = target.category || "پیتزا";

  const siblings = Object.keys(store.products)
    .filter(pid => (store.products[pid].category || "پیتزا") === category)
    .map((pid, i) => {
      const p = store.products[pid];
      return { pid, order: Number.isFinite(p.order) ? p.order : i };
    })
    .sort((a, b) => a.order - b.order);

  const index = siblings.findIndex(s => s.pid === id);
  const swapWith = index + direction;
  if(index === -1 || swapWith < 0 || swapWith >= siblings.length) return;

  const a = siblings[index];
  const b = siblings[swapWith];
  store.products[a.pid].order = b.order;
  store.products[b.pid].order = a.order;
  pibo_saveDraft();
}

function pibo_slugify(text){
  return (text || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || ("pizza-" + Date.now().toString(36));
}

function pibo_formatPrice(n){
  return Number(n || 0).toLocaleString("fa-IR") + " تومان";
}

// Renders a QR code fully client-side into `container` (no external
// service call — some hosts, e.g. api.qrserver.com, are unreliable or
// filtered for visitors inside Iran, which used to leave QR boxes
// spinning forever). Requires js/vendor/qrcode.js to be loaded first.
function pibo_renderQrLocally(container, text, size){
  try{
    if(typeof qrcode === "undefined") throw new Error("qrcode lib missing");
    const qr = qrcode(0, "M"); // type 0 = auto-detect smallest size
    qr.addData(text);
    qr.make();
    container.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 2 });
    const svg = container.querySelector("svg");
    if(svg){
      svg.setAttribute("width", String(size || 160));
      svg.setAttribute("height", String(size || 160));
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "کد QR مشاهده سه‌بعدی");
    }
  }catch(e){
    container.innerHTML = `<span style="color:var(--ink-soft);font-size:.8rem;padding:20px">ساخت کد QR ممکن نشد</span>`;
  }
}
