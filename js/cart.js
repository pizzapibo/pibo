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
  pibo_cartSave(cart);
  pibo_bounceCartBar();
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

function pibo_ensureStickyCartMounted(){
  if(document.querySelector(".sticky-cart")) return;
  const bar = document.createElement("div");
  bar.className = "sticky-cart";
  bar.innerHTML = `
    <button type="button" class="sticky-cart-summary" data-cart-toggle>
      <span class="sticky-cart-icon">🛒</span>
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
  bar.querySelector("[data-cart-toggle]").addEventListener("click", () => {
    bar.classList.toggle("open");
  });
}

function pibo_renderStickyCart(){
  pibo_ensureStickyCartMounted();
  const cart = pibo_cartGet();
  const count = pibo_cartCount(cart);
  const total = pibo_cartTotal(cart);
  const bar = document.querySelector(".sticky-cart");
  bar.classList.toggle("has-items", count > 0);

  bar.querySelector("[data-cart-count]").textContent = count.toLocaleString("fa-IR");
  bar.querySelector("[data-cart-total]").textContent = pibo_formatPrice(total);
  bar.querySelector("[data-cart-panel-total]").textContent = pibo_formatPrice(total);

  const itemsWrap = bar.querySelector("[data-cart-items]");
  const entries = Object.entries(cart);
  if(!entries.length){
    itemsWrap.innerHTML = `<p class="empty-cart">سبد خرید خالی است</p>`;
    return;
  }
  itemsWrap.innerHTML = entries.map(([id, it]) => `
    <div class="cart-item">
      <span class="name">${it.name}</span>
      <div class="qty">
        <button type="button" data-qty-btn data-id="${id}" data-delta="-1">−</button>
        <span>${it.qty.toLocaleString("fa-IR")}</span>
        <button type="button" data-qty-btn data-id="${id}" data-delta="1">+</button>
      </div>
    </div>
  `).join("");

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
