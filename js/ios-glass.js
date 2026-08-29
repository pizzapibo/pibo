/* ===========================================================
   PIBO — ios-glass.js
   Adds the iOS-26 "liquid glass" tactile press feedback:
   any button / tab / chip / card gets a quick spring squeeze
   on touch/press and springs back on release, exactly like
   iOS control buttons.
=========================================================== */
(function () {
  const SELECTOR = ".btn, .menu-tab, .pick-chip, .pizza-card, .faq-item summary, .mobile-nav a, .qty button, .btn-sm, .close-mn, .menu-toggle, .ar-launch-btn, .sticky-cart-summary, [data-qty-btn], .ios-switch";

  function press(el) {
    el.classList.add("is-pressed");
  }
  function release(el) {
    el.classList.remove("is-pressed");
  }

  document.addEventListener("pointerdown", (e) => {
    const el = e.target.closest(SELECTOR);
    if (el) press(el);
  }, { passive: true });

  ["pointerup", "pointerleave", "pointercancel"].forEach((evt) => {
    document.addEventListener(evt, (e) => {
      const el = e.target.closest(SELECTOR);
      if (el) release(el);
    }, { passive: true });
  });

  /* header goes "solid glass" once scrolled, like iOS large-title bars */
  window.addEventListener("load", () => {
    document.querySelectorAll(SELECTOR).forEach((el) => {
      el.style.webkitTapHighlightColor = "transparent";
    });
  });
})();

/* (9) shared "shake" helper — used for wrong-password, blocked actions, etc. */
function pibo_shake(el){
  if(!el) return;
  el.classList.remove("shake-x");
  void el.offsetWidth; // restart animation
  el.classList.add("shake-x");
}
