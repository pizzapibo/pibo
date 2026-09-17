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
      pibo_shake(form);
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
    initDoughColorManager().then(initProductManager);
    renderOrders();
    initHeroImageForm();
    initHoursForm();
    initCategoryManager();
  }
});

/* ---------- رنگ‌های اصلی خمیر ---------- */
let PIBO_DOUGH_COLORS_DRAFT = [];

async function initDoughColorManager(){
  const listWrap = document.querySelector("[data-dough-manage-list]");
  const addBtn = document.querySelector("[data-dough-add]");
  const saveBtn = document.querySelector("[data-dough-save]");
  const status = document.querySelector("[data-dough-status]");
  if(!listWrap || typeof pibo_loadDoughColors !== "function") return;

  PIBO_DOUGH_COLORS_DRAFT = (await pibo_loadDoughColors()).map(c => ({ ...c }));
  paintDoughManageList();
  renderDoughPickers(); // populate the (currently empty) product-form swatches too

  addBtn?.addEventListener("click", () => {
    const n = PIBO_DOUGH_COLORS_DRAFT.length + 1;
    PIBO_DOUGH_COLORS_DRAFT.push({ key: "dough" + Date.now().toString(36), label: `رنگ ${n}`, color: "#D8A15B" });
    paintDoughManageList();
  });

  saveBtn?.addEventListener("click", async () => {
    const cleaned = PIBO_DOUGH_COLORS_DRAFT.filter(c => c.label.trim());
    if(!cleaned.length){ alert("حداقل یک رنگ خمیر لازم است."); return; }
    await pibo_saveDoughColors(cleaned);
    PIBO_DOUGH_COLORS_DRAFT = cleaned.map(c => ({ ...c }));
    pibo_markChanged();
    renderDoughPickers();
    if(status){
      status.textContent = "ذخیره شد ✓";
      setTimeout(() => { status.textContent = ""; }, 2000);
    }
  });

  function paintDoughManageList(){
    listWrap.innerHTML = PIBO_DOUGH_COLORS_DRAFT.map((c, i) => `
      <div class="dough-manage-row" data-dough-row="${i}">
        <input type="color" value="${c.color}" data-dough-color-input>
        <input type="text" value="${c.label}" placeholder="اسم رنگ (مثلاً قرمز)" data-dough-label-input>
        <button type="button" data-dough-remove title="حذف">✕</button>
      </div>
    `).join("");

    listWrap.querySelectorAll("[data-dough-row]").forEach(row => {
      const i = parseInt(row.dataset.doughRow, 10);
      row.querySelector("[data-dough-color-input]").addEventListener("input", (e) => {
        PIBO_DOUGH_COLORS_DRAFT[i].color = e.target.value;
      });
      row.querySelector("[data-dough-label-input]").addEventListener("input", (e) => {
        PIBO_DOUGH_COLORS_DRAFT[i].label = e.target.value;
      });
      row.querySelector("[data-dough-remove]").addEventListener("click", () => {
        if(PIBO_DOUGH_COLORS_DRAFT.length <= 1){ alert("حداقل یک رنگ خمیر لازم است."); return; }
        PIBO_DOUGH_COLORS_DRAFT.splice(i, 1);
        paintDoughManageList();
      });
    });
  }
}

/* fills the two (per-size) dough-color radio pickers inside the
   product form, using whichever colors are currently saved */
