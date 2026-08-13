/* ===========================================================
   PIBO — product catalogue (reads/writes through js/store.js)
=========================================================== */

async function pibo_getProducts(){
  const store = await pibo_loadStore();
  return Object.keys(store.products).map(id => ({ id, ...store.products[id] }));
}

async function pibo_getProduct(id){
  const store = await pibo_loadStore();
  const p = store.products[id];
  return p ? { id, ...p } : null;
}

/* create or update a pizza. pass an id to update, omit to create */
async function pibo_saveProduct(product, existingId){
  const store = await pibo_loadStore();
  const id = existingId || pibo_slugify(product.name) + "-" + Date.now().toString(36);
  const data = { ...product };
  delete data.id;
  store.products[id] = data;
  pibo_saveDraft();
  return id;
}

async function pibo_deleteProduct(id){
  const store = await pibo_loadStore();
  delete store.products[id];
  pibo_saveDraft();
}

function pibo_slugify(text){
  return (text || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || ("pizza-" + Date.now().toString(36));
}

function pibo_formatPrice(n){
  return Number(n || 0).toLocaleString("fa-IR") + " تومان";
}
