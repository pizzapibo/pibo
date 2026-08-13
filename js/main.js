/* ===========================================================
   PIBO — main.js
=========================================================== */
const PIBO_WHATSAPP = "989140909878";

document.addEventListener("DOMContentLoaded", async () => {
  initHeader();
  initMobileNav();
  initReveal();
  await renderMenu();
  initOrderForm();
  initSocialLinks();
  fillPickListAndQr();
  applySiteLogo();
  initQuickOrderFab();
  checkWorkingHours();
});

/* ---------- working hours (set from admin panel) ---------- */
async function checkWorkingHours(){
  if(typeof pibo_getSettings === "undefined") return;
  const settings = await pibo_getSettings();
  if(!settings.openTime || !settings.closeTime) return;

  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = settings.openTime.split(":").map(Number);
  const [ch, cm] = settings.closeTime.split(":").map(Number);
  const openMin = oh * 60 + om, closeMin = ch * 60 + cm;
  const isOpen = openMin <= closeMin
    ? (current >= openMin && current < closeMin)
    : (current >= openMin || current < closeMin);

  if(isOpen) return;

  const wrap = document.querySelector(".order-form");
  if(!wrap) return;
  const banner = document.createElement("div");
  banner.style.cssText = "background:var(--red);color:#fff;padding:14px 18px;border-radius:14px;text-align:center;font-weight:800;margin-bottom:18px";
  banner.textContent = `الان بسته‌ایم — ساعات کاری: ${settings.openTime} تا ${settings.closeTime}`;
  wrap.insertBefore(banner, wrap.firstChild);
  wrap.querySelectorAll("input, textarea, select, button").forEach(el => el.disabled = true);
}

/* ---------- floating quick-order button ---------- */
function initQuickOrderFab(){
  const fab = document.querySelector("[data-quick-order]");
  const orderSection = document.getElementById("order");
  if(!fab || !orderSection) return;

  const onScroll = () => {
    const past = window.scrollY > window.innerHeight * .8;
    const reached = orderSection.getBoundingClientRect().top < window.innerHeight;
    fab.classList.toggle("show", past && !reached);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive:true });
}

/* ---------- site logo (set from admin panel) ---------- */
async function applySiteLogo(){
  if(typeof pibo_getSettings === "undefined") return;
  const settings = await pibo_getSettings();
  if(!settings.logoImage) return;
  document.querySelectorAll(".site-logo-mark").forEach(el => {
    el.style.background = `url('${settings.logoImage}') center/cover no-repeat`;
    el.textContent = "";
  });
}

/* ---------- header shrink on scroll ---------- */
function initHeader(){
  const header = document.querySelector(".site-header");
  if(!header) return;
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 30);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive:true });
}

/* ---------- mobile nav drawer ---------- */
function initMobileNav(){
  const toggle = document.querySelector(".menu-toggle");
  const drawer = document.querySelector(".mobile-nav");
  if(!toggle || !drawer) return;
  const closeBtn = drawer.querySelector(".close-mn");
  toggle.addEventListener("click", () => drawer.classList.add("open"));
  closeBtn?.addEventListener("click", () => drawer.classList.remove("open"));
  drawer.querySelectorAll("a").forEach(a => a.addEventListener("click", () => drawer.classList.remove("open")));
}

/* ---------- scroll reveal animations ---------- */
function initReveal(){
  const items = document.querySelectorAll(".reveal, .reveal-scale, .reveal-right");
  if(!items.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold:.15, rootMargin:"0px 0px -60px 0px" });
  items.forEach((el,i) => { el.style.setProperty("--i", i % 8); io.observe(el); });
}

