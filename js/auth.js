/* ===========================================================
   PIBO — admin.html logic
   Change the password below whenever you like.
=========================================================== */
const PIBO_ADMIN_PASSWORD = "Arshiakamali2898";
let pibo_editingId = null;

document.addEventListener("DOMContentLoaded", () => {
  const authScreen = document.querySelector(".auth-screen");
  const adminShell = document.querySelector(".admin-shell");
  const form = document.querySelector("[data-auth-form]");
  const errorBox = document.querySelector("[data-auth-error]");
  const logoutBtn = document.querySelector("[data-logout]");

  if(sessionStorage.getItem("pibo_admin_ok") === "1"){
    unlock();
  }

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = form.querySelector("input[name=password]").value;
    if(value === PIBO_ADMIN_PASSWORD){
      sessionStorage.setItem("pibo_admin_ok", "1");
      unlock();
    }else{
      errorBox.textContent = "رمز عبور اشتباه است.";
      form.querySelector("input[name=password]").value = "";
    }
  });

  logoutBtn?.addEventListener("click", () => {
    sessionStorage.removeItem("pibo_admin_ok");
    location.reload();
  });

  function unlock(){
    authScreen?.remove();
    adminShell?.classList.add("show");

    initPublishBar();
    initProductManager();
    renderOrders();
    initHeroImageForm();
    initHoursForm();
    initCategoryManager();
  }
});

const PIBO_DEFAULT_CATEGORIES = ["پیتزا", "نوشیدنی", "سیب‌زمینی", "دسر"];

/* ---------- publish bar: download the updated data file, or publish straight to GitHub ---------- */
async function initPublishBar(){
  await pibo_loadStore();
  const bar = document.querySelector("[data-publish-bar]");
  const status = document.querySelector("[data-publish-status]");
  const downloadBtn = document.querySelector("[data-publish-download]");
  const discardBtn = document.querySelector("[data-publish-discard]");
  const githubBtn = document.querySelector("[data-publish-github]");
  const githubStatus = document.querySelector("[data-publish-github-status]");
  if(!bar) return;

  function refresh(){
    const dirty = pibo_hasUnsavedChanges();
    bar.classList.toggle("dirty", dirty);
    if(status){
      status.textContent = dirty
        ? (pibo_getGithubConfig()
            ? "تغییرات ذخیره‌نشده داری — دکمه‌ی «انتشار مستقیم» رو بزن."
            : "تغییرات ذخیره‌نشده داری — فایل رو دانلود کن و جای data/store.json بذار، بعد Push کن (یا پایین همین صفحه اتصال گیت‌هاب رو تنظیم کن تا این کار خودکار بشه).")
        : "همه‌چیز با نسخه‌ی منتشرشده روی سایت یکیه.";
    }
    if(githubBtn) githubBtn.hidden = !pibo_getGithubConfig();
  }

  downloadBtn?.addEventListener("click", () => {
    pibo_downloadStoreFile();
  });

  discardBtn?.addEventListener("click", () => {
    if(!confirm("همه‌ی تغییرات ذخیره‌نشده پاک بشه و به نسخه‌ی منتشرشده روی سایت برگردیم؟")) return;
    pibo_discardDraft();
    location.reload();
  });

  githubBtn?.addEventListener("click", async () => {
    githubBtn.disabled = true;
    if(githubStatus) githubStatus.textContent = "در حال انتشار…";
    try{
      await pibo_publishToGithub();
      if(githubStatus) githubStatus.textContent = "منتشر شد ✓ (تا آماده شدن سایت جدید، ۱-۲ دقیقه طول می‌کشه)";
      refresh();
    }catch(err){
      if(githubStatus) githubStatus.textContent = "خطا: " + err.message;
      console.error(err);
    }finally{
      githubBtn.disabled = false;
      setTimeout(() => { if(githubStatus) githubStatus.textContent = ""; }, 6000);
    }
  });

  initGithubConfigForm(refresh);

  refresh();
  // re-check after every product/settings edit made elsewhere on the page
  document.addEventListener("pibo:changed", refresh);
}

