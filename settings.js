/* ===========================================================
   PIBO — site-wide settings (reads/writes through js/store.js)
=========================================================== */
async function pibo_getSettings(){
  const store = await pibo_loadStore();
  return store.settings;
}

async function pibo_saveSettings(data){
  const store = await pibo_loadStore();
  store.settings = { ...store.settings, ...data };
  pibo_saveDraft();
}

/* ---------- رنگ‌های اصلی خمیر (قابل مدیریت از پنل ادمین) ---------- */
async function pibo_saveDoughColors(list){
  await pibo_saveSettings({ doughColors: list });
  if(typeof pibo_loadDoughColors === "function") await pibo_loadDoughColors();
}
