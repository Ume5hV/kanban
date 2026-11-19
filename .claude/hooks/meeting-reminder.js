/* =====================================================================
   MEETING REMINDER HOOK: after 10 seconds on the page, show an accessible
   dialog (no native alert). Inlined at the end of index.html, dc.html and
   devops.html. Edit the three constants below, then re-inline.
   ===================================================================== */
(function () {
  "use strict";
  var REMINDER_DELAY_MS = 10000;
  var REMINDER_TITLE = "IT meeting reminder";
  var REMINDER_TEXT = "There is an IT meeting next Wednesday at 10:00 AM in Room 888.";

  var css = [
    ".mr-overlay{position:fixed;inset:0;background:rgba(10,20,40,.55);display:flex;align-items:center;justify-content:center;padding:16px;z-index:1000}",
    ".mr-overlay[hidden]{display:none}",
    ".mr-dialog{background:#fff;color:#1b2430;max-width:380px;width:100%;border-radius:14px;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.35);font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}",
    "@media (prefers-color-scheme:dark){.mr-dialog{background:#1a2230;color:#e8edf4}}",
    ".mr-dialog h2{margin:0 0 8px;font-size:18px}",
    ".mr-dialog p{margin:0 0 16px}",
    ".mr-ok{background:#1f6feb;color:#fff;border:0;border-radius:8px;padding:8px 18px;font:inherit;cursor:pointer}",
    ".mr-ok:focus-visible{outline:3px solid currentColor;outline-offset:2px}"
  ].join("\n");

  function show() {
    var last = document.activeElement;
    var style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);
    var ov = document.createElement("div"); ov.className = "mr-overlay";
    var dlg = document.createElement("div"); dlg.className = "mr-dialog";
    dlg.setAttribute("role", "alertdialog"); dlg.setAttribute("aria-modal", "true");
    dlg.setAttribute("aria-labelledby", "mrTitle"); dlg.setAttribute("aria-describedby", "mrText");
    var h = document.createElement("h2"); h.id = "mrTitle"; h.textContent = REMINDER_TITLE;
    var p = document.createElement("p"); p.id = "mrText"; p.textContent = REMINDER_TEXT;
    var ok = document.createElement("button"); ok.type = "button"; ok.className = "mr-ok"; ok.textContent = "OK";
    dlg.appendChild(h); dlg.appendChild(p); dlg.appendChild(ok); ov.appendChild(dlg); document.body.appendChild(ov);
    function close() {
      document.removeEventListener("keydown", onKey);
      ov.remove(); style.remove();
      if (last && last.focus) last.focus();
    }
    function onKey(e) { if (e.key === "Escape") close(); else if (e.key === "Tab") { e.preventDefault(); ok.focus(); } }
    ok.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    ok.focus();
  }

  setTimeout(show, REMINDER_DELAY_MS); // once per page load; in memory only
})();