function initGithubConfigForm(onSaved){
  const form = document.querySelector("[data-github-form]");
  const clearBtn = document.querySelector("[data-github-clear]");
  if(!form) return;

  const existing = pibo_getGithubConfig();
  if(existing){
    form.querySelector("[name=owner]").value = existing.owner || "";
    form.querySelector("[name=repo]").value = existing.repo || "";
    form.querySelector("[name=branch]").value = existing.branch || "main";
    form.querySelector("[name=token]").value = existing.token || "";
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const status = form.querySelector("[data-github-form-status]");
    const owner = form.querySelector("[name=owner]").value.trim();
    const repo = form.querySelector("[name=repo]").value.trim();
    const branch = form.querySelector("[name=branch]").value.trim() || "main";
    const token = form.querySelector("[name=token]").value.trim();

    if(!owner || !repo || !token){
      if(status) status.textContent = "همه‌ی فیلدها لازمن.";
      return;
    }

    pibo_saveGithubConfig({ owner, repo, branch, token });
    if(status) status.textContent = "ذخیره شد ✓";
    onSaved?.();
    setTimeout(() => { if(status) status.textContent = ""; }, 3000);
  });

  clearBtn?.addEventListener("click", () => {
    if(!confirm("اطلاعات گیت‌هاب از این مرورگر پاک بشه؟")) return;
    pibo_clearGithubConfig();
    form.reset();
    form.querySelector("[name=branch]").value = "main";
    onSaved?.();
  });
}

/* call this after any pibo_saveProduct / pibo_deleteProduct / pibo_saveSettings */
function pibo_markChanged(){
  document.dispatchEvent(new Event("pibo:changed"));
}

/* ---------- category management ---------- */
async function initCategoryManager(){
  const chipsWrap = document.querySelector("[data-category-chips]");
  const form = document.querySelector("[data-category-form]");
  if(!chipsWrap || !form || typeof pibo_getSettings === "undefined") return;

  async function getCategories(){
    const settings = await pibo_getSettings();
    return Array.isArray(settings.categories) && settings.categories.length ? settings.categories : PIBO_DEFAULT_CATEGORIES.slice();
  }

  async function paint(){
    const categories = await getCategories();
    chipsWrap.innerHTML = categories.map(c => `
      <span style="display:inline-flex;align-items:center;gap:8px;background:var(--cream);border:1.5px solid var(--line);border-radius:100px;padding:8px 8px 8px 16px;font-size:.88rem;font-weight:700">
        ${c}
        <button type="button" data-remove-cat="${c}" style="width:22px;height:22px;border-radius:50%;background:#fff;color:var(--red);font-weight:900;display:flex;align-items:center;justify-content:center;font-size:.8rem">✕</button>
      </span>
    `).join("");

    chipsWrap.querySelectorAll("[data-remove-cat]").forEach(btn => {
      btn.addEventListener("click", async () => {
        if(!confirm(`دسته‌بندی «${btn.dataset.removeCat}» حذف بشه؟ (پیتزاهای همین دسته حذف نمی‌شن، فقط دیگه توی این دسته نمایش داده نمی‌شن)`)) return;
        const current = await getCategories();
        const next = current.filter(c => c !== btn.dataset.removeCat);
        await pibo_saveSettings({ categories: next });
        pibo_markChanged();
        await paint();
        populateCategorySelect(next);
      });
    });

    populateCategorySelect(categories);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = form.querySelector("[name=newCategory]");
    const value = input.value.trim();
    if(!value) return;
    const current = await getCategories();
    if(current.includes(value)){ input.value = ""; return; }
    const next = [...current, value];
    await pibo_saveSettings({ categories: next });
    pibo_markChanged();
    input.value = "";
    await paint();
  });

  await paint();
}

function populateCategorySelect(categories){
  const select = document.querySelector("[data-category-select]");
  if(!select) return;
  const currentValue = select.value;
  select.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join("");
  if(categories.includes(currentValue)) select.value = currentValue;
}

