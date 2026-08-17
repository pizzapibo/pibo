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
