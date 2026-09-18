/* ===========================================================
   PIBO — main.js
=========================================================== */
let PIBO_PRODUCTS = []; // populated on load — used to render the menu

document.addEventListener("DOMContentLoaded", async () => {
  initHeader();
  initMobileNav();
  initReveal();
  if(typeof pibo_loadDoughColors === "function") await pibo_loadDoughColors();
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
            const sizes = pibo_productSizes(p).filter(s => s.enabled !== false);
            const safeName = (p.name || "").replace(/"/g, "&quot;");

            let sizePickerHtml = "";
            let priceHtml = pibo_formatPrice(p.price);
            let initialImage = p.image || "";

            if(sizes.length){
              const first = sizes[0];
              priceHtml = pibo_formatPrice(first.price);
              if(first.image) initialImage = first.image;
              const firstDough = pibo_sizeDoughColors(first);

              sizePickerHtml = `
                <div class="pibo-picker-block">
                  <div class="pibo-picker-row">
                    <span class="pibo-picker-label">قطر</span>
                    <div class="size-picker" data-size-picker="${p.id}" data-fallback-image="${p.image || ""}">
                      ${sizes.map((s, idx) => `
                        <button type="button" class="size-chip ${idx === 0 ? "active" : ""}"
                          data-size-chip data-product="${p.id}" data-name="${safeName}"
                          data-index="${s.index}" data-price="${s.price}" data-diameter="${s.diameter}"
                          data-dough="${pibo_sizeDoughColors(s).join(",")}" data-image="${s.image || ""}">
                          <span class="size-chip-check">✓</span>
                          ${s.diameter}
                        </button>
                      `).join("")}
                    </div>
                  </div>
                  <div class="pibo-picker-row" ${firstDough.length > 1 ? "" : "hidden"} data-dough-row="${p.id}">
                    <span class="pibo-picker-label">رنگ خمیر</span>
                    <div class="dough-picker" data-dough-picker-live="${p.id}">
                      ${firstDough.map((key, idx) => `
                        <button type="button" class="dough-dot-lg ${idx === 0 ? "active" : ""}" data-dough-choice
                          data-key="${key}" style="background:${pibo_doughMeta(key).color}" title="${pibo_doughMeta(key).label}"></button>
                      `).join("")}
                    </div>
                  </div>
                </div>
              `;
            }

            return `
            <div class="pizza-card reveal" style="--i:${i % 6}">
              <div class="media">
                ${p.image || initialImage
                  ? `<img src="${initialImage}" alt="${p.name || ""}" loading="lazy" decoding="async" data-card-img>`
                  : `<span class="media-emoji" data-card-emoji>${p.emoji || "🍽️"}</span>`}
                <div class="card-overlay">
                  <div class="overlay-top-row">
                    <h3 class="overlay-name">${p.name}</h3>
                    <span class="overlay-price" data-price-label>${priceHtml}</span>
                  </div>
                  ${p.desc ? `<p class="overlay-desc">${p.desc}</p>` : ""}
                  ${sizePickerHtml}
                  ${hasAr ? `<div class="overlay-bottom-row"><a class="badge-ar" data-ar-link href="ar.html?pizza=${p.id}${sizes.length ? `&size=${sizes[0].index}&dough=${pibo_sizeDoughColors(sizes[0])[0] || ""}` : ""}">✦ مشاهده سه‌بعدی</a></div>` : ""}
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
  bindSizeChips();
}

/* switch a card's selected diameter, updating its price/photo/AR link —
   and rebuilds the (independent) dough-color row for whichever colors
   that diameter offers, remembering the color the person had picked */
function bindSizeChips(){
  document.querySelectorAll("[data-size-picker]").forEach(picker => {
    picker.querySelectorAll("[data-size-chip]").forEach(chip => {
      chip.addEventListener("click", () => {
        picker.querySelectorAll("[data-size-chip]").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");

        const card = picker.closest(".pizza-card");
        const priceLabel = card?.querySelector("[data-price-label]");
        const price = Number(chip.dataset.price || 0);
        if(priceLabel) priceLabel.textContent = pibo_formatPrice(price);

        // rebuild the dough-color row for this diameter's own color list,
        // keeping the previously-chosen color when this diameter offers it too
        const doughRow = card?.querySelector("[data-dough-row]");
        const doughWrap = card?.querySelector("[data-dough-picker-live]");
        const prevChosen = doughWrap?.querySelector(".dough-dot-lg.active")?.dataset.key;
        const keys = (chip.dataset.dough || "").split(",").filter(Boolean);
        if(doughRow) doughRow.hidden = keys.length <= 1;
        if(doughWrap){
          doughWrap.innerHTML = keys.map((key, idx) => `
            <button type="button" class="dough-dot-lg ${(prevChosen ? prevChosen === key : idx === 0) ? "active" : ""}" data-dough-choice
              data-key="${key}" style="background:${pibo_doughMeta(key).color}" title="${pibo_doughMeta(key).label}"></button>
          `).join("");
          bindDoughChoices(doughWrap);
        }

        // swap the card photo if this size has its own image, otherwise
        // fall back to the product's main photo — with a quick crossfade
        const mediaImg = card?.querySelector("[data-card-img]");
        if(mediaImg){
          const nextSrc = chip.dataset.image || picker.dataset.fallbackImage || "";
          if(nextSrc && mediaImg.getAttribute("src") !== nextSrc){
            mediaImg.classList.add("swapping");
            setTimeout(() => {
              mediaImg.src = nextSrc;
              mediaImg.classList.remove("swapping");
            }, 180);
          }
        }

        // switch the AR link to this size's own 3D model / chosen color
        updateArLink(card, chip.dataset.index, keys.includes(prevChosen) ? prevChosen : keys[0]);
      });
    });
    // wire up whichever dough dots are on the card right now (page load)
    const card = picker.closest(".pizza-card");
    const doughWrap = card?.querySelector("[data-dough-picker-live]");
    if(doughWrap) bindDoughChoices(doughWrap);
  });
}

/* picking a dough color never changes price or diameter — only which
   color is highlighted and which 3D model the AR link points to */
function bindDoughChoices(doughWrap){
  doughWrap.querySelectorAll("[data-dough-choice]").forEach(dot => {
    dot.addEventListener("click", () => {
      doughWrap.querySelectorAll("[data-dough-choice]").forEach(d => d.classList.remove("active"));
      dot.classList.add("active");
      const card = doughWrap.closest(".pizza-card");
      const activeChip = card?.querySelector("[data-size-chip].active");
      updateArLink(card, activeChip?.dataset.index, dot.dataset.key);
    });
  });
}

function updateArLink(card, sizeIndex, doughKey){
  const arLink = card?.querySelector("[data-ar-link]");
  if(!arLink) return;
  const url = new URL(arLink.getAttribute("href"), location.href);
  if(sizeIndex !== undefined) url.searchParams.set("size", sizeIndex);
  if(doughKey) url.searchParams.set("dough", doughKey);
  arLink.setAttribute("href", url.pathname + url.search);
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
