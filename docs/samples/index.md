---
title: Template Gallery
hide:
  - toc
---

# Template Gallery

Browse, filter, and clone the official `@uipath/uipath-typescript` sample apps. Each card links to the source and copies a ready-to-run `degit` command.

<div class="tg" id="tg">
  <div class="tg-controls">
    <div class="tg-toprow">
      <div class="tg-row" id="tg-tabs" role="tablist" aria-label="Categories"></div>
      <label class="tg-search">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="9" cy="9" r="6"/><path d="M14 14l4 4" stroke-linecap="round"/></svg>
        <input id="tg-search" type="search" placeholder="Search apps…" aria-label="Search apps" />
      </label>
    </div>
    <div class="tg-row" id="tg-filters">
      <span class="tg-flabel">Filter</span>
      <span id="tg-fw"></span>
      <span id="tg-tags"></span>
    </div>
  </div>
  <div class="tg-meta">
    <span class="tg-count"><b id="tg-count-n">0</b> <span id="tg-count-w">apps</span></span>
    <button type="button" class="tg-clear" id="tg-clear" hidden>Clear filters</button>
  </div>
  <div class="tg-grid" id="tg-grid"></div>
  <div class="tg-empty" id="tg-empty" hidden>No apps match these filters.</div>
</div>
<div class="tg-toast" id="tg-toast" role="status" aria-live="polite"></div>

<style>
.tg, .tg *, .tg *::before, .tg *::after { box-sizing: border-box; }
.md-typeset .tg {
  --tg-accent: var(--md-primary-fg-color);
  --tg-on-accent: var(--md-primary-bg-color);
  --tg-ink: var(--md-default-fg-color);
  --tg-muted: var(--md-default-fg-color--light);
  --tg-hair: var(--md-default-fg-color--lightest);
  --tg-surface: color-mix(in srgb, var(--md-default-fg-color) 3%, var(--md-default-bg-color));
  --tg-surface-2: color-mix(in srgb, var(--md-default-fg-color) 6%, var(--md-default-bg-color));
  --tg-accent-soft: color-mix(in srgb, var(--md-primary-fg-color) 12%, transparent);
  --tg-mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;
  margin-top: 1.2rem;
}

/* controls */
.md-typeset .tg-controls { display: flex; flex-direction: column; gap: 0.7rem; padding-bottom: 1rem; border-bottom: 1px solid var(--tg-hair); }
.md-typeset .tg-toprow { display: grid; grid-template-columns: 1fr auto; align-items: start; gap: 0.7rem 1rem; }
.md-typeset #tg-tabs { min-width: 0; }
@media (max-width: 640px) { .md-typeset .tg-toprow { grid-template-columns: 1fr; } .md-typeset .tg-search { min-width: 0; } }
.md-typeset .tg-row { display: flex; flex-wrap: wrap; gap: 0.45rem; align-items: center; }
.md-typeset .tg-flabel { font-family: var(--tg-mono); font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--tg-muted); margin-right: 0.1rem; }
.md-typeset .tg-pill {
  font-size: 0.8rem; font-weight: 600; cursor: pointer; line-height: 1;
  padding: 0.42rem 0.8rem; border-radius: 999px; border: 1px solid var(--tg-hair);
  background: var(--tg-surface); color: var(--tg-ink); transition: all .14s ease;
  display: inline-flex; align-items: center; gap: 0.35rem;
}
.md-typeset .tg-pill:hover { border-color: var(--tg-accent); }
.md-typeset .tg-pill[aria-pressed="true"] { background: var(--tg-accent); border-color: var(--tg-accent); color: var(--tg-on-accent); }
.md-typeset .tg-pill .tg-cnt { font-family: var(--tg-mono); font-size: 0.7rem; opacity: 0.7; }
.md-typeset .tg-pill-sm { font-size: 0.74rem; padding: 0.32rem 0.65rem; }
.md-typeset .tg-search { display: flex; align-items: center; gap: 0.45rem; flex: 0 0 auto; background: var(--tg-surface); border: 1px solid var(--tg-hair); border-radius: 999px; padding: 0.38rem 0.85rem; min-width: 240px; }
.md-typeset .tg-search:focus-within { border-color: var(--tg-accent); }
.md-typeset .tg-search svg { width: 15px; height: 15px; color: var(--tg-muted); flex: none; }
.md-typeset .tg-search input { border: 0; background: transparent; color: var(--tg-ink); font: inherit; font-size: 0.85rem; width: 100%; outline: none; }

