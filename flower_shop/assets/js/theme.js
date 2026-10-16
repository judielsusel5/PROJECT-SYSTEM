/* theme.js — light / dark mode for the whole site.
   - follows the visitor's device setting the first time, then remembers their choice (browser storage)
   - adds a sun / moon button next to the cart button (or in the small header on the login page)
   - load this in the <head> so the right theme is set before the page paints (no flash) */
(function () {
  var KEY = "annroe_theme", root = document.documentElement;
  function saved() { try { var s = localStorage.getItem(KEY); return s === "dark" || s === "light" ? s : ""; } catch (e) { return ""; } }
  function system() { return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }
  function current() { return root.getAttribute("data-theme") === "dark" ? "dark" : "light"; }

  var MOON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/></svg>';
  var SUN = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/></svg>';

  function apply(t) {
    root.setAttribute("data-theme", t);
    root.style.colorScheme = t;
    document.querySelectorAll(".themebtn").forEach(function (b) {
      b.innerHTML = t === "dark" ? SUN : MOON;
      b.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
      b.setAttribute("title", t === "dark" ? "Light mode" : "Dark mode");
    });
  }

  apply(saved() || system());

  /* follow the device setting while the visitor has not picked one */
  if (window.matchMedia) {
    var mq = matchMedia("(prefers-color-scheme: dark)"), onSys = function () { if (!saved()) apply(system()); };
    mq.addEventListener ? mq.addEventListener("change", onSys) : mq.addListener && mq.addListener(onSys);
  }

  function addButton() {
    if (document.querySelector(".themebtn")) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "cartbtn themebtn";
    b.addEventListener("click", function () {
      var t = current() === "dark" ? "light" : "dark";
      try { localStorage.setItem(KEY, t); } catch (e) {}
      apply(t);
    });
    var acct = document.querySelector("header.top .acct");
    if (acct) acct.insertBefore(b, acct.firstChild);
    else {
      var mini = document.querySelector("header.top.mini");
      if (!mini) return;
      var slot = mini.lastElementChild;
      if (slot && slot.tagName === "SPAN" && !slot.children.length) { slot.style.cssText = "display:flex;justify-content:flex-end"; slot.appendChild(b); } else mini.appendChild(b);
    }
    apply(current());
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addButton); else addButton();
})();