function renderDoughPickers(){
  const colors = (typeof pibo_getDoughColorsSync === "function") ? pibo_getDoughColorsSync() : [];
  [0, 1].forEach(i => {
    const wrap = document.querySelector(`[data-dough-picker="${i}"]`);
    if(!wrap) return;
    const currentChecked = wrap.querySelector("input:checked")?.value;
    wrap.innerHTML = colors.map((c, idx) => `
      <label class="dough-swatch" style="--dough-color:${c.color}">
        <input type="radio" name="size${i}Dough" value="${c.key}" ${(currentChecked ? currentChecked === c.key : idx === (i === 1 ? 1 : 0) % colors.length) ? "checked" : ""}>
        <span></span>${c.label}
      </label>
    `).join("");
  });
}

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
    chipsWrap.innerHTML = categories.map((c, i) => `
      <span style="display:inline-flex;align-items:center;gap:6px;background:var(--cream);border:1.5px solid var(--line);border-radius:100px;padding:8px 8px 8px 16px;font-size:.88rem;font-weight:700">
        <span style="display:inline-flex;flex-direction:column;gap:2px;margin-left:2px">
          <button type="button" data-move-cat="${c}" data-dir="-1" ${i === 0 ? "disabled" : ""} title="جابه‌جایی به بالا" style="width:20px;height:16px;border-radius:6px;background:#fff;color:var(--ink-soft);display:flex;align-items:center;justify-content:center;font-size:.65rem;line-height:1;${i === 0 ? "opacity:.35" : ""}">▲</button>
          <button type="button" data-move-cat="${c}" data-dir="1" ${i === categories.length - 1 ? "disabled" : ""} title="جابه‌جایی به پایین" style="width:20px;height:16px;border-radius:6px;background:#fff;color:var(--ink-soft);display:flex;align-items:center;justify-content:center;font-size:.65rem;line-height:1;${i === categories.length - 1 ? "opacity:.35" : ""}">▼</button>
        </span>
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

    chipsWrap.querySelectorAll("[data-move-cat]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const current = await getCategories();
        const dir = parseInt(btn.dataset.dir, 10);
        const index = current.indexOf(btn.dataset.moveCat);
        const swapWith = index + dir;
        if(index === -1 || swapWith < 0 || swapWith >= current.length) return;
        const next = current.slice();
        [next[index], next[swapWith]] = [next[swapWith], next[index]];
        await pibo_saveSettings({ categories: next });
        pibo_markChanged();
        await paint();
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

  const hasSizesToggle = form.querySelector("[name=hasSizes]");
  hasSizesToggle?.addEventListener("change", () => toggleSizeMode(form, hasSizesToggle.checked));
  toggleSizeMode(form, false);

  await refreshProductViews();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.querySelector("[name=name]").value.trim();
    const category = form.querySelector("[name=category]").value;
    const desc = form.querySelector("[name=desc]").value.trim();
    const emoji = form.querySelector("[name=emoji]").value.trim() || pibo_defaultEmoji(category);
    const image = form.querySelector("[name=image]").value.trim();
    const arEnabled = form.querySelector("[name=arEnabled]").checked;
    const glbName = form.querySelector("[name=glb]").value.trim();
    const usdzName = form.querySelector("[name=usdz]").value.trim();
    const hasSizes = !!hasSizesToggle?.checked;

    let price = parseInt(form.querySelector("[name=price]").value, 10) || 0;
    let diameter = parseInt(form.querySelector("[name=diameter]").value, 10) || null;
    let sizes = [];

    if(hasSizes){
      sizes = readSizeRows(form);
      const usable = sizes.filter(s => s.diameter && s.price);
      if(!name || !usable.length){
        alert("لطفاً نام را وارد کنید و برای حداقل یک سایز، قطر و قیمت را پر کنید.");
        return;
      }
      const enabledUsable = usable.filter(s => s.enabled);
      price = (enabledUsable.length ? enabledUsable : usable).reduce((min, s) => Math.min(min, s.price), Infinity);
      diameter = null;
    }else{
      if(!name || !price){
        alert("لطفاً نام و قیمت را وارد کنید.");
        return;
      }
    }

    const submitBtn = form.querySelector("button[type=submit]");
    if(submitBtn) submitBtn.disabled = true;

    try{
      const id = pibo_editingId || pibo_slugify(name);
      await pibo_saveProduct({
        name, category, desc, price, emoji, image, diameter, arEnabled, hasSizes, sizes,
        glb: glbName || (arEnabled ? `models/${id}.glb` : ""),
        usdz: usdzName || (arEnabled ? `models/${id}.usdz` : "")
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

function toggleSizeMode(form, showSizes){
  const singleWrap = form.querySelector("[data-single-price-wrap]");
  const sizesWrap = form.querySelector("[data-sizes-wrap]");
  if(singleWrap) singleWrap.hidden = showSizes;
  if(sizesWrap) sizesWrap.hidden = !showSizes;
}

function readSizeRows(form){
  const defaultDough = (typeof pibo_getDoughColorsSync === "function" ? pibo_getDoughColorsSync() : [])[0]?.key || "plain";
  return [0, 1].map(i => {
    const diameter = parseInt(form.querySelector(`[name=size${i}Diameter]`).value, 10) || null;
    const price = parseInt(form.querySelector(`[name=size${i}Price]`).value, 10) || 0;
    const doughColor = form.querySelector(`[name=size${i}Dough]:checked`)?.value || defaultDough;
    const enabled = form.querySelector(`[name=size${i}Enabled]`).checked;
    const glb = form.querySelector(`[name=size${i}Glb]`)?.value.trim() || "";
    const usdz = form.querySelector(`[name=size${i}Usdz]`)?.value.trim() || "";
    const image = form.querySelector(`[name=size${i}Image]`)?.value.trim() || "";
    return { diameter, price, doughColor, enabled, glb, usdz, image };
  });
}

function writeSizeRows(form, sizes){
  renderDoughPickers();
  const colors = (typeof pibo_getDoughColorsSync === "function" ? pibo_getDoughColorsSync() : []);
  [0, 1].forEach(i => {
    const s = (sizes && sizes[i]) || {};
    form.querySelector(`[name=size${i}Diameter]`).value = s.diameter || "";
    form.querySelector(`[name=size${i}Price]`).value = s.price || "";
    const fallbackKey = colors[i % colors.length]?.key;
    const doughRadio = form.querySelector(`[name=size${i}Dough][value="${s.doughColor || fallbackKey}"]`);
    if(doughRadio) doughRadio.checked = true;
    form.querySelector(`[name=size${i}Enabled]`).checked = s.enabled !== false;
    const glbInput = form.querySelector(`[name=size${i}Glb]`);
    const usdzInput = form.querySelector(`[name=size${i}Usdz]`);
    const imageInput = form.querySelector(`[name=size${i}Image]`);
    if(glbInput) glbInput.value = s.glb || "";
    if(usdzInput) usdzInput.value = s.usdz || "";
    if(imageInput) imageInput.value = s.image || "";
    // auto-expand the "extra" details panel if this size already has
    // something in it, so editing an item doesn't hide saved data
    const details = form.querySelector(`[data-size-row="${i}"] .size-extra`);
    if(details) details.open = !!(s.glb || s.usdz || s.image);
  });
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
  form?.querySelectorAll(".size-extra").forEach(d => { d.open = false; });
  if(form) toggleSizeMode(form, false);
  if(title) title.textContent = "افزودن پیتزای جدید";
  cancelBtn?.setAttribute("hidden", "true");
}

function renderProductTable(products){
  const body = document.querySelector("[data-products-body]");
  if(!body) return;

  if(!products.length){
    body.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--ink-soft)">هنوز موردی اضافه نشده است.</td></tr>`;
    return;
  }

  // group by category so the up/down buttons move an item within its
  // own category's list — matches the order items appear on the site.
  const byCategory = new Map();
  products.forEach(p => {
    const cat = p.category || "پیتزا";
    if(!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(p);
  });

  let rows = "";
  byCategory.forEach((items, cat) => {
    rows += `<tr><td colspan="4" style="background:var(--cream);font-weight:800;font-size:.8rem;padding:8px 12px">${cat}</td></tr>`;
    items.forEach((p, i) => {
      const available = p.available !== false;
      const sizeCell = p.hasSizes
        ? (p.sizes || []).filter(s => s && s.diameter && s.price).map(s => `
            <div class="size-summary-row">
              <span class="dough-dot" style="background:${pibo_doughMeta(s.doughColor).color}"></span>
              ${s.diameter} سانتی — ${pibo_formatPrice(s.price)}${s.enabled === false ? " (غیرفعال)" : ""}
            </div>
          `).join("") || "—"
        : `${pibo_formatPrice(p.price)}${p.diameter ? ` <span style="color:var(--ink-soft);font-size:.8rem">(${p.diameter} سانتی‌متر)</span>` : ""}`;
      rows += `
      <tr style="${available ? "" : "opacity:.55"}">
        <td>${p.image ? `<img src="${p.image}" alt="" style="width:32px;height:32px;object-fit:cover;border-radius:8px;vertical-align:middle;margin-left:8px">` : (p.emoji || "🍽️") + " "}${p.name}${p.arEnabled !== false ? ` <span style="font-size:.7rem;background:var(--green);color:#fff;padding:2px 8px;border-radius:100px;font-family:'Fredoka','Vazirmatn',sans-serif">AR</span>` : ""}</td>
        <td style="font-size:.8rem;color:var(--ink-soft)">${p.category || "پیتزا"}</td>
        <td>${sizeCell}</td>
        <td>
          <div class="table-actions" style="align-items:center">
            <span style="display:inline-flex;flex-direction:column;gap:2px">
              <button type="button" data-move-product="${p.id}" data-dir="-1" ${i === 0 ? "disabled" : ""} title="جابه‌جایی به بالا" style="width:22px;height:18px;border-radius:6px;background:var(--cream);color:var(--ink-soft);display:flex;align-items:center;justify-content:center;font-size:.7rem;line-height:1;${i === 0 ? "opacity:.35" : ""}">▲</button>
              <button type="button" data-move-product="${p.id}" data-dir="1" ${i === items.length - 1 ? "disabled" : ""} title="جابه‌جایی به پایین" style="width:22px;height:18px;border-radius:6px;background:var(--cream);color:var(--ink-soft);display:flex;align-items:center;justify-content:center;font-size:.7rem;line-height:1;${i === items.length - 1 ? "opacity:.35" : ""}">▼</button>
            </span>
            <button type="button" class="btn btn-sm" style="background:${available ? "#E9F7EF" : "#FDEAE3"};color:${available ? "var(--green)" : "var(--orange-dark)"}" data-toggle-available="${p.id}">${available ? "موجود" : "تمام‌شده"}</button>
            <button type="button" class="btn btn-outline btn-sm" data-edit="${p.id}">ویرایش</button>
            <button type="button" class="btn btn-sm" style="background:#FDEAE3;color:var(--orange-dark)" data-delete="${p.id}">حذف</button>
          </div>
        </td>
      </tr>
    `;
    });
  });

  body.innerHTML = rows;

  body.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => startEditProduct(btn.dataset.edit, products));
  });
  body.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", () => deleteProduct(btn.dataset.delete));
  });
  body.querySelectorAll("[data-toggle-available]").forEach(btn => {
    btn.addEventListener("click", () => toggleAvailability(btn.dataset.toggleAvailable, products));
  });
  body.querySelectorAll("[data-move-product]").forEach(btn => {
    btn.addEventListener("click", () => moveProduct(btn.dataset.moveProduct, parseInt(btn.dataset.dir, 10)));
  });
}