/* ---------- site logo ---------- */
async function initHeroImageForm(){
  const form = document.querySelector("[data-hero-form]");
  if(!form || typeof pibo_getSettings === "undefined") return;

  const settings = await pibo_getSettings();
  if(settings.logoImage){
    form.querySelector("[name=logoImage]").value = settings.logoImage;
    applyLogoToPage(settings.logoImage);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = form.querySelector("[data-hero-status]");
    const value = form.querySelector("[name=logoImage]").value.trim();
    try{
      await pibo_saveSettings({ logoImage: value || null });
      pibo_markChanged();
      applyLogoToPage(value);
      if(status) status.textContent = "ذخیره شد ✓";
    }catch(err){
      if(status) status.textContent = "خطا در ذخیره";
      console.error(err);
    }
    setTimeout(() => { if(status) status.textContent = ""; }, 3000);
  });
}

function applyLogoToPage(url){
  document.querySelectorAll(".site-logo-mark").forEach(el => {
    if(url){
      el.style.background = `url('${url}') center/cover no-repeat`;
      el.textContent = "";
    }else{
      el.style.background = "";
      el.textContent = "پ";
    }
  });
}

/* ---------- product manager (add / edit / delete / price) ---------- */
async function initProductManager(){
  const form = document.querySelector("[data-product-form]");
  const cancelBtn = document.querySelector("[data-product-cancel]");
  if(!form) return;

  await refreshProductViews();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.querySelector("[name=name]").value.trim();
    const category = form.querySelector("[name=category]").value;
    const desc = form.querySelector("[name=desc]").value.trim();
    const price = parseInt(form.querySelector("[name=price]").value, 10) || 0;
    const diameter = parseInt(form.querySelector("[name=diameter]").value, 10) || null;
    const emoji = form.querySelector("[name=emoji]").value.trim() || pibo_defaultEmoji(category);
    const image = form.querySelector("[name=image]").value.trim();
    const glbName = form.querySelector("[name=glb]").value.trim();
    const usdzName = form.querySelector("[name=usdz]").value.trim();

    if(!name || !price){
      alert("لطفاً نام و قیمت را وارد کنید.");
      return;
    }

    const submitBtn = form.querySelector("button[type=submit]");
    if(submitBtn) submitBtn.disabled = true;

    try{
      const id = pibo_editingId || pibo_slugify(name);
      await pibo_saveProduct({
        name, category, desc, price, emoji, image, diameter,
        glb: glbName || (category === "پیتزا" ? `models/${id}.glb` : ""),
        usdz: usdzName || (category === "پیتزا" ? `models/${id}.usdz` : "")
      }, pibo_editingId || id);

      pibo_markChanged();
      resetProductForm();
      await refreshProductViews();
    }catch(err){
      alert("ذخیره با خطا مواجه شد. دوباره امتحان کنید.");
      console.error(err);
    }finally{
      if(submitBtn) submitBtn.disabled = false;
    }
  });

  cancelBtn?.addEventListener("click", resetProductForm);
}

function pibo_defaultEmoji(category){
  return { "پیتزا":"🍕", "نوشیدنی":"🥤", "سیب‌زمینی":"🍟", "دسر":"🍰" }[category] || "🍽️";
}

async function refreshProductViews(){
  const products = await pibo_getProducts();
  renderProductTable(products);
  renderQrGrid(products);
}

function resetProductForm(){
  pibo_editingId = null;
  const form = document.querySelector("[data-product-form]");
  const title = document.querySelector("[data-product-form-title]");
  const cancelBtn = document.querySelector("[data-product-cancel]");
  form?.reset();
  if(title) title.textContent = "افزودن پیتزای جدید";
  cancelBtn?.setAttribute("hidden", "true");
}

