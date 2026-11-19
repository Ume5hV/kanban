/* =====================================================================
   IT ASSISTANT HOOK: text-based RAG chatbot, bottom-right avatar widget
   Source of truth for the block inlined at the end of index.html, dc.html
   and devops.html (single-file constraint: no external resources, no
   storage APIs). Self-contained: injects its own CSS and DOM.
   - Click the avatar: the panel opens and speaks the greeting (Web Speech API).
   - RAG: retrieve (BM25-style scoring) over a small knowledge base plus the
     live board tasks (global `state.tasks`), then compose an answer from the
     top passages and cite sources. Runs entirely in the browser.
   ===================================================================== */
(function () {
  "use strict";
  var GREETING = "I am your IT assistant, how can i help you?";

  /* ---------- knowledge base (retrieval corpus) ---------- */
  var KB = [
    { id: "KB-meeting", title: "IT meeting", text: "There is an IT meeting next Wednesday at 10am in room 888. Please attend." },
    { id: "KB-add", title: "Adding a task", text: "To add a task click the Add Task button, fill in the title, description, project, category, assignee, priority, due date and status, then press Add Task. The card appears at once and an email notification is sent." },
    { id: "KB-move", title: "Moving a task", text: "Drag a card to another column, or use the Move select on the card, which also works with the keyboard. Columns are Backlog, In Progress, Blocked and Done." },
    { id: "KB-delete", title: "Deleting a task", text: "Press the delete icon on a card, then choose Yes in the inline Delete confirmation. Choose No to cancel." },
    { id: "KB-filter", title: "Filtering tasks", text: "Use the filter controls at the top of the board to filter cards by project and priority. The summary shows counts." },
    { id: "KB-status", title: "Statuses", text: "Backlog means not started. In Progress means being worked on. Blocked means waiting on a dependency or decision. Done means complete." },
    { id: "KB-priority", title: "Priorities", text: "Priority is shown by a coloured left border and a text pill, for example High, Medium and Low, so it does not rely on colour alone." },
    { id: "KB-overdue", title: "Overdue tasks", text: "A task is overdue when it is not Done and its due date is before today. Overdue cards are highlighted." },
    { id: "KB-notify", title: "Email notification", text: "When a task is added an email notification is sent through FormSubmit. If it fails or the send limit is reached the card is still kept locally and a warning toast appears. Sends are limited to one every 15 seconds." },
    { id: "KB-data", title: "Data persistence", text: "Data is kept in memory only. Refreshing the page resets the board to the sample data. Nothing is stored in the browser." },
    { id: "KB-access", title: "Accessibility", text: "The board supports keyboard use, screen readers with a live toast region, visible focus rings and a Move select as an alternative to drag and drop." }
  ];

  var STOP = {};
  "a an the is are was were be to of in on at for and or it this that how do i can what who which when where me my with by from as about there any please tell show".split(" ").forEach(function (w) { STOP[w] = 1; });

  function tokens(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9\-]+/g, " ").split(" ").filter(function (w) { return w && !STOP[w]; })
      .map(function (w) { return w.length > 3 ? w.replace(/(ing|ed|es|s)$/, "") : w; });
  }

  function boardDocs() {
    var out = [];
    try {
      if (typeof state !== "undefined" && state && state.tasks) {
        state.tasks.forEach(function (t) {
          out.push({
            id: t.id, title: t.title, task: t,
            text: [t.id, t.title, t.description, "project " + t.project, "category " + t.category, "assignee " + t.assignee,
                   "priority " + t.priority, "status " + t.status, "due " + t.dueDate].join(". ")
          });
        });
      }
    } catch (e) { /* board not available: KB only */ }
    return out;
  }

  /* ---------- retrieval: BM25-style ---------- */
  function retrieve(query, k) {
    var docs = KB.concat(boardDocs());
    var q = tokens(query);
    if (!q.length) return [];
    var N = docs.length, df = {}, lens = 0;
    var tf = docs.map(function (d) {
      var t = tokens(d.title + " " + d.text), m = {};
      t.forEach(function (w) { m[w] = (m[w] || 0) + 1; });
      Object.keys(m).forEach(function (w) { df[w] = (df[w] || 0) + 1; });
      lens += t.length; return { m: m, len: t.length };
    });
    var avg = lens / N || 1;
    var scored = docs.map(function (d, i) {
      var s = 0;
      q.forEach(function (w) {
        var f = tf[i].m[w] || 0; if (!f) return;
        var idf = Math.log(1 + (N - df[w] + 0.5) / (df[w] + 0.5));
        s += idf * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * tf[i].len / avg));
      });
      return { doc: d, score: s };
    }).filter(function (x) { return x.score > 0; });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, k || 3);
  }

  /* ---------- generation: compose answer from retrieved passages ---------- */
  function describeTask(t) {
    return t.id + " \"" + t.title + "\" (" + t.status + ", " + t.priority + " priority, " + t.assignee + ", due " + t.dueDate + ")";
  }

  function answer(query) {
    var q = String(query).toLowerCase();
    var tasks = (typeof state !== "undefined" && state && state.tasks) ? state.tasks : [];
    if (/^(hi|hello|hey)\b/.test(q)) return { text: "Hello! Ask me about the board, tasks, or the next IT meeting.", src: [] };
    if (/how many|count|total|number of/.test(q) && tasks.length) {
      var by = {}; tasks.forEach(function (t) { by[t.status] = (by[t.status] || 0) + 1; });
      var parts = Object.keys(by).map(function (s) { return by[s] + " " + s; });
      return { text: "There are " + tasks.length + " tasks: " + parts.join(", ") + ".", src: ["Board"] };
    }
    var sm = q.match(/backlog|in progress|blocked|done|overdue/);
    if (sm && tasks.length && /task|card|list|show|which|what|any|\?$/.test(q) && !/how (do|to|can)/.test(q)) {
      var st = sm[0], today = new Date().toISOString().slice(0, 10);
      var m = tasks.filter(function (t) { return st === "overdue" ? (t.status !== "Done" && t.dueDate < today) : t.status.toLowerCase() === st; });
      if (m.length) return { text: m.length + " " + st + " task(s): " + m.map(describeTask).join("; ") + ".", src: m.map(function (t) { return t.id; }) };
    }
    var hits = retrieve(query, 2);
    if (!hits.length) return { text: "Sorry, I could not find anything about that. Try asking about tasks, statuses, the IT meeting, or how to add, move or delete a card.", src: [] };
    var lines = [], src = [];
    hits.forEach(function (h) {
      src.push(h.doc.id);
      lines.push(h.doc.task ? describeTask(h.doc.task) : h.doc.text);
    });
    var taskHits = hits.filter(function (h) { return h.doc.task; });
    var text = taskHits.length === hits.length ? "Here is what I found: " + lines.join("; ") + "." : lines[0] + (lines.length > 1 ? " Related: " + lines.slice(1).join(" ") : "");
    return { text: text, src: src };
  }

  /* ---------- voice ---------- */
  var muted = false;
  function speak(text) {
    if (muted || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US"; u.rate = 1; u.pitch = 1.15;
      window.speechSynthesis.speak(u);
    } catch (e) { /* voice unsupported: text greeting still shown */ }
  }

  /* ---------- UI ---------- */
  var css = [
    ".cb-root{--cb-bg:#ffffff;--cb-fg:#1b2430;--cb-muted:#5a6676;--cb-line:#d6dde6;--cb-brand:#1f6feb;--cb-brand-fg:#ffffff;--cb-bot:#eef3fb;--cb-shadow:0 8px 28px rgba(15,30,60,.25);position:fixed;right:16px;bottom:16px;z-index:900;font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--cb-fg)}",
    "@media (prefers-color-scheme:dark){.cb-root{--cb-bg:#1a2230;--cb-fg:#e8edf4;--cb-muted:#9aa7b8;--cb-line:#33405a;--cb-brand:#4b8df8;--cb-brand-fg:#0b1220;--cb-bot:#253047;--cb-shadow:0 8px 28px rgba(0,0,0,.55)}}",
    ".cb-fab{width:64px;height:64px;border-radius:50%;border:3px solid var(--cb-bg);background:var(--cb-brand);padding:0;cursor:pointer;box-shadow:var(--cb-shadow);display:block;animation:cb-bob 3s ease-in-out infinite}",
    ".cb-fab:hover{transform:scale(1.06)}",
    ".cb-fab:focus-visible,.cb-btn:focus-visible,.cb-input:focus-visible{outline:3px solid var(--cb-fg);outline-offset:2px}",
    ".cb-fab svg{width:100%;height:100%;display:block}",
    ".cb-eye{animation:cb-blink 4s infinite;transform-origin:center;transform-box:fill-box}",
    "@keyframes cb-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}",
    "@keyframes cb-blink{0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}",
    "@media (prefers-reduced-motion:reduce){.cb-fab,.cb-eye{animation:none}}",
    ".cb-panel{position:absolute;right:0;bottom:76px;width:min(340px,calc(100vw - 32px));height:min(440px,calc(100vh - 120px));background:var(--cb-bg);border:1px solid var(--cb-line);border-radius:16px;box-shadow:var(--cb-shadow);display:flex;flex-direction:column;overflow:hidden}",
    ".cb-panel[hidden]{display:none}",
    ".cb-head{display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--cb-brand);color:var(--cb-brand-fg)}",
    ".cb-head strong{flex:1;font-size:15px}",
    ".cb-btn{background:transparent;border:1px solid currentColor;color:inherit;border-radius:8px;padding:4px 8px;cursor:pointer;font:inherit;font-size:12px}",
    ".cb-log{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}",
    ".cb-msg{max-width:85%;padding:8px 10px;border-radius:12px;word-wrap:break-word;white-space:pre-wrap}",
    ".cb-bot{background:var(--cb-bot);align-self:flex-start;border-bottom-left-radius:4px}",
    ".cb-user{background:var(--cb-brand);color:var(--cb-brand-fg);align-self:flex-end;border-bottom-right-radius:4px}",
    ".cb-src{display:block;margin-top:4px;font-size:11px;color:var(--cb-muted)}",
    ".cb-form{display:flex;gap:6px;padding:10px;border-top:1px solid var(--cb-line)}",
    ".cb-input{flex:1;min-width:0;padding:8px 10px;border:1px solid var(--cb-line);border-radius:10px;background:var(--cb-bg);color:var(--cb-fg);font:inherit}",
    ".cb-send{background:var(--cb-brand);color:var(--cb-brand-fg);border-color:var(--cb-brand);padding:8px 12px;font-size:14px}",
    ".toasts{bottom:96px}",
    ".cb-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}"
  ].join("\n");

  var AVATAR = '<svg viewBox="0 0 64 64" role="img" aria-hidden="true" focusable="false">' +
    '<line x1="32" y1="9" x2="32" y2="15" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>' +
    '<circle cx="32" cy="8" r="3.5" fill="#ffd166"/>' +
    '<rect x="11" y="15" width="42" height="34" rx="15" fill="#fff"/>' +
    '<rect x="6" y="27" width="5" height="10" rx="2.5" fill="#ffd166"/><rect x="53" y="27" width="5" height="10" rx="2.5" fill="#ffd166"/>' +
    '<rect x="16" y="22" width="32" height="20" rx="10" fill="#243b6b"/>' +
    '<ellipse class="cb-eye" cx="25" cy="31" rx="3.2" ry="4" fill="#7ee0ff"/><ellipse class="cb-eye" cx="39" cy="31" rx="3.2" ry="4" fill="#7ee0ff"/>' +
    '<circle cx="19.5" cy="37" r="2.4" fill="#ff9eb5" opacity=".8"/><circle cx="44.5" cy="37" r="2.4" fill="#ff9eb5" opacity=".8"/>' +
    '<path d="M28 38 Q32 42 36 38" fill="none" stroke="#7ee0ff" stroke-width="2" stroke-linecap="round"/>' +
    '<rect x="22" y="50" width="20" height="9" rx="4.5" fill="#fff" opacity=".9"/></svg>';

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

  function init() {
    if (document.getElementById("cbRoot")) return;
    var style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);

    var root = el("div", "cb-root"); root.id = "cbRoot";
    var panel = el("section", "cb-panel"); panel.id = "cbPanel"; panel.hidden = true;
    panel.setAttribute("aria-label", "IT assistant chat");
    var head = el("div", "cb-head"); head.appendChild(el("strong", "", "IT Assistant"));
    var mute = el("button", "cb-btn", "Voice on"); mute.type = "button"; mute.setAttribute("aria-pressed", "false"); mute.setAttribute("aria-label", "Toggle assistant voice");
    var close = el("button", "cb-btn", "Close"); close.type = "button"; close.setAttribute("aria-label", "Close IT assistant chat");
    head.appendChild(mute); head.appendChild(close);
    var log = el("div", "cb-log"); log.setAttribute("role", "log"); log.setAttribute("aria-live", "polite");
    var form = el("form", "cb-form");
    var label = el("label", "cb-sr", "Ask the IT assistant"); label.htmlFor = "cbInput";
    var input = el("input", "cb-input"); input.id = "cbInput"; input.type = "text"; input.maxLength = 200; input.autocomplete = "off"; input.placeholder = "Ask about tasks or the board…";
    var send = el("button", "cb-btn cb-send", "Send"); send.type = "submit";
    form.appendChild(label); form.appendChild(input); form.appendChild(send);
    panel.appendChild(head); panel.appendChild(log); panel.appendChild(form);

    var fab = el("button", "cb-fab"); fab.type = "button"; fab.id = "cbFab";
    fab.setAttribute("aria-label", "Open IT assistant chat"); fab.setAttribute("aria-expanded", "false"); fab.setAttribute("aria-controls", "cbPanel");
    fab.innerHTML = AVATAR; // static trusted markup, no user data
    root.appendChild(panel); root.appendChild(fab); document.body.appendChild(root);

    function add(text, who, src) {
      var m = el("div", "cb-msg " + (who === "user" ? "cb-user" : "cb-bot"), text);
      if (src && src.length) m.appendChild(el("span", "cb-src", "Sources: " + src.join(", ")));
      log.appendChild(m); log.scrollTop = log.scrollHeight; return m;
    }
    function open() {
      panel.hidden = false; fab.setAttribute("aria-expanded", "true"); fab.setAttribute("aria-label", "Close IT assistant chat");
      if (!log.childNodes.length) add(GREETING, "bot");
      speak(GREETING); // click is the user gesture browsers require for speech
      input.focus();
    }
    function shut() {
      panel.hidden = true; fab.setAttribute("aria-expanded", "false"); fab.setAttribute("aria-label", "Open IT assistant chat");
      try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
      fab.focus();
    }
    fab.addEventListener("click", function () { if (panel.hidden) open(); else shut(); });
    close.addEventListener("click", shut);
    mute.addEventListener("click", function () {
      muted = !muted; mute.textContent = muted ? "Voice off" : "Voice on"; mute.setAttribute("aria-pressed", String(muted));
      if (muted) { try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
    });
    root.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) shut(); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = input.value.trim(); if (!q) return;
      add(q, "user"); input.value = "";
      var a = answer(q); add(a.text, "bot", a.src);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