/* ---------- render pizza menu (sectioned by category, scroll-spy tabs) ---------- */
async function renderMenu(){
  const grid = document.querySelector("[data-menu-grid]");
  const tabsWrap = document.querySelector("[data-menu-tabs]");
  if(!grid) return;

  grid.innerHTML = `<p style="color:var(--ink-soft);text-align:center">در حال دریافت منو…</p>`;
  const allProducts = await pibo_getProducts();
  const products = allProducts.filter(p => p.available !== false);

  if(!products.length){
    grid.innerHTML = `<p style="color:var(--ink-soft);text-align:center">
      هنوز موردی در منو ثبت نشده است. از پنل مدیریت اضافه کنید.
    </p>`;
    if(tabsWrap) tabsWrap.innerHTML = "";
    return;
  }

  // order categories: prefer the admin-defined order, then whatever else appears
  const settings = (typeof pibo_getSettings !== "undefined") ? await pibo_getSettings() : {};
  const definedOrder = Array.isArray(settings.categories) && settings.categories.length
    ? settings.categories
    : ["پیتزا", "نوشیدنی", "سیب‌زمینی", "دسر"];
  const present = Array.from(new Set(products.map(p => p.category || "پیتزا")));
  const categories = [
    ...definedOrder.filter(c => present.includes(c)),
    ...present.filter(c => !definedOrder.includes(c))
  ];

  tabsWrap.innerHTML = categories.map((c, i) =>
    `<button type="button" class="menu-tab ${i === 0 ? "active" : ""}" data-tab="menu-cat-${pibo_slugify(c)}">${c}</button>`
  ).join("");

  grid.innerHTML = categories.map(cat => {
    const items = products.filter(p => (p.category || "پیتزا") === cat);
    return `
      <div class="menu-category-section" id="menu-cat-${pibo_slugify(cat)}">
        <h3 class="menu-category-title reveal">${cat}</h3>
        <div class="menu-grid stagger">
          ${items.map((p, i) => {
            const isPizza = (p.category || "پیتزا") === "پیتزا";
            return `
            <div class="pizza-card reveal" style="--i:${i % 6}">
              <div class="media" ${p.image ? `style="background-image:url('${p.image}');background-size:cover;background-position:center;"` : ""}>
                ${isPizza ? `<span class="badge-ar">✦ مشاهده در AR</span>` : ""}
                ${p.image ? "" : `<span>${p.emoji || "🍽️"}</span>`}
              </div>
              <div class="body">
                <h3>${p.name} <span class="price">${pibo_formatPrice(p.price)}</span></h3>
                <p>${p.desc || ""}${p.diameter ? ` <span style="color:var(--ink-soft)">· قطر ${p.diameter} سانتی‌متر</span>` : ""}</p>
                <div class="actions">
                  ${isPizza ? `<a class="btn btn-outline" href="ar.html?pizza=${p.id}">مشاهده سه‌بعدی</a>` : ""}
                  <button class="btn btn-primary" data-add="${p.id}">افزودن به سفارش</button>
                </div>
              </div>
            </div>
          `;
          }).join("")}
        </div>
      </div>
    `;
  }).join("");

  grid.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => addToCart(btn.dataset.add));
  });

  tabsWrap.querySelectorAll("[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.tab);
      if(target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  initCategoryScrollSpy();
  initReveal();
}

/* highlight the tab matching whichever category section is in view */
function initCategoryScrollSpy(){
  const sections = document.querySelectorAll(".menu-category-section");
  const tabs = document.querySelectorAll("[data-tab]");
  if(!sections.length || !tabs.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === entry.target.id));
      }
    });
  }, { rootMargin: "-150px 0px -65% 0px", threshold: 0 });

  sections.forEach(s => io.observe(s));
}

/* ---------- cart ---------- */
let PIBO_CART = {};

function addToCart(id){
  PIBO_CART[id] = (PIBO_CART[id] || 0) + 1;
  renderCart();
  document.getElementById("order")?.scrollIntoView({ behavior:"smooth", block:"start" });
}

function changeQty(id, delta){
  if(!PIBO_CART[id]) return;
  PIBO_CART[id] += delta;
  if(PIBO_CART[id] <= 0) delete PIBO_CART[id];
  renderCart();
}

function renderCart(){
  const list = document.querySelector("[data-cart-list]");
  const summary = document.querySelector("[data-cart-summary]");
  if(!list) return;

  const entries = Object.entries(PIBO_CART);
  if(!entries.length){
    list.innerHTML = `<div class="empty-cart">هنوز پیتزایی به سفارش اضافه نکرده‌اید — از بخش منو انتخاب کنید 🍕</div>`;
    if(summary) summary.style.display = "none";
    return;
  }

  let total = 0;
  list.innerHTML = entries.map(([id, qty]) => {
    const p = PIBO_PRODUCTS.find(x => x.id === id);
    if(!p) return "";
    total += p.price * qty;
    return `
      <div class="cart-item">
        <span class="name">${p.name}</span>
        <div class="qty">
          <button type="button" data-dec="${id}">−</button>
          <span>${qty}</span>
          <button type="button" data-inc="${id}">+</button>
        </div>
      </div>
    `;
  }).join("");

  if(summary){
    summary.style.display = "flex";
    summary.innerHTML = `<span>مبلغ کل</span><span>${pibo_formatPrice(total)}</span>`;
  }

  list.querySelectorAll("[data-inc]").forEach(b => b.addEventListener("click", () => changeQty(b.dataset.inc, 1)));
  list.querySelectorAll("[data-dec]").forEach(b => b.addEventListener("click", () => changeQty(b.dataset.dec, -1)));
}