function renderProductTable(products){
  const body = document.querySelector("[data-products-body]");
  if(!body) return;

  if(!products.length){
    body.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--ink-soft)">هنوز موردی اضافه نشده است.</td></tr>`;
    return;
  }

  body.innerHTML = products.map(p => {
    const available = p.available !== false;
    return `
    <tr style="${available ? "" : "opacity:.55"}">
      <td>${p.image ? `<img src="${p.image}" alt="" style="width:32px;height:32px;object-fit:cover;border-radius:8px;vertical-align:middle;margin-left:8px">` : (p.emoji || "🍽️") + " "}${p.name}</td>
      <td style="font-size:.8rem;color:var(--ink-soft)">${p.category || "پیتزا"}</td>
      <td>${pibo_formatPrice(p.price)}</td>
      <td style="font-size:.85rem;color:var(--ink-soft)">${p.diameter ? p.diameter + " سانتی‌متر" : "—"}</td>
      <td>
        <div class="table-actions">
          <button type="button" class="btn btn-sm" style="background:${available ? "#E9F7EF" : "#FDEAE3"};color:${available ? "var(--green)" : "var(--orange-dark)"}" data-toggle-available="${p.id}">${available ? "موجود" : "تمام‌شده"}</button>
          <button type="button" class="btn btn-outline btn-sm" data-edit="${p.id}">ویرایش</button>
          <button type="button" class="btn btn-sm" style="background:#FDEAE3;color:var(--orange-dark)" data-delete="${p.id}">حذف</button>
        </div>
      </td>
    </tr>
  `;
  }).join("");

  body.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => startEditProduct(btn.dataset.edit, products));
  });
  body.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => deleteProduct(btn.dataset.delete));
  });
  body.querySelectorAll("[data-toggle-available]").forEach(btn => {
    btn.addEventListener("click", () => toggleAvailability(btn.dataset.toggleAvailable, products));
  });
}

async function toggleAvailability(id, products){
  const product = products.find(p => p.id === id);
  if(!product) return;
  const nextAvailable = !(product.available !== false);
  try{
    await pibo_saveProduct({ ...product, available: nextAvailable }, id);
    pibo_markChanged();
    await refreshProductViews();
  }catch(err){
    alert("تغییر وضعیت موجودی با خطا مواجه شد.");
    console.error(err);
  }
}

function startEditProduct(id, products){
  const product = products.find(p => p.id === id);
  if(!product) return;
  pibo_editingId = id;

  const form = document.querySelector("[data-product-form]");
  const title = document.querySelector("[data-product-form-title]");
  const cancelBtn = document.querySelector("[data-product-cancel]");
  if(!form) return;

  form.querySelector("[name=name]").value = product.name;
  form.querySelector("[name=category]").value = product.category || "پیتزا";
  form.querySelector("[name=desc]").value = product.desc || "";
  form.querySelector("[name=price]").value = product.price;
  form.querySelector("[name=diameter]").value = product.diameter || "";
  form.querySelector("[name=emoji]").value = product.emoji || "";
  form.querySelector("[name=image]").value = product.image || "";
  form.querySelector("[name=glb]").value = product.glb || "";
  form.querySelector("[name=usdz]").value = product.usdz || "";

  if(title) title.textContent = `ویرایش «${product.name}»`;
  cancelBtn?.removeAttribute("hidden");
  form.scrollIntoView({ behavior:"smooth", block:"center" });
}

async function deleteProduct(id){
  if(!confirm("این پیتزا حذف شود؟")) return;
  try{
    await pibo_deleteProduct(id);
    pibo_markChanged();
    if(pibo_editingId === id) resetProductForm();
    await refreshProductViews();
  }catch(err){
    alert("حذف پیتزا با خطا مواجه شد.");
    console.error(err);
  }
}