.md-typeset .tg-meta { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin: 1rem 0 1.2rem; color: var(--tg-muted); font-size: 0.82rem; }
.md-typeset .tg-count b { color: var(--tg-ink); }
.md-typeset .tg-clear { background: none; border: 0; color: var(--tg-accent); cursor: pointer; font: inherit; font-size: 0.8rem; font-weight: 600; padding: 0; }
.md-typeset .tg-clear:hover { text-decoration: underline; }

/* grid + cards */
.md-typeset .tg-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); }
.md-typeset .tg-card { display: flex; flex-direction: column; background: var(--tg-surface); border: 1px solid var(--tg-hair); border-radius: 12px; overflow: hidden; transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
.md-typeset .tg-card:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(0,0,0,.12); border-color: color-mix(in srgb, var(--md-default-fg-color) 18%, transparent); }
.md-typeset .tg-thumblink { display: block; position: relative; }
.md-typeset .tg-thumb { position: relative; aspect-ratio: 16 / 10; overflow: hidden; background: var(--tg-poster, linear-gradient(135deg,#888,#555)); display: grid; place-items: center; }
.md-typeset .tg-thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; opacity: 0; transition: opacity .4s ease; margin: 0; max-width: none; }
.md-typeset .tg-thumb img.tg-loaded { opacity: 1; }
.md-typeset .tg-glyph { font-family: var(--tg-mono); font-weight: 700; color: #fff; text-align: center; text-shadow: 0 2px 12px rgba(0,0,0,.25); padding: 1rem; }
.md-typeset .tg-glyph .g { font-size: 1.8rem; display: block; letter-spacing: -0.02em; }
.md-typeset .tg-glyph .s { font-size: 0.66rem; letter-spacing: 0.14em; opacity: 0.85; text-transform: uppercase; margin-top: 0.35rem; }
.md-typeset .tg-badge-fw { position: absolute; top: 0.6rem; right: 0.6rem; z-index: 2; font-family: var(--tg-mono); font-size: 0.62rem; font-weight: 600; padding: 0.24rem 0.5rem; border-radius: 999px; color: #fff; background: rgba(20,20,22,.55); border: 1px solid rgba(255,255,255,.18); }
.md-typeset .tg-badge-live { position: absolute; top: 0.6rem; left: 0.6rem; z-index: 2; font-family: var(--tg-mono); font-size: 0.58rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; padding: 0.22rem 0.45rem; border-radius: 999px; color: #fff; background: rgba(20,20,22,.5); display: flex; align-items: center; gap: 0.3rem; }
.md-typeset .tg-badge-live .blip { width: 6px; height: 6px; border-radius: 50%; background: #57e08a; }
.md-typeset .tg-body { padding: 0.9rem 1rem 1rem; display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
.md-typeset .tg-catline { font-family: var(--tg-mono); font-size: 0.64rem; letter-spacing: 0.1em; text-transform: uppercase; display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 700; color: var(--tg-muted); }
.md-typeset .tg-catline .sw { width: 9px; height: 9px; border-radius: 2px; }
.md-typeset .tg-titlelink { text-decoration: none; }
.md-typeset .tg-title { font-size: 1.02rem; font-weight: 700; margin: 0; line-height: 1.25; color: var(--tg-ink); letter-spacing: -0.01em; }
.md-typeset .tg-titlelink:hover .tg-title { color: var(--tg-accent); }
.md-typeset .tg-desc { font-size: 0.83rem; color: var(--tg-muted); margin: 0; flex: 1; line-height: 1.5; }
.md-typeset .tg-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem; margin-top: 0.3rem; padding-top: 0.7rem; border-top: 1px solid var(--tg-hair); }
.md-typeset .tg-clone { font: inherit; cursor: pointer; text-align: left; flex: none; display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.7rem; border-radius: 9px; border: 1px solid var(--tg-hair); background: var(--tg-surface-2); color: var(--tg-ink); }
.md-typeset .tg-clone:hover { border-color: var(--tg-accent); }
.md-typeset .tg-clone svg { flex: none; width: 15px; height: 15px; color: var(--tg-accent); }
.md-typeset .tg-clone .lbl { font-size: 0.76rem; font-weight: 700; }
.md-typeset .tg-clone.copied { border-color: var(--tg-accent); background: var(--tg-accent-soft); }
.md-typeset .tg-links { display: flex; align-items: center; gap: 0.5rem; font-size: 0.76rem; }
.md-typeset .tg-links a { color: var(--tg-muted); text-decoration: none; }
.md-typeset .tg-links a:hover { color: var(--tg-accent); }
.md-typeset .tg-links .tg-dot { color: var(--tg-muted); opacity: 0.6; }
/* suppress Material's auto external-link icon inside the gallery (we style our own) */
.md-typeset .tg a::after { display: none !important; }
.md-typeset .tg-links .path { font-family: var(--tg-mono); font-size: 0.66rem; margin-left: auto; }
.md-typeset .tg-empty { text-align: center; padding: 3rem 1rem; color: var(--tg-muted); }

.tg-toast { position: fixed; left: 50%; bottom: 1.3rem; z-index: 100; transform: translateX(-50%) translateY(18px); background: var(--md-default-fg-color); color: var(--md-default-bg-color); font-size: 0.83rem; font-weight: 600; padding: 0.6rem 1rem; border-radius: 999px; box-shadow: 0 12px 30px rgba(0,0,0,.3); opacity: 0; pointer-events: none; transition: opacity .22s ease, transform .22s ease; max-width: 90vw; display: flex; gap: 0.5rem; align-items: center; }
.tg-toast .mono { font-family: var(--tg-mono); font-size: 0.76rem; opacity: 0.85; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tg-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
@media (prefers-reduced-motion: reduce) { .md-typeset .tg-card, .tg-toast { transition: none; } }
</style>

<script type="application/json" id="tg-data">
{
  "repo": "https://github.com/UiPath/uipath-typescript",
  "assetsBaseUrl": "https://raw.githubusercontent.com/UiPath/uipath-typescript/main/",
  "categories": [
    { "id": "action-apps", "label": "Action Apps", "accent": ["#FA4616", "#FF8A4C"] },
    { "id": "agents", "label": "Agents", "accent": ["#7C5CFC", "#A78BFA"] },
    { "id": "dashboards", "label": "Dashboards", "accent": ["#0EA5A4", "#2DD4C4"] },
    { "id": "data-fabric", "label": "Data Fabric", "accent": ["#2563EB", "#5B8DEF"] },
    { "id": "document", "label": "Document / HITL", "accent": ["#0F9D6B", "#34D399"] },
    { "id": "process", "label": "Process Orchestration", "accent": ["#DB2777", "#F472B6"] }
  ],
  "apps": [
    { "id": "conversational-agent-app", "title": "Conversational Agent App", "description": "Interact with UiPath Conversational Agents — real-time streaming responses over WebSocket, conversation management, file attachments, tool-call visualization, and feedback.", "category": "agents", "framework": "React", "tags": ["Agents","Conversational","WebSocket","Streaming"], "path": "samples/conversational-agent-app", "preview": "samples/conversational-agent-app/screenshots/preview.gif" },
    { "id": "agent-runtime-compliance", "title": "Agent Runtime Compliance Dashboard", "description": "Dashboard showing how AI agents perform against UiPath runtime compliance checks — enforcement outcomes, failure reasons, agents ranked by failed checks, and per-run decision logs via the Agent Traces governance APIs.", "category": "dashboards", "framework": "React", "tags": ["Governance","Agent Traces","Analytics","Preview"], "path": "samples/dashboards/agent-runtime-compliance", "preview": "samples/dashboards/agent-runtime-compliance/screenshots/agent-runtime-compliance-dashboard.gif" },
    { "id": "data-fabric-app", "title": "Data Fabric Explorer", "description": "Browse and manage UiPath Data Fabric entities, records, and choice sets via the SDK. Deploys as a UiPath Coded App.", "category": "data-fabric", "framework": "React", "tags": ["Data Fabric","CRUD","Coded App"], "path": "samples/data-fabric-app", "preview": "samples/data-fabric-app/screenshots/preview.gif" },
    { "id": "data-fabric-app-angular", "title": "Data Fabric Explorer (Angular)", "description": "The Angular counterpart of the React Data Fabric sample. Renders its own records grid and calls the SDK's record CRUD methods directly, exercising a wider slice of the Entities service.", "category": "data-fabric", "framework": "Angular", "tags": ["Data Fabric","CRUD","Angular","Coded App"], "path": "samples/data-fabric-app-angular", "preview": "samples/data-fabric-app-angular/screenshots/preview.gif" },
    { "id": "document-validation-app", "title": "Document Validation Inbox", "description": "A human-in-the-loop document validation inbox on top of UiPath Action Center. Lists validation tasks grouped into Pending / Unassigned / Completed, renders the validation station, and lets a reviewer save, submit, or report an exception.", "category": "document", "framework": "React", "tags": ["Document Understanding","Action Center","HITL","OAuth / PKCE"], "path": "samples/document-validation-app", "preview": "samples/document-validation-app/screenshots/preview.gif" },
    { "id": "process-app-v0", "title": "Maestro Process Management", "description": "Manage UiPath Maestro processes and process instances with OAuth authentication. Uses the single-package import pattern.", "category": "process", "framework": "React", "tags": ["Maestro","Process Orchestration","OAuth"], "path": "samples/process-app-v0", "preview": "samples/process-app-v0/screenshots/preview.gif" },
    { "id": "process-app-v1", "title": "Maestro Process Management (Modular)", "description": "Manage Maestro processes and drill into a process instance's execution detail. Uses the recommended modular import pattern for smaller bundles and better performance.", "category": "process", "framework": "React", "tags": ["Maestro","Process Orchestration","Modular Import"], "path": "samples/process-app-v1", "preview": "samples/process-app-v1/screenshots/preview.gif" },
    { "id": "action-app-with-data-fabric-entity", "title": "Action App — Data Fabric Entity", "description": "Coded Action App for loan-application review backed by a Data Fabric entity. Fetch an applicant record by name, review details, view the bundled document, and write the decision back to the entity.", "category": "action-apps", "framework": "React", "tags": ["Action Center","Coded Action App","Data Fabric","File Attachments"], "path": "samples/coded-action-apps/action-app-with-data-fabric-entity", "preview": null },
    { "id": "action-app-with-document", "title": "Action App — Bundled Document", "description": "Coded Action App for loan-application review. Reviewers assess applicant details, view a bundled sample PDF, and complete the task with an Approve or Reject decision.", "category": "action-apps", "framework": "React", "tags": ["Action Center","Coded Action App","Documents"], "path": "samples/coded-action-apps/action-app-with-document", "preview": null },
    { "id": "action-app-with-file-attachment-document", "title": "Action App — File Attachment", "description": "Coded Action App for loan-application review with direct file attachments. Preview and download a directly attached PDF, as opposed to referencing files from Storage Buckets.", "category": "action-apps", "framework": "React", "tags": ["Action Center","Coded Action App","File Attachments","Documents"], "path": "samples/coded-action-apps/action-app-with-file-attachment-document", "preview": null },
    { "id": "action-app-with-image", "title": "Action App — Image", "description": "Coded Action App for loan-application review. Reviewers assess applicant details, view a bundled loan-application image, and complete the task with an Approve or Reject decision.", "category": "action-apps", "framework": "React", "tags": ["Action Center","Coded Action App","Images"], "path": "samples/coded-action-apps/action-app-with-image", "preview": null },
    { "id": "action-app-with-storage-bucket-document", "title": "Action App — Storage Bucket Document", "description": "Coded Action App for loan-application review that loads its document from a Storage Bucket by bucket name and file path, as opposed to receiving a direct file attachment.", "category": "action-apps", "framework": "React", "tags": ["Action Center","Coded Action App","Storage Buckets","Documents"], "path": "samples/coded-action-apps/action-app-with-storage-bucket-document", "preview": null }
  ]
}
</script>

<script>
(function () {
  "use strict";
  var root = document.getElementById("tg");
  if (!root || root.dataset.mounted) return;
  root.dataset.mounted = "1";
  var DATA = JSON.parse(document.getElementById("tg-data").textContent);
  var state = { cat: "all", fws: new Set(), tags: new Set(), q: "" };
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]; }); }
  function catById(id) { return (DATA.categories || []).find(function (c) { return c.id === id; }); }
  function poster(app) { var c = catById(app.category) || { accent: ["#888", "#555"] }; return "linear-gradient(135deg," + c.accent[0] + "," + c.accent[1] + ")"; }
  function monogram(app) { var c = catById(app.category); return (c ? c.label : app.title).split(/[\s/]+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase(); }
  function slug() { return (DATA.repo || "").replace(/^https?:\/\/github\.com\//, "").replace(/\/+$/, ""); }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise(function (res) { var ta = document.createElement("textarea"); ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} document.body.removeChild(ta); res(); });
  }
  var toastT;
  function toast(cmd) { var t = $("tg-toast"); t.innerHTML = "Copied <span class=\"mono\">" + esc(cmd) + "</span>"; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, 2600); }

  function matches(app) {
    if (state.cat !== "all" && app.category !== state.cat) return false;
    if (state.fws.size && !state.fws.has(app.framework)) return false;
    if (state.tags.size) { for (var t of state.tags) if ((app.tags || []).indexOf(t) === -1) return false; }
    if (state.q) { var hay = (app.title + " " + app.description + " " + (app.tags || []).join(" ") + " " + app.framework).toLowerCase(); if (hay.indexOf(state.q) === -1) return false; }
    return true;
  }
  function countIn(cat) { return DATA.apps.filter(function (a) { return cat === "all" || a.category === cat; }).length; }

  function renderTabs() {
    var cats = [{ id: "all", label: "All" }].concat(DATA.categories);
    $("tg-tabs").innerHTML = cats.map(function (c) {
      var on = state.cat === c.id;
      return '<button type="button" class="tg-pill" role="tab" aria-pressed="' + on + '" data-cat="' + c.id + '">' + esc(c.label) + ' <span class="tg-cnt">' + countIn(c.id) + "</span></button>";
    }).join("");
    $("tg-tabs").querySelectorAll("[data-cat]").forEach(function (b) { b.addEventListener("click", function () { state.cat = b.dataset.cat; render(); }); });
  }
  function renderFilters() {
    var fws = Array.from(new Set(DATA.apps.map(function (a) { return a.framework; }))).sort();
    $("tg-fw").innerHTML = fws.map(function (f) { return '<button type="button" class="tg-pill tg-pill-sm" aria-pressed="' + state.fws.has(f) + '" data-fw="' + esc(f) + '">' + esc(f) + "</button>"; }).join("");
    $("tg-fw").querySelectorAll("[data-fw]").forEach(function (b) { b.addEventListener("click", function () { var f = b.dataset.fw; state.fws.has(f) ? state.fws.delete(f) : state.fws.add(f); render(); }); });
    var counts = {}; DATA.apps.forEach(function (a) { (a.tags || []).forEach(function (t) { counts[t] = (counts[t] || 0) + 1; }); });
    var tags = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); });
    $("tg-tags").innerHTML = tags.map(function (t) { return '<button type="button" class="tg-pill tg-pill-sm" aria-pressed="' + state.tags.has(t) + '" data-tag="' + esc(t) + '">' + esc(t) + "</button>"; }).join("");
    $("tg-tags").querySelectorAll("[data-tag]").forEach(function (b) { b.addEventListener("click", function () { var t = b.dataset.tag; state.tags.has(t) ? state.tags.delete(t) : state.tags.add(t); render(); }); });
  }
  var COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
  function card(app) {
    var c = catById(app.category) || { label: app.category, accent: ["#888", "#555"] };
    var folder = app.path ? (DATA.repo + "/tree/main/" + app.path) : DATA.repo;
    var cloneCmd = "npx degit " + slug() + "/" + app.path + " " + app.id;
    var devUrl = "https://github.dev/" + slug() + "/tree/main/" + app.path;
    var csUrl = "https://codespaces.new/" + slug();
    var el = document.createElement("article");
    el.className = "tg-card";
    el.style.setProperty("--tg-poster", poster(app));
    var h = '<a class="tg-thumblink" href="' + esc(folder) + '" target="_blank" rel="noopener" aria-label="Open ' + esc(app.title) + ' on GitHub"><div class="tg-thumb">';
    h += '<span class="tg-badge-fw">' + esc(app.framework) + "</span>";
    if (app.preview) h += '<span class="tg-badge-live"><span class="blip"></span>Live preview</span>';
    h += '<div class="tg-glyph"><span class="g">' + esc(monogram(app)) + '</span><span class="s">' + esc(c.label) + "</span></div>";
    if (app.preview) h += '<img alt="' + esc(app.title) + ' preview" loading="lazy" src="' + esc((DATA.assetsBaseUrl || "") + app.preview) + '" />';
    h += "</div></a>";
    h += '<div class="tg-body">';
    h += '<span class="tg-catline"><span class="sw" style="background:' + c.accent[0] + '"></span>' + esc(c.label) + "</span>";
    h += '<a class="tg-titlelink" href="' + esc(folder) + '" target="_blank" rel="noopener"><span class="tg-title">' + esc(app.title) + "</span></a>";
    h += '<p class="tg-desc">' + esc(app.description) + "</p>";
    h += '<div class="tg-foot">';
    h += '<button type="button" class="tg-clone" data-clone="' + esc(cloneCmd) + '" title="Copy: ' + esc(cloneCmd) + '">' + COPY + '<span class="lbl">Clone</span></button>';
    h += '<div class="tg-links"><a href="' + esc(devUrl) + '" target="_blank" rel="noopener">github.dev</a><span class="tg-dot">·</span><a href="' + esc(csUrl) + '" target="_blank" rel="noopener">Codespace</a></div>';
    h += "</div>";
    el.innerHTML = h;
    var img = el.querySelector("img");
    if (img) img.addEventListener("load", function () { img.classList.add("tg-loaded"); });
    var clone = el.querySelector(".tg-clone");
    clone.addEventListener("click", function () { copyText(clone.getAttribute("data-clone")).then(function () { clone.classList.add("copied"); var l = clone.querySelector(".lbl"); var p = l.textContent; l.textContent = "Copied!"; toast(clone.getAttribute("data-clone")); setTimeout(function () { clone.classList.remove("copied"); l.textContent = p; }, 1600); }); });
    return el;
  }
  function renderGrid() {
    var list = DATA.apps.filter(matches);
    var g = $("tg-grid"); g.innerHTML = "";
    list.forEach(function (a) { g.appendChild(card(a)); });
    $("tg-count-n").textContent = list.length;
    $("tg-count-w").textContent = list.length === 1 ? "app" : "apps";
    $("tg-empty").hidden = list.length !== 0;
    $("tg-clear").hidden = !(state.cat !== "all" || state.fws.size || state.tags.size || state.q);
  }
  function render() { renderTabs(); renderFilters(); renderGrid(); }
  $("tg-search").addEventListener("input", function (e) { state.q = e.target.value.trim().toLowerCase(); renderGrid(); });
  $("tg-clear").addEventListener("click", function () { state.cat = "all"; state.fws.clear(); state.tags.clear(); state.q = ""; $("tg-search").value = ""; render(); });
  render();
})();
</script>
