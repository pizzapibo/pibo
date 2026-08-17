/* ===========================================================
   PIBO — "turn on your VPN" hint
   -----------------------------------------------------------
   Some assets on this site (Google Fonts, the model-viewer
   library, map/AR helpers) live on domains that are sometimes
   filtered inside Iran. If a visitor's connection looks like
   it's coming from Iran directly (i.e. no VPN/anti-filter tool
   active), we show a small dismissible notice suggesting they
   turn one on for the smoothest experience — QR codes, fonts
   and the 3D/AR viewer all load faster and more reliably that way.

   This is best-effort and fails silently: if the lookup service
   itself is unreachable, we simply don't show anything rather
   than blocking or breaking the page.
=========================================================== */
(function(){
  const SESSION_KEY = "pibo_vpn_hint_dismissed";

  function alreadyHandledThisSession(){
    try{ return sessionStorage.getItem(SESSION_KEY) === "1"; }
    catch(e){ return false; }
  }

  function markHandled(){
    try{ sessionStorage.setItem(SESSION_KEY, "1"); }catch(e){ /* ignore */ }
  }

  function showBanner(){
    if(document.getElementById("pibo-vpn-hint")) return;

    const bar = document.createElement("div");
    bar.id = "pibo-vpn-hint";
    bar.setAttribute("role", "status");
    bar.style.cssText = [
      "position:fixed", "left:12px", "right:12px", "bottom:16px", "z-index:9999",
      "background:#20140A", "color:#fff", "padding:14px 16px", "border-radius:16px",
      "box-shadow:0 10px 30px rgba(0,0,0,.25)", "font-family:inherit",
      "display:flex", "align-items:center", "gap:12px", "direction:rtl"
    ].join(";");

    bar.innerHTML = `
      <span style="font-size:1.4rem;line-height:1">🌐</span>
      <span style="flex:1;font-size:.85rem;line-height:1.6">
        برای تجربه بهتر و سریع‌تر (مثل نمایش سه‌بعدی و کد QR)، بهتر است فیلترشکن خود را روشن کنید.
      </span>
      <button type="button" aria-label="بستن" style="background:transparent;border:none;color:#cbbfae;font-size:1.2rem;line-height:1;cursor:pointer;padding:4px">×</button>
    `;

    bar.querySelector("button").addEventListener("click", () => {
      bar.remove();
      markHandled();
    });

    document.body.appendChild(bar);
  }

  async function checkAndMaybeShow(){
    if(alreadyHandledThisSession()) return;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try{
      const res = await fetch("https://ipwho.is/", { signal: controller.signal, cache: "no-store" });
      if(!res.ok) return;
      const data = await res.json();
      // Heuristic: if the visible exit IP resolves to Iran, the visitor
      // is very likely browsing without a VPN / anti-filter tool active,
      // since most such tools route traffic through a non-Iranian exit.
      if(data && data.success !== false && data.country_code === "IR"){
        showBanner();
      }
    }catch(e){
      // Lookup service unreachable/blocked/timed out — say nothing,
      // don't interrupt the user's experience over this.
    }finally{
      clearTimeout(timer);
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", checkAndMaybeShow);
  }else{
    checkAndMaybeShow();
  }
})();
