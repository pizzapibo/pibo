/* ===========================================================
   PIBO — main.js
=========================================================== */
let PIBO_PRODUCTS = []; // populated on load — used to render the menu

document.addEventListener("DOMContentLoaded", async () => {
  initHeader();
  initMobileNav();
  initReveal();
  PIBO_PRODUCTS = await pibo_getProducts();
  await renderMenu();
  applySiteLogo();
  initCardImageParallax();
});

/* ---------- (5) subtle parallax on card images while scrolling ---------- */
function initCardImageParallax(){
  let ticking = false;
  function update(){
    const vh = window.innerHeight;
    document.querySelectorAll(".pizza-card .media img").forEach(img => {
      const rect = img.getBoundingClientRect();
      const centerOffset = (rect.top + rect.height / 2) - vh / 2;
      const y = Math.max(-14, Math.min(14, centerOffset * 0.06));
      img.style.setProperty("--parallax-y", y.toFixed(1) + "px");
    });
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if(!ticking){ requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  // recalc after menu (re)renders images
  new MutationObserver(() => requestAnimationFrame(update))
    .observe(document.querySelector("[data-menu-grid]") || document.body, { childList: true, subtree: true });
  update();
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

  grid.innerHTML = `<div class="skeleton-grid">${Array.from({length:6}).map(() => `
    <div class="skeleton-card">
      <div class="sk-media"></div>
      <div class="sk-body">
        <div class="sk-line w-60"></div>
        <div class="sk-line w-90"></div>
        <div class="sk-line w-40"></div>
      </div>
    </div>
  `).join("")}</div>`;
  const allProducts = PIBO_PRODUCTS.length ? PIBO_PRODUCTS : (PIBO_PRODUCTS = await pibo_getProducts());
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

  tabsWrap.innerHTML = `<div class="menu-tabs-indicator"></div>` + categories.map((c, i) =>
    `<button type="button" class="menu-tab ${i === 0 ? "active" : ""}" data-tab="menu-cat-${pibo_slugify(c)}">${c}</button>`
  ).join("");

  grid.innerHTML = categories.map(cat => {
    const items = products.filter(p => (p.category || "پیتزا") === cat);
    return `
      <div class="menu-category-section" id="menu-cat-${pibo_slugify(cat)}">
        <h3 class="menu-category-title reveal">${cat}</h3>
        <div class="menu-grid stagger">
          ${items.map((p, i) => {
            const hasAr = p.arEnabled !== false;
            return `
            <div class="pizza-card reveal" style="--i:${i % 6}">
              <div class="media">
                ${hasAr ? `<span class="badge-ar">✦ مشاهده در AR</span>` : ""}
                ${p.image ? `<img src="${p.image}" alt="${p.name || ""}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover">` : `<span>${p.emoji || "🍽️"}</span>`}
              </div>
              <div class="body">
                <h3>${p.name} <span class="price">${pibo_formatPrice(p.price)}</span></h3>
                <p>${p.desc || ""}${p.diameter ? ` <span style="color:var(--ink-soft)">· قطر ${p.diameter} سانتی‌متر</span>` : ""}</p>
                <div class="actions">
                  ${hasAr ? `<a class="btn btn-primary" href="ar.html?pizza=${p.id}">مشاهده سه‌بعدی</a>` : ""}
                  <button type="button" class="btn btn-outline" data-add-cart data-id="${p.id}" data-name="${(p.name||"").replace(/"/g,'&quot;')}" data-price="${p.price||0}">افزودن +</button>
                </div>
              </div>
            </div>
          `;
          }).join("")}
        </div>
      </div>
    `;
  }).join("");

  tabsWrap.querySelectorAll("[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.tab);
      if(target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveMenuTab(btn);
    });
  });

  requestAnimationFrame(() => moveTabIndicator(tabsWrap.querySelector(".menu-tab.active")));
  window.addEventListener("resize", () => moveTabIndicator(tabsWrap.querySelector(".menu-tab.active")));

  initCategoryScrollSpy();
  initReveal();
  bindAddToCartButtons();
}

/* slide the segmented-control indicator behind the active tab,
   like iOS 26's spring-animated segmented control */
function moveTabIndicator(activeTab){
  const wrap = document.querySelector("[data-menu-tabs]");
  const indicator = wrap?.querySelector(".menu-tabs-indicator");
  if(!wrap || !indicator || !activeTab) return;
  indicator.style.width = activeTab.offsetWidth + "px";
  indicator.style.transform = `translateX(${activeTab.offsetLeft}px)`;
}

function setActiveMenuTab(btn){
  const wrap = document.querySelector("[data-menu-tabs]");
  wrap.querySelectorAll(".menu-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  moveTabIndicator(btn);
}

/* clone the product's own thumbnail (photo, once you upload one — or
   the emoji placeholder until then) and animate it flying, shrinking,
   from the clicked card toward the sticky cart bar */
function pibo_flyToCart(fromEl){
  const card = fromEl.closest(".pizza-card");
  const mediaEl = card ? card.querySelector(".media") : null;
  const cartBar = document.querySelector(".sticky-cart");
  const fromRect = (mediaEl || fromEl).getBoundingClientRect();
  const toRect = cartBar ? cartBar.getBoundingClientRect() : { left: window.innerWidth - 60, top: 20, width: 40, height: 40 };

  const fly = document.createElement("div");
  fly.className = "pibo-fly-icon";
  fly.innerHTML = mediaEl ? mediaEl.innerHTML : "🍕";
  fly.style.width = fromRect.width + "px";
  fly.style.height = fromRect.height + "px";
  fly.style.left = fromRect.left + "px";
  fly.style.top = fromRect.top + "px";
  fly.style.transform = "translate(0,0) scale(1)";
  fly.style.opacity = "1";
  document.body.appendChild(fly);

  const targetSize = 46; // shrink down to roughly the cart icon's size
  const scale = targetSize / fromRect.width;
  const dx = (toRect.left + toRect.width / 2) - (fromRect.left + fromRect.width / 2);
  const dy = (toRect.top + toRect.height / 2) - (fromRect.top + fromRect.height / 2);

  requestAnimationFrame(() => {
    fly.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    fly.style.opacity = "0";
    fly.style.borderRadius = "50%";
  });
  setTimeout(() => {
    fly.remove();
    pibo_bounceCartBar();
    pibo_flashNewestCartItem();
  }, 700);
}

/* bind "add to cart" buttons rendered inside the menu */
function bindAddToCartButtons(){
  document.querySelectorAll("[data-add-cart]").forEach(btn => {
    btn.addEventListener("click", () => {
      pibo_flyToCart(btn);
      pibo_cartAdd({ id: btn.dataset.id, name: btn.dataset.name, price: Number(btn.dataset.price || 0) });
      const original = btn.textContent;
      btn.textContent = "اضافه شد ✓";
      btn.classList.add("added");
      setTimeout(() => { btn.textContent = original; btn.classList.remove("added"); }, 900);
    });
  });
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
        const activeTab = Array.from(tabs).find(t => t.dataset.tab === entry.target.id);
        if(activeTab) moveTabIndicator(activeTab);
      }
    });
  }, { rootMargin: "-150px 0px -65% 0px", threshold: 0 });

  sections.forEach(s => io.observe(s));
}
