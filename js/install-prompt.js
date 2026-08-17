/* ===========================================================
   PIBO — "install the app" welcome overlay
   -----------------------------------------------------------
   Shows once per browser, on entry to the site, explaining how
   to add PIBO to the home screen as an app. iOS Safari has no
   API to trigger this automatically, so we show manual steps
   (Share → Add to Home Screen). On Android/Chrome, where a real
   native install prompt is available, we show a single button
   that triggers it directly.
=========================================================== */
(function(){
  const SEEN_KEY = "pibo_install_prompt_seen";

  function alreadySeen(){
    try{ return localStorage.getItem(SEEN_KEY) === "1"; }
    catch(e){ return false; }
  }
  function markSeen(){
    try{ localStorage.setItem(SEEN_KEY, "1"); }catch(e){ /* ignore */ }
  }

  function isStandalone(){
    return window.matchMedia("(display-mode: standalone)").matches
      || window.navigator.standalone === true; // iOS
  }

  function isIOS(){
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  let deferredInstallEvent = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallEvent = e;
  });

  function buildOverlay(){
    const overlay = document.createElement("div");
    overlay.id = "pibo-install-overlay";
    overlay.style.cssText = [
      "position:fixed", "inset:0", "z-index:10000",
      "background:rgba(32,20,10,.55)",
      "display:flex", "align-items:flex-end", "justify-content:center",
      "padding:0", "direction:rtl"
    ].join(";");

    const iosSteps = `
      <div style="text-align:center;line-height:2.1;font-size:.92rem;color:var(--ink,#241608)">
        <p>۱- در نوار پایین گوشی، دکمهٔ <b>اشتراک‌گذاری</b> (⬆️) را بزنید.</p>
        <p>۲- منوی باز شده را به پایین اسکرول کنید و <b>«Add to Home Screen»</b> را انتخاب کنید.</p>
        <p>۳- در بالای صفحه، دکمهٔ <b>Add</b> را بزنید.</p>
      </div>
    `;

    const androidSteps = `
      <div style="text-align:center;line-height:2.1;font-size:.92rem;color:var(--ink,#241608)">
        <p>با زدن دکمهٔ زیر، پیبو مستقیم به صفحه اصلی گوشی شما اضافه می‌شود.</p>
      </div>
      <button type="button" id="pibo-install-btn" class="btn btn-primary" style="width:100%;margin-top:6px">نصب اپلیکیشن پیبو</button>
    `;

    const stepsHtml = isIOS() ? iosSteps : androidSteps;

    overlay.innerHTML = `
      <div style="width:100%;max-width:460px;background:var(--white,#FFFDF8);border-radius:28px 28px 0 0;padding:30px 24px 26px;box-shadow:0 -10px 40px rgba(0,0,0,.25);animation:pibo-slide-up .35s var(--ease,ease) both">
        <div style="width:78px;height:78px;border-radius:50%;margin:0 auto 18px;background:conic-gradient(from 90deg,var(--orange,#FF5A1F),var(--gold,#FFB400),var(--red,#E5483C),var(--orange,#FF5A1F));display:flex;align-items:center;justify-content:center;color:#fff;font-size:2rem;font-weight:900;font-family:'Vazirmatn',sans-serif;box-shadow:var(--shadow-soft,0 10px 26px -16px rgba(36,22,8,.28))">پ</div>
        <h2 style="text-align:center;font-size:1.15rem;font-weight:900;margin:0 0 6px;color:var(--ink,#241608)">نصب اپلیکیشن وب پیبو</h2>
        <p style="text-align:center;color:var(--ink-soft,#7C6750);font-size:.85rem;margin:0 0 20px">سریع‌تر سفارش بده — بدون نیاز به مرورگر</p>
        <div style="border-top:1px dashed var(--line,#F0DFC0);border-bottom:1px dashed var(--line,#F0DFC0);padding:18px 4px;margin-bottom:20px">
          ${stepsHtml}
        </div>
        <button type="button" id="pibo-install-dismiss" class="btn btn-outline" style="width:100%">متوجه شدم</button>
      </div>
    `;

    if(!document.getElementById("pibo-install-anim-style")){
      const style = document.createElement("style");
      style.id = "pibo-install-anim-style";
      style.textContent = `@keyframes pibo-slide-up{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}`;
      document.head.appendChild(style);
    }

    return overlay;
  }

  function showOverlay(){
    if(document.getElementById("pibo-install-overlay")) return;
    const overlay = buildOverlay();
    document.body.appendChild(overlay);

    const close = () => {
      overlay.remove();
      markSeen();
    };

    overlay.querySelector("#pibo-install-dismiss").addEventListener("click", close);

    const installBtn = overlay.querySelector("#pibo-install-btn");
    if(installBtn){
      installBtn.addEventListener("click", async () => {
        if(!deferredInstallEvent){
          close();
          return;
        }
        deferredInstallEvent.prompt();
        try{ await deferredInstallEvent.userChoice; }catch(e){ /* ignore */ }
        deferredInstallEvent = null;
        close();
      });
    }
  }

  function init(){
    if(alreadySeen() || isStandalone()) return;
    // small delay so it doesn't compete with the page's own load/animations
    setTimeout(showOverlay, 900);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  }else{
    init();
  }
})();