/* ---------- QR codes (pizza items only — AR is pizza-specific) ---------- */
function renderQrGrid(products){
  const grid = document.querySelector("[data-qr-grid]");
  if(!grid) return;
  const base = location.origin + location.pathname.replace(/[^/]*$/, "");
  const pizzas = products.filter(p => (p.category || "پیتزا") === "پیتزا");

  if(!pizzas.length){
    grid.innerHTML = `<p style="color:var(--ink-soft)">بعد از افزودن پیتزا، کد QR آن اینجا نمایش داده می‌شود.</p>`;
    return;
  }

  grid.innerHTML = pizzas.map(p => {
    const arUrl = `${base}ar.html?pizza=${p.id}`;
    const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(arUrl)}`;
    return `
      <div class="qr-tile">
        <img src="${qrImg}" alt="کد QR ${p.name}" width="140" height="140" loading="lazy">
        <b>${p.name}</b>
        <span>${arUrl}</span>
      </div>
    `;
  }).join("");
}

/* ---------- orders (read from this browser's local order log) ---------- */
async function renderOrders(){
  const tbody = document.querySelector("[data-orders-body]");
  const empty = document.querySelector("[data-orders-empty]");
  if(!tbody) return;

  let list = [];
  try{
    list = JSON.parse(localStorage.getItem("pibo_orders") || "[]");
  }catch(e){
    console.error("خطا در خواندن سفارش‌های محلی:", e);
  }

  renderStats(list);

  if(!list.length){
    tbody.innerHTML = "";
    if(empty) empty.style.display = "block";
    return;
  }
  if(empty) empty.style.display = "none";

  const products = await pibo_getProducts();

  tbody.innerHTML = list.map(o => {
    const itemsText = (o.items || []).map(item => {
      const p = products.find(x => x.id === item.id);
      return p ? `${p.name}×${item.qty}` : "";
    }).filter(Boolean).join("، ");
    const date = new Date(o.date).toLocaleString("fa-IR");
    const phoneDigits = (o.phone || "").replace(/\D/g, "").replace(/^0/, "98");
    const readyMsg = encodeURIComponent(`سلام ${o.name} 👋 سفارشتون آماده شد و داره میاد!`);
    const onWayMsg = encodeURIComponent(`سلام ${o.name} 👋 سفارشتون از پیبو راه افتاد، به‌زودی می‌رسه 🛵`);
    return `
      <tr>
        <td>${o.name}</td>
        <td>${o.phone}</td>
        <td>${itemsText}</td>
        <td>${pibo_formatPrice(o.total)}</td>
        <td>${date}</td>
        <td>
          <div class="table-actions">
            <a class="btn btn-sm btn-outline" target="_blank" href="https://wa.me/${phoneDigits}?text=${readyMsg}">آماده شد</a>
            <a class="btn btn-sm btn-outline" target="_blank" href="https://wa.me/${phoneDigits}?text=${onWayMsg}">در راهه</a>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderStats(list){
  const set = (key, val) => {
    const el = document.querySelector(`[data-stat="${key}"]`);
    if(el) el.textContent = val;
  };
  if(!list.length){
    set("today-count", "۰"); set("today-total", pibo_formatPrice(0));
    set("week-count", "۰"); set("week-total", pibo_formatPrice(0));
    return;
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  const todays = list.filter(o => new Date(o.date) >= startOfToday);
  const weeks = list.filter(o => new Date(o.date) >= startOfWeek);

  const sum = arr => arr.reduce((s, o) => s + (o.total || 0), 0);

  set("today-count", todays.length.toLocaleString("fa-IR"));
  set("today-total", pibo_formatPrice(sum(todays)));
  set("week-count", weeks.length.toLocaleString("fa-IR"));
  set("week-total", pibo_formatPrice(sum(weeks)));
}

/* ---------- working hours ---------- */
async function initHoursForm(){
  const form = document.querySelector("[data-hours-form]");
  if(!form || typeof pibo_getSettings === "undefined") return;

  const settings = await pibo_getSettings();
  if(settings.openTime) form.querySelector("[name=openTime]").value = settings.openTime;
  if(settings.closeTime) form.querySelector("[name=closeTime]").value = settings.closeTime;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = form.querySelector("[data-hours-status]");
    const openTime = form.querySelector("[name=openTime]").value;
    const closeTime = form.querySelector("[name=closeTime]").value;
    try{
      await pibo_saveSettings({ openTime: openTime || null, closeTime: closeTime || null });
      pibo_markChanged();
      if(status) status.textContent = "ذخیره شد ✓";
    }catch(err){
      if(status) status.textContent = "خطا در ذخیره";
      console.error(err);
    }
    setTimeout(() => { if(status) status.textContent = ""; }, 3000);
  });
}
