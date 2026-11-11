/* ===========================================================
   PIBO — sticky cart (localStorage-backed)
=========================================================== */
const PIBO_CART_KEY = "pibo_cart_v1";

function pibo_cartGet(){
  try{ return JSON.parse(localStorage.getItem(PIBO_CART_KEY)) || {}; }
  catch{ return {}; }
}
function pibo_cartSave(cart){
  localStorage.setItem(PIBO_CART_KEY, JSON.stringify(cart));
  pibo_renderStickyCart();
}
function pibo_cartAdd(item){
  const cart = pibo_cartGet();
  if(cart[item.id]) cart[item.id].qty += 1;
  else cart[item.id] = { name:item.name, price:item.price, qty:1 };
  cart[item.id]._justAdded = true;
  pibo_cartSave(cart);
}
function pibo_cartSetQty(id, qty){
  const cart = pibo_cartGet();
  if(!cart[id]) return;
  if(qty <= 0) delete cart[id];
  else cart[id].qty = qty;
  pibo_cartSave(cart);
}
function pibo_cartTotal(cart){
  return Object.values(cart).reduce((sum, it) => sum + it.price * it.qty, 0);
}
function pibo_cartCount(cart){
  return Object.values(cart).reduce((sum, it) => sum + it.qty, 0);
}

function pibo_bounceCartBar(){
  const bar = document.querySelector(".sticky-cart");
  if(!bar) return;
  bar.classList.remove("bounce");
  void bar.offsetWidth; // restart animation
  bar.classList.add("bounce");
}

/* briefly peek the cart panel open so the user sees the item drop into
   the list (feed-style), then auto-close if they don't interact */
function pibo_flashNewestCartItem(){
  const bar = document.querySelector(".sticky-cart");
  if(!bar || bar.classList.contains("open")) return;
  bar.classList.add("open", "peek");
  clearTimeout(pibo_flashNewestCartItem._t);
  pibo_flashNewestCartItem._t = setTimeout(() => {
    bar.classList.remove("open", "peek");
  }, 1400);
}

function pibo_ensureStickyCartMounted(){
  if(document.querySelector(".sticky-cart")) return;

  const scrim = document.createElement("div");
  scrim.className = "sticky-cart-scrim";
  document.body.appendChild(scrim);

  const bar = document.createElement("div");
  bar.className = "sticky-cart";
  bar.innerHTML = `
    <button type="button" class="sticky-cart-summary" data-cart-toggle>
      <span class="sticky-cart-icon" data-cart-icon>🛒</span>
      <span class="sticky-cart-count" data-cart-count>0</span>
      <span class="sticky-cart-total" data-cart-total></span>
      <span class="sticky-cart-chevron">‹</span>
    </button>
    <div class="sticky-cart-panel" data-cart-panel>
      <div class="sticky-cart-items" data-cart-items></div>
      <div class="sticky-cart-footer">
        <span>جمع کل</span>
        <strong data-cart-panel-total></strong>
      </div>
    </div>
  `;
  document.body.appendChild(bar);

  function setOpen(open){
    bar.classList.toggle("open", open);
    scrim.classList.toggle("show", open);
  }
  bar.querySelector("[data-cart-toggle]").addEventListener("click", () => {
    setOpen(!bar.classList.contains("open"));
  });
  scrim.addEventListener("click", () => setOpen(false));
}

function pibo_animateNumber(el, from, to, formatter, duration = 450){
  const start = performance.now();
  function tick(now){
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
    const value = Math.round(from + (to - from) * eased);
    if(p < 1){
      el.textContent = formatter(value);
      requestAnimationFrame(tick);
    }else{
      // land on the final value with a per-digit odometer reveal
      // instead of just snapping the text in place
      pibo_renderOdometer(el, formatter(to));
    }
  }
  requestAnimationFrame(tick);
}

/* (10) diff the new text against what's currently shown and only
   slide-in the characters that actually changed — like a price
   odometer, more premium than a flat text swap.
   Only the numeric portion is split into per-character spans; the
   " تومان" suffix is left as plain text so Persian/RTL bidi ordering
   isn't broken by wrapping every character (which reversed the digits
   and jumbled "تومان" before this fix). */
function pibo_renderOdometer(el, text){
  const spaceIdx = text.lastIndexOf(" ");
  const numberPart = spaceIdx === -1 ? text : text.slice(0, spaceIdx);
  const suffix = spaceIdx === -1 ? "" : text.slice(spaceIdx);

  const prevChars = (el.dataset.odoChars || "").split("");
  const chars = numberPart.split("");
  const digitsHtml = chars.map((ch, i) => {
    const changed = prevChars[i] !== ch;
    return `<span class="odo-digit${changed ? " odo-in" : ""}">${ch}</span>`;
  }).join("");

  el.innerHTML = `<bdi class="odo-number">${digitsHtml}</bdi>${suffix}`;
  el.dataset.odoChars = numberPart;
}

function pibo_renderStickyCart(){
  pibo_ensureStickyCartMounted();
  const cart = pibo_cartGet();
  const count = pibo_cartCount(cart);
  const total = pibo_cartTotal(cart);
  const bar = document.querySelector(".sticky-cart");
  const wasEmpty = !bar.classList.contains("has-items");
  bar.classList.toggle("has-items", count > 0);

  const iconEl = bar.querySelector("[data-cart-icon]");
  if(wasEmpty && count > 0 && iconEl){
    iconEl.classList.remove("morph");
    void iconEl.offsetWidth;
    iconEl.classList.add("morph");
  }

  const countEl = bar.querySelector("[data-cart-count]");
  const totalEl = bar.querySelector("[data-cart-total]");
  const panelTotalEl = bar.querySelector("[data-cart-panel-total]");

  const prevTotal = Number(bar.dataset.prevTotal || 0);
  pibo_animateNumber(totalEl, prevTotal, total, n => pibo_formatPrice(n));
  pibo_animateNumber(panelTotalEl, prevTotal, total, n => pibo_formatPrice(n));
  bar.dataset.prevTotal = total;
  countEl.textContent = count.toLocaleString("fa-IR");

  const itemsWrap = bar.querySelector("[data-cart-items]");
  const entries = Object.entries(cart);
  if(!entries.length){
    itemsWrap.innerHTML = `<p class="empty-cart">سبد خرید خالی است</p>`;
    return;
  }
  itemsWrap.innerHTML = entries.map(([id, it]) => `
    <div class="cart-item ${it._justAdded ? "just-added" : ""}" data-cart-item="${id}">
      <span class="name">${it.name}</span>
      <div class="qty">
        <button type="button" data-qty-btn data-id="${id}" data-delta="-1">−</button>
        <span>${it.qty.toLocaleString("fa-IR")}</span>
        <button type="button" data-qty-btn data-id="${id}" data-delta="1">+</button>
      </div>
    </div>
  `).join("");

  // clear the one-shot "just added" flag once rendered, so it doesn't
  // replay the entrance animation on unrelated re-renders
  let dirty = false;
  Object.values(cart).forEach(it => { if(it._justAdded){ delete it._justAdded; dirty = true; } });
  if(dirty) localStorage.setItem(PIBO_CART_KEY, JSON.stringify(cart));

  itemsWrap.querySelectorAll("[data-qty-btn]").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.dataset.id;
      const delta = Number(b.dataset.delta);
      const cart2 = pibo_cartGet();
      const newQty = (cart2[id]?.qty || 0) + delta;
      pibo_cartSetQty(id, newQty);
    });
  });
}

document.addEventListener("DOMContentLoaded", pibo_renderStickyCart);