/* ---------- order form -> WhatsApp + shared order log ---------- */
function initOrderForm(){
  renderCart();

  const form = document.querySelector("[data-order-form]");
  if(!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const entries = Object.entries(PIBO_CART);
    const name = form.querySelector("[name=name]").value.trim();
    const phone = form.querySelector("[name=phone]").value.trim();
    const address = form.querySelector("[name=address]").value.trim();
    const notes = form.querySelector("[name=notes]").value.trim();

    if(!entries.length){
      alert("لطفاً حداقل یک پیتزا از منو به سفارش اضافه کنید.");
      return;
    }
    if(!name || !phone || !address){
      alert("لطفاً نام، شماره تماس و آدرس را وارد کنید.");
      return;
    }

    let total = 0;
    const lines = entries.map(([id, qty]) => {
      const p = PIBO_PRODUCTS.find(x => x.id === id);
      total += p.price * qty;
      return `• ${p.name} × ${qty} — ${pibo_formatPrice(p.price * qty)}`;
    });

    const message = [
      "سلام پیبو 👋 سفارش جدید:",
      "",
      ...lines,
      "",
      `مبلغ کل: ${pibo_formatPrice(total)}`,
      "",
      `نام: ${name}`,
      `تماس: ${phone}`,
      `آدرس: ${address}`,
      notes ? `توضیحات: ${notes}` : ""
    ].filter(Boolean).join("\n");

    const submitBtn = form.querySelector("button[type=submit]");
    if(submitBtn) submitBtn.disabled = true;

    saveOrderLocally({
      name, phone, address, notes,
      items: entries.map(([id, qty]) => ({ id, qty })),
      total,
      date: new Date().toISOString()
    });

    if(submitBtn) submitBtn.disabled = false;

    const url = `https://wa.me/${PIBO_WHATSAPP}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  });
}

/* store the order in this browser only — WhatsApp (opened right after) is
   the real, guaranteed-to-arrive order channel; this local copy just lets
   you glance back at recent orders placed from this specific device. */
function saveOrderLocally(order){
  try{
    const key = "pibo_orders";
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    list.unshift(order);
    localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
  }catch(e){ /* storage unavailable, skip silently */ }
}

/* ---------- social links ---------- */
function initSocialLinks(){
  document.querySelectorAll("[data-whatsapp-link]").forEach(a => {
    a.href = `https://wa.me/${PIBO_WHATSAPP}?text=${encodeURIComponent("سلام پیبو 👋")}`;
  });
}

/* ---------- quick-add chips + hero QR (index.html only) ---------- */
function fillPickListAndQr(){
  const availableProducts = PIBO_PRODUCTS.filter(p => p.available !== false);
  const pickList = document.querySelector("[data-pick-list]");
  if(pickList){
    if(availableProducts.length){
      pickList.innerHTML = availableProducts.map(p => `<button type="button" class="pick-chip" data-pick="${p.id}">${p.name}</button>`).join("");
      pickList.querySelectorAll("[data-pick]").forEach(chip => chip.addEventListener("click", () => addToCart(chip.dataset.pick)));
    }else{
      pickList.innerHTML = `<span style="color:var(--ink-soft);font-size:.85rem">هنوز پیتزایی اضافه نشده</span>`;
    }
  }

  const qrHolder = document.getElementById("home-qr");
  if(qrHolder){
    const firstPizza = availableProducts.find(p => (p.category || "پیتزا") === "پیتزا");
    if(firstPizza){
      const url = location.href.replace(/index\.html.*$/, "").replace(/\/?$/, "/") + `ar.html?pizza=${firstPizza.id}`;
      qrHolder.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=6&data=${encodeURIComponent(url)}" width="160" height="160" alt="کد QR مشاهده سه‌بعدی">`;
    }else{
      qrHolder.innerHTML = `<span style="color:var(--ink-soft);font-size:.85rem;padding:20px">پس از افزودن یک پیتزا، کد QR اینجا نمایش داده می‌شود</span>`;
    }
  }
}
