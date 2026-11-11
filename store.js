/* ===========================================================
   PIBO — data engine (no external backend, no Google/Firebase)
   ------------------------------------------------------------
   Everyone visiting the site reads data/store.json, a plain file
   that lives on the same domain as the site itself — so there is
   nothing to filter and no VPN is ever needed to see the menu.

   When you edit something in the admin panel, the change is only
   saved in *your own browser* (as a draft) until you download the
   updated file and replace data/store.json in the project, then
   push it. That one extra step is the trade-off for the site
   having zero dependency on any foreign service.
=========================================================== */
const PIBO_STORE_URL = "data/store.json";
const PIBO_DRAFT_KEY = "pibo_draft_store";

let PIBO_STORE_CACHE = null;

async function pibo_loadStore(){
  if(PIBO_STORE_CACHE) return PIBO_STORE_CACHE;

  let base = { products: {}, settings: {} };
  try{
    const res = await fetch(PIBO_STORE_URL, { cache: "no-store" });
    if(res.ok){
      const data = await res.json();
      base = { products: data.products || {}, settings: data.settings || {} };
    }
  }catch(e){
    console.error("خطا در دریافت اطلاعات سایت:", e);
  }

  let draft = null;
  try{
    const raw = localStorage.getItem(PIBO_DRAFT_KEY);
    if(raw) draft = JSON.parse(raw);
  }catch(e){ /* ignore corrupt draft */ }

  PIBO_STORE_CACHE = draft ? { products: draft.products || {}, settings: draft.settings || {} } : base;
  return PIBO_STORE_CACHE;
}

function pibo_hasUnsavedChanges(){
  return !!localStorage.getItem(PIBO_DRAFT_KEY);
}

function pibo_saveDraft(){
  if(!PIBO_STORE_CACHE) return;
  try{
    localStorage.setItem(PIBO_DRAFT_KEY, JSON.stringify(PIBO_STORE_CACHE));
  }catch(e){ console.error("ذخیره تغییرات محلی با خطا مواجه شد:", e); }
}

function pibo_downloadStoreFile(){
  if(!PIBO_STORE_CACHE) return;
  const blob = new Blob([JSON.stringify(PIBO_STORE_CACHE, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "store.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function pibo_discardDraft(){
  localStorage.removeItem(PIBO_DRAFT_KEY);
  PIBO_STORE_CACHE = null;
}

/* ===========================================================
   Optional: publish straight to GitHub (no manual download/Push)
   ------------------------------------------------------------
   This only runs from admin.html, only after the shop owner enters
   their own GitHub repo + a personal access token (stored ONLY in
   their browser's localStorage — never written into any file that
   gets committed, so it never ends up in the public repo/site).
   Public visitors never load this file's network calls; reads of
   data/store.json stay a plain same-origin fetch either way.
=========================================================== */
const PIBO_GH_CONFIG_KEY = "pibo_github_config";

function pibo_getGithubConfig(){
  try{
    const raw = localStorage.getItem(PIBO_GH_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}

function pibo_saveGithubConfig(config){
  localStorage.setItem(PIBO_GH_CONFIG_KEY, JSON.stringify(config));
}

function pibo_clearGithubConfig(){
  localStorage.removeItem(PIBO_GH_CONFIG_KEY);
}

function pibo_utf8ToBase64(str){
  return btoa(unescape(encodeURIComponent(str)));
}

/* commits the current draft straight to the GitHub repo's data/store.json.
   Throws on failure — caller shows the error message to the user. */
async function pibo_publishToGithub(){
  const config = pibo_getGithubConfig();
  if(!config || !config.owner || !config.repo || !config.token){
    throw new Error("اول باید اطلاعات گیت‌هاب رو در همین پنل وارد کنی.");
  }
  if(!PIBO_STORE_CACHE) await pibo_loadStore();

  const branch = config.branch || "main";
  const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/data/store.json`;
  const headers = {
    "Authorization": `Bearer ${config.token}`,
    "Accept": "application/vnd.github+json"
  };

  // 1) get the current file's sha (required by GitHub to update a file)
  let sha = null;
  const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers });
  if(getRes.ok){
    const info = await getRes.json();
    sha = info.sha;
  }else if(getRes.status !== 404){
    const errBody = await getRes.json().catch(() => ({}));
    throw new Error(errBody.message || `خطای گیت‌هاب (${getRes.status})`);
  }

  // 2) commit the updated content
  const content = pibo_utf8ToBase64(JSON.stringify(PIBO_STORE_CACHE, null, 2));
  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "بروزرسانی منو از پنل پیبو",
      content,
      branch,
      ...(sha ? { sha } : {})
    })
  });

  if(!putRes.ok){
    const errBody = await putRes.json().catch(() => ({}));
    throw new Error(errBody.message || `خطای گیت‌هاب (${putRes.status})`);
  }

  // published successfully — clear the "unsaved" flag but KEEP the
  // in-memory cache as-is, so the admin panel keeps showing what was
  // just published instead of reverting until GitHub Pages rebuilds.
  localStorage.removeItem(PIBO_DRAFT_KEY);
}