async function moveProduct(id, direction){
  try{
    await pibo_moveProduct(id, direction);
    pibo_markChanged();
    await refreshProductViews();
  }catch(err){
    alert("جابه‌جایی با خطا مواجه شد.");
    console.error(err);
  }
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
  form.querySelector("[name=price]").value = product.hasSizes ? "" : product.price;
  form.querySelector("[name=diameter]").value = product.hasSizes ? "" : (product.diameter || "");
  form.querySelector("[name=emoji]").value = product.emoji || "";
  form.querySelector("[name=image]").value = product.image || "";
  form.querySelector("[name=arEnabled]").checked = product.arEnabled !== false;
  form.querySelector("[name=glb]").value = product.glb || "";
  form.querySelector("[name=usdz]").value = product.usdz || "";

  const hasSizesToggle = form.querySelector("[name=hasSizes]");
  if(hasSizesToggle) hasSizesToggle.checked = !!product.hasSizes;
  writeSizeRows(form, product.sizes || []);
  toggleSizeMode(form, !!product.hasSizes);

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
  const pizzas = products.filter(p => p.arEnabled !== false);

  if(!pizzas.length){
    grid.innerHTML = `<p style="color:var(--ink-soft)">بعد از افزودن پیتزا، کد QR آن اینجا نمایش داده می‌شود.</p>`;
    return;
  }

  grid.innerHTML = pizzas.map(p => `
    <div class="qr-tile">
      <div data-qr-holder="${p.id}" style="width:140px;height:140px;display:flex;align-items:center;justify-content:center"></div>
      <b>${p.name}</b>
      <span>${base}ar.html?pizza=${p.id}</span>
    </div>
  `).join("");

  pizzas.forEach(p => {
    const holder = grid.querySelector(`[data-qr-holder="${p.id}"]`);
    if(holder) pibo_renderQrLocally(holder, `${base}ar.html?pizza=${p.id}`, 140);
  });
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
