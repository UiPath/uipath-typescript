/* =====================================================================
   Reimbursement · MainPage · Custom HTML control — JavaScript tab

   Talks to the app ONLY through these Text app variables:
     String_MainItemJson   IN   written by the MainPage Loaded workflow:
                                {"itemId","readOnly","currency","indirectFactor","itemData":{...},
                                 "events":[{"Generated Events","Category","Direct","Total"}],
                                 "discrepancies":[...],"categories":[...],"pagesToDelete",
                                 "initialVisitDate","user","runtime"}
     String_MainDraftJson  IN/OUT unsaved work, so "Refresh" (page reload) keeps table edits
     String_MainRequest    OUT  {"requestId","action","itemId","events":[...same shape as above],
                                 "visitDate","pagesToDelete","discrepancies":[...],"noIndirects",
                                 "approvalOption","reasons":{"Airfare":[],...},"rejectionReason","sentAt"}
                                action = goBack | refresh | saveForLater | approve | reject
     String_MainResult     IN   {"requestId","ok":false,"message"}   (only needed when something fails)
     Boolean_MainCollapsed OUT  True hides this panel (Container_Main) and shows the "Show details" strip
   ===================================================================== */
(function () {
  'use strict';

  const CFG = {
    VAR_ITEM: 'String_MainItemJson',
    VAR_DRAFT: 'String_MainDraftJson',
    VAR_REQUEST: 'String_MainRequest',
    VAR_RESULT: 'String_MainResult',
    VAR_COLLAPSED: 'Boolean_MainCollapsed',
    DEFAULT_CATEGORIES: ['Airfare', 'Total Mileage Cost', 'Meals', 'Parking', 'Lodging', 'Miscellaneous', 'Flat Fee for Participant'],
    DEFAULT_FACTOR: 1.3,
    DESC_MAX: 240,
    // 'live'    = every category is re-checked on every change (recommended)
    // 'touched' = like the old page: start from the automation's list, re-check only categories you change
    DISCREPANCY_MODE: 'live',
    APPROVAL_OPTIONS: ['Invoice with supporting documentation', 'Invoice Only'],
    CHANGE_REASONS: ['Receipt mismatch', 'Contract limit', 'Policy exception', 'Paid incorrectly', 'Other'],
    REJECTION_REASONS: ['Already processed', 'Not billable', 'Duplicate payment', 'Other'],
    // category -> key used in the "reasons" object (same labels as the old DiscrepanciesReason text)
    REASON_KEYS: { 'Airfare': 'Airfare', 'Meals': 'Meals', 'Flat Fee for Participant': 'FlatFeePart', 'Lodging': 'Lodging', 'Parking': 'Parking', 'Total Mileage Cost': 'MileageCost', 'Miscellaneous': 'Miscellaneous' },
    // wording used when a new event description is suggested
    DESC_LABELS: { 'Total Mileage Cost': 'Total Mileage Fee' },
    CLONE_MAX: 50,
    REQUEST_TIMEOUT_MS: 60000,
    DRAFT_DEBOUNCE_MS: 500
  };
  const BUSY_LABEL = { goBack: 'Going back…', refresh: 'Reloading…', saveForLater: 'Saving for later…', approve: 'Approving…', reject: 'Rejecting…' };

  /* ---------- icons ---------- */
  const ic = p => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const I = {
    edit: ic('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
    copy: ic('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
    clone: ic('<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/><path d="M19 15v6M16 18h6"/>'),
    trash: ic('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    undo: ic('<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
    check: ic('<path d="m5 12 5 5 9-10"/>'),
    x: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
    ok: ic('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'),
    warn: ic('<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>'),
    info: ic('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
    lock: ic('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    tick: '<svg class="i" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>',
    cross: '<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>'
  };

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const parse = raw => { if (raw == null || raw === '') return null; if (typeof raw !== 'string') return raw; try { return JSON.parse(raw); } catch (e) { return undefined; } };
  const pick = (o, ...ks) => { for (const k of ks) if (o && o[k] != null) return o[k]; return ''; };
  const n = v => { const x = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isFinite(x) ? x : 0; };
  const r2 = v => Math.round((v + Number.EPSILON) * 100) / 100;
  const cents = v => Math.round(r2(v) * 100);
  const fmtNum = (v, d = 2) => Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const money = v => S.cur + fmtNum(r2(v));
  const plural = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
  let seq = 0; const uid = () => 'e' + (++seq);

  /* ---------- state ---------- */
  const S = {
    loaded: false, error: null, itemId: '', readOnly: false, cur: '$', factor: CFG.DEFAULT_FACTOR, data: {},
    categories: CFG.DEFAULT_CATEGORIES.slice(), events: [], noIndirects: false, robotDisc: [], touched: new Set(),
    pages: '', visitDate: '', initialVisitDate: '', user: '', runtime: '', original: '', restored: false,
    edit: null, vdEdit: null, search: '', busy: null, inflight: null, modal: null, flash: null, lastDraft: ''
  };
  const factorEff = () => S.noIndirects ? 1 : S.factor;
  const rowTotal = e => r2(e.direct * factorEff());
  const toRow = e => ({ 'Generated Events': e.desc, 'Category': e.cat, 'Direct': money(e.direct), 'Total': money(rowTotal(e)) });

  /* ---------- pages to delete ---------- */
  function checkPages(raw) {
    const s = String(raw || '').replace(/\s+/g, '');
    if (!s) return { ok: true, norm: '', count: 0 };
    if (!/^\d+(-\d+)?(,\d+(-\d+)?)*$/.test(s)) return { ok: false, err: 'Use numbers, commas and ranges, e.g. 1,2,5-7' };
    const seen = new Set();
    for (const part of s.split(',')) {
      const [a, b] = part.split('-').map(Number); const hi = b === undefined ? a : b;
      if (a < 1) return { ok: false, err: 'Page numbers start at 1' };
      if (hi < a) return { ok: false, err: `Range ${part} goes backwards` };
      for (let p = a; p <= hi && p - a < 5000; p++) seen.add(p);
    }
    return { ok: true, norm: s, count: seen.size };
  }
  const normPages = raw => { const c = checkPages(raw); return c.ok ? c.norm : String(raw || '').trim(); };

  /* ---------- RPPA, totals, discrepancies (all live) ---------- */
  const milesZero = d => r2(n(d.Miles)) === 0;
  const RPPA = {
    'Airfare': d => n(d.Airfare),
    'Meals': d => n(d.Meals),
    'Total Mileage Cost': d => milesZero(d) ? n(d.FlatFeeForMileage) : r2(n(d.Miles) * n(d.CentsPerMile)),
    'Parking': d => n(d.Parking),
    'Lodging': d => n(d.Lodging),
    'Miscellaneous': d => n(d.Miscellaneous),
    'Flat Fee for Participant': d => n(d.FlatFeeForParticipant)
  };
  function catSums() { const m = {}; S.events.forEach(e => { m[e.cat] = (m[e.cat] || 0) + e.direct; }); return m; }
  function liveMismatch() {
    const sums = catSums();
    return S.categories.filter(c => RPPA[c] && cents(sums[c] || 0) !== cents(RPPA[c](S.data)));
  }
  function discList() {
    const live = liveMismatch();
    const extra = S.robotDisc.filter(c => !RPPA[c]);      // flags the page cannot recompute are kept as-is
    let set;
    if (CFG.DISCREPANCY_MODE === 'touched') {
      set = new Set(S.robotDisc.filter(c => RPPA[c] && !S.touched.has(c)));
      live.forEach(c => { if (S.touched.has(c)) set.add(c); });
    } else set = new Set(live);
    return S.categories.filter(c => set.has(c)).concat(extra);
  }
  function totals() {
    const d = S.data, f = factorEff();
    const mileageCost = r2(n(d.Miles) * n(d.CentsPerMile));
    const rppaDirect = r2(n(d.Airfare) + mileageCost + n(d.Parking) + n(d.Lodging) + n(d.Meals) + n(d.FlatFeeForParticipant) + n(d.Miscellaneous) + n(d.FlatFeeForMileage));
    const oracleDirect = r2(S.events.reduce((a, e) => a + e.direct, 0));
    const oracleTotal = r2(S.events.reduce((a, e) => a + rowTotal(e), 0));
    return { rppaDirect, rppaTotal: r2(rppaDirect * f), oracleDirect, oracleTotal };
  }

  /* ---------- validation ---------- */
  function parseAmount(t) {
    let s = String(t == null ? '' : t).trim();
    if (S.cur && s.startsWith(S.cur)) s = s.slice(S.cur.length).trim();
    if (!s) return { err: 'Amount is required' };
    if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d{1,2})?$/.test(s)) return { err: 'Numbers only, max 2 decimals (e.g. 164.73)' };
    const v = Number(s.replace(/,/g, ''));
    if (!(v > 0)) return { err: 'Amount must be greater than 0' };
    if (v >= 1e7) return { err: 'Amount is too large' };
    return { v: r2(v) };
  }
  function validate(d) {
    const errors = {}, desc = d.desc.trim();
    if (!desc) errors.desc = 'Description is required';
    else if (desc.length > CFG.DESC_MAX) errors.desc = `Max ${CFG.DESC_MAX} characters`;
    if (!d.cat) errors.cat = 'Choose a category';
    else if (!S.categories.includes(d.cat)) errors.cat = 'Unknown category';
    const a = parseAmount(d.directText);
    if (a.err) errors.direct = a.err;
    return { errors, amount: a.v };
  }
  function rowIssues(e) {
    const is = [];
    if (!e.desc.trim()) is.push('no description');
    if (e.desc.length > CFG.DESC_MAX) is.push(`description longer than ${CFG.DESC_MAX} characters`);
    if (!S.categories.includes(e.cat)) is.push('unknown category');
    if (!(e.direct > 0)) is.push('amount must be greater than 0');
    return is;
  }
  function autoDesc(cat) {
    const d = S.data, label = CFG.DESC_LABELS[cat] || cat;
    return ['Travel', d.SubjectStudyID, label, d.VisitNumberDesc, S.visitDate].map(x => String(x == null ? '' : x).trim()).filter(Boolean).join(', ');
  }

  /* ---------- dirty + draft ---------- */
  function snapshot() { return JSON.stringify({ ev: S.events.map(e => [e.desc, e.cat, cents(e.direct)]), vd: S.visitDate, pg: normPages(S.pages), ni: S.noIndirects }); }
  const isDirty = () => S.loaded && snapshot() !== S.original;
  let draftTimer;
  function scheduleDraft() { clearTimeout(draftTimer); draftTimer = setTimeout(flushDraft, CFG.DRAFT_DEBOUNCE_MS); }
  // The draft also feeds the "Show details" strip (dirty flag + discrepancy count) and, when the panel
  // is collapsed, remembers scroll position and search in case UiPath reloads the hidden control.
  function flushDraft(opts) {
    opts = opts || {};
    clearTimeout(draftTimer);
    if (!S.loaded) return Promise.resolve();
    const dirty = !S.readOnly && isDirty();
    let d = '';
    if (dirty || opts.collapse) {
      const o = { itemId: S.itemId, dirty, discrepancies: discList().length, savedAt: new Date().toISOString() };
      if (!S.readOnly) Object.assign(o, { events: S.events.map(e => ({ desc: e.desc, cat: e.cat, direct: e.direct })), visitDate: S.visitDate, pagesToDelete: S.pages, noIndirects: S.noIndirects });
      if (opts.collapse) Object.assign(o, { silent: true, ui: { scroll: $('#mp-body').scrollTop, search: S.search } });
      d = JSON.stringify(o);
    }
    if (d === S.lastDraft) return Promise.resolve();
    S.lastDraft = d;
    return Promise.resolve().then(() => App.setVariable(CFG.VAR_DRAFT, d)).catch(() => {});
  }
  function changed() { render(); scheduleDraft(); }

  /* ---------- rendering ---------- */
  function render() {
    const focus = captureFocus();
    renderHead(); renderBanner(); renderInfo(); renderKpis(); renderRecon(); renderEvents(); renderFoot();
    $('#mp-progress').hidden = !S.busy;
    restoreFocus(focus);
  }
  function captureFocus() {
    const a = document.activeElement; if (!a || a === document.body) return null;
    const sel = a.dataset && a.dataset.ed ? `[data-ed="${a.dataset.ed}"]` : a.id ? '#' + a.id : null;
    return sel ? { sel, start: a.selectionStart, end: a.selectionEnd } : null;
  }
  function restoreFocus(f) {
    if (!f) return; const el = $(f.sel); if (!el || el === document.activeElement) return;
    el.focus({ preventScroll: true });
    try { if (f.start != null) el.setSelectionRange(f.start, f.end); } catch (e) { /* select */ }
  }

  function renderHead() {
    const d = S.data;
    $('#mp-title').textContent = S.loaded ? `Item - ${[d.Project, d.SubjectStudyID, d.StudyDate, d.RSSNumber].filter(Boolean).join(', ')}` : (S.error ? 'Item could not be loaded' : 'Loading item…');
    let f = '';
    if (S.loaded && isDirty()) f += '<span class="mp-flag mp-flag--dirty">Unsaved changes</span>';
    if (S.readOnly) f += '<span class="mp-flag mp-flag--ro">Read-only</span>';
    if (S.runtime) f += `<span class="mp-flag mp-flag--env" data-env="${esc(S.runtime)}">${esc(S.runtime)}</span>`;
    $('#mp-flags').innerHTML = f;
    $('#mp-back').disabled = !!S.busy;
    $('#mp-refresh').disabled = !!S.busy;
    $('#mp-collapse').disabled = !!S.busy;
    $('#mp-refresh').classList.toggle('is-spinning', !!(S.busy && S.busy.action === 'refresh'));
  }

  function renderBanner() {
    let h = '';
    if (S.readOnly) h += `<div class="mp-banner mp-banner--ro">${I.lock}<span>Opened read-only. You can look around, but nothing on this page can be changed or saved.</span></div>`;
    if (S.restored && isDirty()) h += `<div class="mp-banner mp-banner--draft">${I.info}<span>Your unsaved changes to this item were restored after the page reloaded.</span><button class="mp-btn mp-btn--outline mp-btn--sm" data-banner="discard">Discard them</button></div>`;
    $('#mp-banner').innerHTML = h;
  }

  function skel(w) { return `<div class="mp-skel" style="width:${w}px"></div>`; }
  function card(title, body, right) { return `<div class="mp-card-head"><h2>${title}</h2>${right ? `<div class="right">${right}</div>` : ''}</div>${body}`; }
  function dl(rows) { return `<dl class="mp-dl">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>`; }
  const val = v => (v == null || String(v).trim() === '') ? '<span style="color:var(--text-3)">—</span>' : esc(v);

  function renderInfo() {
    if (!S.loaded) {
      const sk = dl([1, 2, 3, 4].map(() => [' ', skel(90 + Math.round(Math.random() * 60))]));
      $('#mp-study').innerHTML = card('Study information', sk); $('#mp-contract').innerHTML = card('Contract information', sk); $('#mp-audit').innerHTML = card('Audit', sk); return;
    }
    const d = S.data;
    let vd;
    if (S.vdEdit) {
      vd = `<span class="mp-vd"><input id="mp-vd-in" value="${esc(S.vdEdit.text)}" aria-label="New visit date" autocomplete="off">
        <button class="mp-btn mp-btn--primary mp-btn--sm" data-vd="apply">${I.check}Apply</button>
        <button class="mp-btn mp-btn--ghost mp-btn--sm" data-vd="cancel">Cancel</button>
        <span class="err" id="mp-vd-err">${esc(S.vdEdit.err || '')}</span></span>`;
    } else {
      const changedVd = S.visitDate !== S.initialVisitDate;
      vd = `<span class="mp-vd"><b>${val(S.visitDate)}</b>
        ${S.readOnly ? '' : `<button class="mp-ibtn" data-vd="edit" title="Edit visit date" aria-label="Edit visit date">${I.edit}</button>`}
        ${!S.readOnly && changedVd ? `<button class="mp-ibtn" data-vd="revert" title="Revert to ${esc(S.initialVisitDate)}" aria-label="Revert visit date">${I.undo}</button>` : ''}
        ${changedVd ? `<span class="was">was ${esc(S.initialVisitDate)}</span>` : ''}</span>`;
    }
    $('#mp-study').innerHTML = card('Study information', dl([
      ['Project', val(d.Project)], ['Subject Study ID', val(d.SubjectStudyID)], ['Visit Number/Description', val(d.VisitNumberDesc)],
      ['Visit Date(s)', vd], ['Study Date', val(d.StudyDate)]]));
    const mail = d.EmailContact ? `<a href="mailto:${esc(d.EmailContact)}">${esc(d.EmailContact)}</a>` : val('');
    $('#mp-contract').innerHTML = card('Contract information', dl([
      ['Award Type', val(d.AwardType)], ['Contract Start Date', val(d.ContractStartDate)], ['Contract End Date', val(d.ContractEndDate)], ['Email Contact', mail]]));
    $('#mp-audit').innerHTML = card('Audit', dl([['Updated Person', val(d.UpdatedPerson)], ['Processed Date', val(d.ProcessedDate)]]));
  }

  function renderKpis() {
    if (!S.loaded) { $('#mp-kpis').innerHTML = [1, 2, 3, 4].map(() => `<div class="mp-kpi"><div class="lbl">&nbsp;</div><div class="val">${skel(110)}</div></div>`).join(''); return; }
    const t = totals(), disc = discList(), ok = disc.length === 0;
    const fLabel = S.noIndirects ? 'No indirects applied' : `Includes indirects (× ${S.factor})`;
    $('#mp-kpis').innerHTML = `
      <div class="mp-kpi"><div class="lbl">RPPA Direct</div><div class="val num">${money(t.rppaDirect)}</div><div class="hint">Sum of the RPPA categories</div></div>
      <div class="mp-kpi"><div class="lbl">RPPA Total</div><div class="val num">${money(t.rppaTotal)}</div><div class="hint">${fLabel}</div></div>
      <div class="mp-kpi ${ok ? 'mp-kpi--ok' : 'mp-kpi--bad'}"><div class="lbl">Oracle Direct</div><div class="val num">${money(t.oracleDirect)}</div><div class="hint">${plural(S.events.length, 'event')}</div></div>
      <div class="mp-kpi ${ok ? 'mp-kpi--ok' : 'mp-kpi--bad'}"><div class="lbl">Oracle Total</div><div class="val num">${money(t.oracleTotal)}</div><div class="hint">${fLabel}</div></div>
      <div class="mp-kpi mp-kpi--side">
        ${ok ? `<span class="mp-status mp-status--ok">${I.ok}No discrepancies</span>` : `<span class="mp-status mp-status--bad">${I.warn}${plural(disc.length, 'discrepancy').replace('discrepancys', 'discrepancies')}: ${esc(disc.join(', '))}</span>`}
        <label class="mp-switch"><input type="checkbox" id="mp-ni"${S.noIndirects ? ' checked' : ''}${S.readOnly || S.busy ? ' disabled' : ''}> No indirects</label>
      </div>`;
  }

  function renderRecon() {
    if (!S.loaded) { $('#mp-recon').innerHTML = card('RPPA vs Oracle', `<div style="padding:14px">${skel(420)}</div>`); return; }
    const d = S.data, sums = catSums(), f = factorEff(), disc = new Set(discList()), t = totals();
    const rows = S.categories.map(c => {
      const rp = RPPA[c] ? r2(RPPA[c](d)) : 0, or = r2(sums[c] || 0), diff = r2(or - rp);
      const bad = disc.has(c), empty = rp === 0 && or === 0;
      let sub = '';
      if (c === 'Total Mileage Cost') sub = milesZero(d) ? 'Flat fee for mileage' : `${fmtNum(n(d.Miles))} mi × ${S.cur}${fmtNum(n(d.CentsPerMile), 3)}/mi`;
      if (c === 'Miscellaneous') sub = String(d.MiscellaneousDescription || '').trim() || 'No description';
      return `<tr class="${bad ? 'is-disc' : ''}${empty && !bad ? ' muted' : ''}">
        <td><b>${esc(c)}</b>${sub ? `<span class="mp-sub2">${esc(sub)}</span>` : ''}</td>
        <td class="r num">${money(rp)}</td><td class="r num">${money(or)}</td>
        <td class="r num"><span class="mp-diff${cents(diff) !== 0 ? ' mp-diff--bad' : ''}">${cents(diff) === 0 ? '—' : (diff > 0 ? '+' : '−') + money(Math.abs(diff))}</span></td>
        <td class="r num">${money(rp * f)}</td><td class="r num">${money(r2(S.events.filter(e => e.cat === c).reduce((a, e) => a + rowTotal(e), 0)))}</td>
        <td class="c">${bad ? `<span class="mp-bad" title="Discrepancy">${I.cross}</span>` : `<span class="mp-ok" title="Matches">${I.tick}</span>`}</td></tr>`;
    }).join('');
    const unknown = S.events.filter(e => !S.categories.includes(e.cat));
    const extraFlags = discList().filter(c => !RPPA[c]);
    const note = (unknown.length ? `<div class="mp-note warn" style="margin:10px 14px">${plural(unknown.length, 'event')} with an unknown category are not included in the category comparison.</div>` : '')
      + (extraFlags.length ? `<div class="mp-note warn" style="margin:10px 14px">Also flagged by the automation: ${esc(extraFlags.join(', '))}</div>` : '');
    const tdiff = r2(t.oracleDirect - t.rppaDirect);
    $('#mp-recon').innerHTML = card('RPPA vs Oracle by category', `
      <div class="mp-tablewrap"><table class="mp-table">
        <thead><tr><th>Category</th><th class="r">RPPA direct</th><th class="r">Oracle direct</th><th class="r">Difference</th><th class="r">RPPA total</th><th class="r">Oracle total</th><th class="c">Match</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td>Total</td><td class="r num">${money(t.rppaDirect)}</td><td class="r num">${money(t.oracleDirect)}</td>
          <td class="r num"><span class="mp-diff${cents(tdiff) !== 0 ? ' mp-diff--bad' : ''}">${cents(tdiff) === 0 ? '—' : (tdiff > 0 ? '+' : '−') + money(Math.abs(tdiff))}</span></td>
          <td class="r num">${money(t.rppaTotal)}</td><td class="r num">${money(t.oracleTotal)}</td>
          <td class="c">${disc.size ? `<span class="mp-bad">${I.cross}</span>` : `<span class="mp-ok">${I.tick}</span>`}</td></tr></tfoot>
      </table></div>${note}`,
      `<span class="mp-sub2">${CFG.DISCREPANCY_MODE === 'live' ? 'Checked live on every change' : 'Checked when a category changes'}</span>`);
  }

  function editorRow(ed, index) {
    const dr = ed.draft;
    return `<tr class="is-editing${ed.isNew ? ' is-new' : ''}" data-uid="${ed.uid}">
      <td class="mp-idx">${ed.isNew ? '+' : index + 1}</td>
      <td><input class="mp-in" data-ed="desc" value="${esc(dr.desc)}" placeholder="e.g. Travel, 5004001, Lodging, Cycle 2, 11/17/2025" maxlength="1000" aria-label="Generated event">
        <div style="display:flex;justify-content:space-between;gap:8px"><span class="mp-fe" data-err="desc"></span><span class="mp-cc" data-cc>0/${CFG.DESC_MAX}</span></div></td>
      <td><select class="mp-in" data-ed="cat" aria-label="Category"><option value="">Choose…</option>${S.categories.map(c => `<option${c === dr.cat ? ' selected' : ''}>${esc(c)}</option>`).join('')}${dr.cat && !S.categories.includes(dr.cat) ? `<option selected>${esc(dr.cat)}</option>` : ''}</select>
        <div class="mp-fe" data-err="cat"></div></td>
      <td class="r"><input class="mp-in num" data-ed="direct" value="${esc(dr.directText)}" inputmode="decimal" placeholder="0.00" style="width:120px;text-align:right" aria-label="Direct amount">
        <div class="mp-fe" data-err="direct"></div></td>
      <td class="r num" data-ed-total>—</td>
      <td class="mp-acts"><div class="mp-edit-acts">
        <button class="mp-btn mp-btn--ghost mp-btn--sm" data-ed-cancel>Cancel</button>
        <button class="mp-btn mp-btn--primary mp-btn--sm" data-ed-save>${I.check}${ed.isNew ? 'Add' : 'Save'}</button></div></td></tr>`;
  }

  function renderEvents() {
    const body = $('#mp-ev-body'), foot = $('#mp-ev-foot');
    $('#mp-add').disabled = !S.loaded || S.readOnly || !!S.busy;
    $('#mp-add').hidden = S.readOnly;
    $('#mp-ev-count').textContent = S.events.length;
    if (!S.loaded) { body.innerHTML = [1, 2, 3].map(() => `<tr><td>${skel(14)}</td><td>${skel(280)}</td><td>${skel(90)}</td><td class="r">${skel(60)}</td><td class="r">${skel(60)}</td><td></td></tr>`).join(''); foot.innerHTML = ''; return; }
    const q = S.search.trim().toLowerCase();
    const canAct = !S.readOnly && !S.busy;
    const rows = S.events.map((e, i) => {
      if (S.edit && !S.edit.isNew && S.edit.uid === e.uid) return editorRow(S.edit, i);
      if (q && ![e.desc, e.cat, money(e.direct)].some(x => String(x).toLowerCase().includes(q))) return '';
      const issues = rowIssues(e);
      return `<tr data-uid="${e.uid}" class="${issues.length ? 'is-invalid' : ''}${S.flash === e.uid ? ' flash' : ''}"${issues.length ? ` title="Line ${i + 1}: ${esc(issues.join(', '))}"` : ''}>
        <td class="mp-idx">${i + 1}</td>
        <td class="mp-desc">${esc(e.desc) || '<span style="color:var(--red)">(no description)</span>'}${issues.length ? ` <span style="color:var(--red);font-size:11.5px;font-weight:700">· ${esc(issues[0])}</span>` : ''}</td>
        <td class="mp-cat"><span class="mp-pill">${esc(e.cat || '—')}</span></td>
        <td class="r num">${money(e.direct)}</td>
        <td class="r num">${money(rowTotal(e))}</td>
        <td class="mp-acts">${canAct ? `<span class="wrap">
          <button class="mp-ibtn" data-act="edit" title="Edit" aria-label="Edit line ${i + 1}">${I.edit}</button>
          <button class="mp-ibtn" data-act="dup" title="Duplicate (1 copy below)" aria-label="Duplicate line ${i + 1}">${I.copy}</button>
          <button class="mp-ibtn" data-act="clone" title="Clone… (several copies)" aria-label="Clone line ${i + 1}">${I.clone}</button>
          <button class="mp-ibtn mp-ibtn--danger" data-act="del" title="Delete" aria-label="Delete line ${i + 1}">${I.trash}</button></span>` : ''}</td></tr>`;
    }).join('');
    const newRow = S.edit && S.edit.isNew ? editorRow(S.edit, S.events.length) : '';
    const empty = !S.events.length && !newRow ? `<tr class="mp-empty-row"><td colspan="6">No Oracle events yet.${S.readOnly ? '' : ' Use <b>Add event</b> to create one.'}</td></tr>` : '';
    const noMatch = S.events.length && q && !rows.trim() && !newRow ? `<tr class="mp-empty-row"><td colspan="6">No events match “${esc(S.search)}”.</td></tr>` : '';
    body.innerHTML = rows + newRow + empty + noMatch;
    const t = totals();
    foot.innerHTML = S.events.length ? `<tr><td></td><td>Total</td><td></td><td class="r num">${money(t.oracleDirect)}</td><td class="r num">${money(t.oracleTotal)}</td><td></td></tr>` : '';
    if (S.edit) updateEditUI();
    if (S.flash) { const f = S.flash; setTimeout(() => { if (S.flash === f) S.flash = null; }, 1300); }
  }

  function renderFoot() {
    const inp = $('#mp-pages-in');
    if (document.activeElement !== inp && inp.value !== S.pages) inp.value = S.pages;
    inp.disabled = !S.loaded || S.readOnly || !!S.busy;
    const pc = checkPages(S.pages), msg = $('#mp-pages-msg');
    inp.classList.toggle('bad', !pc.ok);
    msg.classList.toggle('bad', !pc.ok);
    msg.textContent = !S.loaded ? '' : !pc.ok ? pc.err : pc.count ? `${plural(pc.count, 'page')} will be deleted after approval` : 'No pages will be deleted';
    const off = !S.loaded || S.readOnly || !!S.busy;
    ['#mp-approve', '#mp-save', '#mp-reject'].forEach(s => { $(s).disabled = off; });
    $('#mp-busy').hidden = !S.busy;
    $('#mp-busy-text').textContent = S.busy ? S.busy.label : '';
  }

  /* ---------- row editing ---------- */
  function startEdit(uidv) {
    if (S.edit && S.edit.uid !== uidv && !commitEdit()) return;
    const e = S.events.find(x => x.uid === uidv); if (!e) return;
    S.edit = { uid: e.uid, isNew: false, tried: false, draft: { desc: e.desc, cat: e.cat, directText: e.direct ? e.direct.toFixed(2) : '' } };
    render(); const el = $('[data-ed="desc"]'); if (el) el.focus();
  }
  function startNew() {
    if (S.edit && !commitEdit()) return;
    S.search = ''; $('#mp-ev-search').value = '';
    S.edit = { uid: 'new', isNew: true, tried: false, autoDesc: '', draft: { desc: '', cat: '', directText: '' } };
    render();
    const el = $('[data-ed="cat"]'); if (el) { el.focus(); el.closest('tr').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }
  function cancelEdit() { S.edit = null; render(); }
  function commitEdit() {
    const ed = S.edit; if (!ed) return true;
    const v = validate(ed.draft); ed.tried = true;
    if (Object.keys(v.errors).length) { updateEditUI(); const bad = $(`[data-ed="${Object.keys(v.errors)[0]}"]`); if (bad) bad.focus(); return false; }
    const rec = { desc: ed.draft.desc.trim(), cat: ed.draft.cat, direct: v.amount };
    if (ed.isNew) { const e = Object.assign({ uid: uid() }, rec); S.events.push(e); S.touched.add(e.cat); S.flash = e.uid; toast('success', 'Event added', `${e.cat} · ${money(e.direct)}`); }
    else {
      const e = S.events.find(x => x.uid === ed.uid);
      if (e) { S.touched.add(e.cat); Object.assign(e, rec); S.touched.add(e.cat); S.flash = e.uid; }
    }
    S.edit = null; changed(); return true;
  }
  function onEditInput(t) {
    const ed = S.edit; if (!ed) return;
    const k = t.dataset.ed;
    if (k === 'desc') ed.draft.desc = t.value;
    if (k === 'direct') ed.draft.directText = t.value;
    if (k === 'cat') {
      ed.draft.cat = t.value;
      if (ed.isNew && (!ed.draft.desc.trim() || ed.draft.desc === ed.autoDesc)) {
        ed.autoDesc = t.value ? autoDesc(t.value) : ''; ed.draft.desc = ed.autoDesc;
        const di = $('[data-ed="desc"]'); if (di) di.value = ed.draft.desc;
      }
    }
    updateEditUI();
  }
  function updateEditUI() {
    const ed = S.edit; if (!ed) return;
    const tr = $(`tr[data-uid="${ed.uid}"]`); if (!tr) return;
    const v = validate(ed.draft), len = ed.draft.desc.trim().length;
    const cc = tr.querySelector('[data-cc]'); cc.textContent = `${len}/${CFG.DESC_MAX}`; cc.classList.toggle('bad', len > CFG.DESC_MAX);
    ['desc', 'cat', 'direct'].forEach(k => {
      const live = (k === 'desc' && len > CFG.DESC_MAX) || (k === 'direct' && ed.draft.directText.trim() !== '');
      const msg = (ed.tried || live) ? (v.errors[k] || '') : '';
      tr.querySelector(`[data-err="${k}"]`).textContent = msg;
      tr.querySelector(`[data-ed="${k}"]`).classList.toggle('bad', !!msg);
    });
    tr.querySelector('[data-ed-total]').textContent = v.amount ? money(r2(v.amount * factorEff())) : '—';
  }

  function rowAction(act, uidv) {
    if (S.edit && !commitEdit()) { toast('warn', 'Finish the row you are editing', 'Save or cancel it first.'); return; }
    const i = S.events.findIndex(x => x.uid === uidv); if (i < 0) return;
    const e = S.events[i];
    if (act === 'edit') return startEdit(uidv);
    if (act === 'dup') {
      const c = Object.assign({}, e, { uid: uid() }); S.events.splice(i + 1, 0, c); S.touched.add(e.cat); S.flash = c.uid;
      toast('success', 'Row duplicated', `Line ${i + 2} is a copy of line ${i + 1}.`); return changed();
    }
    if (act === 'clone') return openModal({ type: 'clone', uid: uidv, count: '2' });
    if (act === 'del') {
      S.events.splice(i, 1); S.touched.add(e.cat); changed();
      toast('info', `Line ${i + 1} deleted`, e.desc.length > 70 ? e.desc.slice(0, 70) + '…' : e.desc, { label: 'Undo', fn: () => { S.events.splice(Math.min(i, S.events.length), 0, e); S.flash = e.uid; changed(); } });
    }
  }

  /* ---------- visit date ---------- */
  function replaceVisitDate(oldV, newV) {
    let count = 0;
    if (oldV && oldV !== newV) S.events.forEach(e => { if (e.desc.includes(oldV)) { e.desc = e.desc.split(oldV).join(newV); count++; } });
    if (S.edit && oldV && S.edit.draft.desc.includes(oldV)) S.edit.draft.desc = S.edit.draft.desc.split(oldV).join(newV);
    S.visitDate = newV;
    return count;
  }
  function applyVisitDate() {
    const inp = $('#mp-vd-in'), v = (inp ? inp.value : '').trim();
    if (!v) { S.vdEdit.err = 'Enter a visit date'; $('#mp-vd-err').textContent = S.vdEdit.err; return; }
    const old = S.visitDate; S.vdEdit = null;
    if (v === old) return render();
    const c = replaceVisitDate(old, v);
    toast('success', 'Visit date updated', c ? `Also changed in ${plural(c, 'event description')}.` : 'No event descriptions contained the old date.');
    changed();
  }

  /* ---------- modals ---------- */
  function openModal(m) { S.modal = m; renderModal(); }
  function closeModal() { S.modal = null; renderModal(); }
  function modalValid() {
    const m = S.modal; if (!m) return false;
    if (m.type === 'approve') return !!m.option && m.required.every(c => (m.reasons[c] || []).length > 0);
    if (m.type === 'reject') return !!m.reason && (m.reason !== 'Other' || m.custom.trim().length > 0);
    if (m.type === 'clone') { const k = Number(m.count); return Number.isInteger(k) && k >= 1 && k <= CFG.CLONE_MAX; }
    return true;
  }
  function renderModal() {
    const box = $('#mp-modal'), m = S.modal;
    if (!m) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    let head = '', content = '', foot = '';
    if (m.type === 'approve') {
      const t = totals(), pc = checkPages(S.pages);
      head = `<h3>Approve item</h3><p>This updates Data Fabric, sends the item to Oracle and returns to the item list.</p>`;
      content = `<div class="mp-summary"><div><span>Oracle direct</span><b class="num">${money(t.oracleDirect)}</b></div><div><span>Oracle total</span><b class="num">${money(t.oracleTotal)}</b></div><div><span>Events</span><b>${S.events.length}</b></div></div>
        ${pc.count ? `<div class="mp-note">Pages to delete: <b>${esc(pc.norm)}</b> (${plural(pc.count, 'page')})</div>` : ''}
        <div class="mp-field"><span class="lbl">Approval option <span class="req">*</span></span>
          ${CFG.APPROVAL_OPTIONS.map(o => `<label class="mp-radio${m.option === o ? ' on' : ''}"><input type="radio" name="mp-opt" data-m-opt="${esc(o)}"${m.option === o ? ' checked' : ''}>${esc(o)}</label>`).join('')}</div>
        ${m.required.length ? `<div class="mp-field"><span class="lbl">Reason for each discrepancy <span class="req">*</span></span>
          ${m.required.map(c => { const sel = m.reasons[c] || []; return `<div class="mp-reason${sel.length ? '' : ' missing'}"><div class="h">${esc(c)}${sel.length ? '' : '<span>required</span>'}</div>
            <div class="mp-chips">${CFG.CHANGE_REASONS.map(r => `<button type="button" class="mp-chip${sel.includes(r) ? ' on' : ''}" data-m-reason="${esc(c)}" data-r="${esc(r)}">${esc(r)}</button>`).join('')}</div></div>`; }).join('')}</div>`
          : `<div class="mp-note">${I.ok} No discrepancies, so no reasons are needed.</div>`}`;
      foot = `<button class="mp-btn mp-btn--ghost" data-m="close">Cancel</button><button class="mp-btn mp-btn--primary" data-m="confirm"${modalValid() ? '' : ' disabled'}>${I.check}Approve</button>`;
    }
    if (m.type === 'reject') {
      head = `<h3>Reject item</h3><p>This marks the item as Rejected in Data Fabric and returns to the item list. Table changes are not saved.</p>`;
      content = `<div class="mp-field"><span class="lbl">Rejection reason <span class="req">*</span></span>
        ${CFG.REJECTION_REASONS.map(o => `<label class="mp-radio${m.reason === o ? ' on' : ''}"><input type="radio" name="mp-rej" data-m-rej="${esc(o)}"${m.reason === o ? ' checked' : ''}>${esc(o)}</label>`).join('')}</div>
        ${m.reason === 'Other' ? `<div class="mp-field"><span class="lbl">Custom reason <span class="req">*</span></span><textarea class="mp-textarea" id="mp-rej-custom" placeholder="Describe why the item is rejected">${esc(m.custom)}</textarea></div>` : ''}`;
      foot = `<button class="mp-btn mp-btn--ghost" data-m="close">Cancel</button><button class="mp-btn mp-btn--danger" data-m="confirm"${modalValid() ? '' : ' disabled'}>Reject</button>`;
    }
    if (m.type === 'clone') {
      const i = S.events.findIndex(x => x.uid === m.uid), e = S.events[i];
      if (!e) { S.modal = null; box.hidden = true; return; }
      head = `<h3>Clone line ${i + 1}</h3><p>Adds copies of this event right below it.</p>`;
      content = `<div class="mp-note" style="margin-bottom:12px"><b>${esc(e.cat)}</b> · ${money(e.direct)}<br>${esc(e.desc)}</div>
        <div class="mp-field"><span class="lbl">Number of copies (1–${CFG.CLONE_MAX}) <span class="req">*</span></span><input class="mp-numin num" id="mp-clone-n" type="number" min="1" max="${CFG.CLONE_MAX}" step="1" value="${esc(m.count)}"></div>`;
      foot = `<button class="mp-btn mp-btn--ghost" data-m="close">Cancel</button><button class="mp-btn mp-btn--primary" data-m="confirm"${modalValid() ? '' : ' disabled'}>${I.clone}Clone</button>`;
    }
    if (m.type === 'discard') {
      head = `<h3>Leave without saving?</h3><p>Your changes to this item will be lost. Nothing is written to Data Fabric.</p>`;
      content = `<div class="mp-note warn">Use <b>Save for later</b> if you want to keep your work.</div>`;
      foot = `<button class="mp-btn mp-btn--ghost" data-m="close">Stay on this page</button><button class="mp-btn mp-btn--danger" data-m="confirm">Discard and go back</button>`;
    }
    const oldContent = box.querySelector('.content'), scroll = oldContent ? oldContent.scrollTop : 0;
    const a = document.activeElement && box.contains(document.activeElement) ? document.activeElement : null;
    const keep = a ? { id: a.id, r: a.dataset.r, c: a.dataset.mReason, opt: a.dataset.mOpt, rej: a.dataset.mRej } : null;
    box.innerHTML = `<div class="mp-dialog" role="dialog" aria-modal="true"><header>${head}</header><div class="content">${content}</div><footer>${foot}</footer></div>`;
    box.querySelector('.content').scrollTop = scroll;
    if (!m._opened) {
      m._opened = true;
      const first = box.querySelector('#mp-clone-n, #mp-rej-custom, [data-m="close"]');
      if (first) { first.focus(); if (first.id === 'mp-clone-n') first.select(); }
    } else if (keep) {
      const el = [...box.querySelectorAll('button, input, textarea')].find(x =>
        (keep.r && x.dataset.r === keep.r && x.dataset.mReason === keep.c) || (keep.opt && x.dataset.mOpt === keep.opt) ||
        (keep.rej && x.dataset.mRej === keep.rej) || (keep.id && x.id === keep.id));
      if (el) el.focus({ preventScroll: true });
    }
  }
  function refreshModalButton() { const b = $('#mp-modal [data-m="confirm"]'); if (b) b.disabled = !modalValid(); }
  function confirmModal() {
    const m = S.modal; if (!m || !modalValid()) return;
    if (m.type === 'approve') {
      const reasons = {}; Object.values(CFG.REASON_KEYS).forEach(k => { reasons[k] = []; });
      m.required.forEach(c => { const k = CFG.REASON_KEYS[c]; if (k) reasons[k] = (m.reasons[c] || []).slice(); });
      closeModal(); send('approve', { approvalOption: m.option, reasons });
    } else if (m.type === 'reject') {
      closeModal(); send('reject', { rejectionReason: m.reason === 'Other' ? m.custom.trim() : m.reason });
    } else if (m.type === 'clone') {
      const k = Number(m.count), i = S.events.findIndex(x => x.uid === m.uid), e = S.events[i];
      closeModal(); if (!e) return;
      const copies = Array.from({ length: k }, () => Object.assign({}, e, { uid: uid() }));
      S.events.splice(i + 1, 0, ...copies); S.touched.add(e.cat); S.flash = copies[copies.length - 1].uid;
      toast('success', `${plural(k, 'copy').replace('copys', 'copies')} added`, `Lines ${i + 2}–${i + 1 + k} are copies of line ${i + 1}.`); changed();
    } else if (m.type === 'discard') { closeModal(); send('goBack'); }
  }

  /* ---------- top-level actions ---------- */
  function preflight(forApprove) {
    if (S.edit && !commitEdit()) { toast('warn', 'Finish the row you are editing', 'Save or cancel it first.'); return false; }
    if (S.vdEdit) { toast('warn', 'Finish editing the visit date', 'Apply or cancel it first.'); $('#mp-vd-in') && $('#mp-vd-in').focus(); return false; }
    const pc = checkPages(S.pages);
    if (!pc.ok) { toast('error', 'Pages to delete is not valid', pc.err); $('#mp-pages-in').focus(); return false; }
    if (forApprove) {
      const bad = S.events.map((e, i) => [i + 1, rowIssues(e)]).filter(x => x[1].length);
      if (bad.length) { toast('error', `${plural(bad.length, 'event')} need fixing before approval`, bad.slice(0, 4).map(([i, is]) => `Line ${i}: ${is.join(', ')}`).join(' · ')); return false; }
    }
    return true;
  }
  function onApprove() { if (!preflight(true)) return; openModal({ type: 'approve', option: '', required: discList().filter(c => CFG.REASON_KEYS[c]), reasons: {} }); }
  function onReject() { if (S.edit) { S.edit = null; render(); } openModal({ type: 'reject', reason: '', custom: '' }); }
  function onSave() { if (!preflight(false)) return; send('saveForLater'); }
  function onBack() { if (S.loaded && !S.readOnly && isDirty()) return openModal({ type: 'discard' }); send('goBack'); }
  function onRefresh() { if (S.edit && !commitEdit()) { toast('warn', 'Finish the row you are editing', 'Save or cancel it first, then reload.'); return; } send('refresh'); }

  function send(action, extra) {
    if (S.busy) return;
    const requestId = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const reasons = {}; Object.values(CFG.REASON_KEYS).forEach(k => { reasons[k] = []; });
    const req = Object.assign({
      requestId, action, itemId: S.itemId, events: S.events.map(toRow), visitDate: S.visitDate,
      pagesToDelete: normPages(S.pages), discrepancies: discList(), noIndirects: S.noIndirects,
      approvalOption: '', reasons, rejectionReason: '', sentAt: new Date().toISOString()
    }, extra || {});
    S.busy = { action, label: BUSY_LABEL[action] || 'Working…' };
    const timer = setTimeout(() => {
      if (S.inflight && S.inflight.requestId === requestId) { S.inflight = null; S.busy = null; toast('error', 'No response from the app', 'Nothing was changed. Please try again.'); render(); }
    }, CFG.REQUEST_TIMEOUT_MS);
    S.inflight = { requestId, action, timer };
    render();
    const pre = action === 'refresh' ? flushDraft() : Promise.resolve();
    pre.then(() => App.setVariable(CFG.VAR_REQUEST, JSON.stringify(req))).catch(err => {
      clearTimeout(timer); S.inflight = null; S.busy = null; toast('error', 'Action could not be sent', String((err && err.message) || err)); render();
    });
  }
  function onResult(raw) {
    const r = parse(raw);
    if (!r || !S.inflight || r.requestId !== S.inflight.requestId) return;
    clearTimeout(S.inflight.timer); S.inflight = null; S.busy = null;
    if (r.ok === false) toast('error', r.title || 'That did not work', r.message || 'Please try again.');
    else if (r.message) toast('info', r.title || 'Done', r.message);
    render();
  }

  /* ---------- toasts ---------- */
  function toast(type, title, msg, action) {
    const box = $('#mp-toasts'), el = document.createElement('div');
    el.className = `mp-toast mp-toast--${type}`;
    el.innerHTML = `<span class="ti">${{ success: I.ok, warn: I.warn, error: I.warn, info: I.info }[type]}</span>
      <div class="tb"><div class="tt">${esc(title)}</div>${msg ? `<div class="tm">${esc(msg)}</div>` : ''}${action ? `<div class="ta"><button class="mp-btn mp-btn--link mp-btn--sm">${esc(action.label)}</button></div>` : ''}</div>
      <button class="tx" aria-label="Dismiss">${I.x}</button>`;
    const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 200); };
    el.querySelector('.tx').onclick = close;
    if (action) el.querySelector('.ta button').onclick = () => { action.fn(); close(); };
    box.appendChild(el); setTimeout(close, type === 'error' || type === 'warn' ? 7000 : action ? 6000 : 3500);
  }

  /* ---------- loading ---------- */
  async function applyItem(raw) {
    if (raw == null || raw === '') { S.loaded = false; S.error = null; render(); return; }
    const it = parse(raw);
    if (!it || typeof it !== 'object') { S.loaded = false; S.error = 'Item data is not valid JSON'; render(); toast('error', 'Item could not be loaded', S.error); return; }
    S.itemId = String(it.itemId || '');
    S.readOnly = !!it.readOnly;
    S.cur = String(it.currency || '$');
    S.factor = Number(it.indirectFactor) > 1 ? Number(it.indirectFactor) : CFG.DEFAULT_FACTOR;
    S.data = it.itemData && typeof it.itemData === 'object' ? it.itemData : {};
    S.categories = (Array.isArray(it.categories) && it.categories.length ? it.categories : CFG.DEFAULT_CATEGORIES).map(String);
    const rows = Array.isArray(it.events) ? it.events : [];
    S.events = rows.map(r => ({ uid: uid(), desc: String(pick(r, 'Generated Events', 'GeneratedEvents', 'Description')), cat: String(pick(r, 'Category')).trim(), direct: r2(n(pick(r, 'Direct'))) }));
    // "No indirects" is not stored separately: every saved Total equal to its Direct means it was switched on
    S.noIndirects = rows.length > 0 && rows.every(r => n(pick(r, 'Direct')) > 0 && cents(n(pick(r, 'Total'))) === cents(n(pick(r, 'Direct'))));
    S.robotDisc = (Array.isArray(it.discrepancies) ? it.discrepancies : String(it.discrepancies || '').split(',')).map(x => String(x).trim()).filter(Boolean);
    S.pages = String(it.pagesToDelete || '');
    S.visitDate = String(S.data.VisitDate || '');
    S.initialVisitDate = String(it.initialVisitDate || S.visitDate);
    S.user = String(it.user || ''); S.runtime = String(it.runtime || '').trim().toUpperCase();
    S.original = snapshot(); S.touched = new Set(); S.edit = null; S.vdEdit = null; S.restored = false; S.lastDraft = '';
    S.loaded = true; S.error = null;
    let ui = null;
    try {
      const dr = parse(await App.getVariable(CFG.VAR_DRAFT));
      if (dr && typeof dr === 'object' && String(dr.itemId) === S.itemId) {
        if (!S.readOnly && Array.isArray(dr.events)) {
          S.events = dr.events.map(e => ({ uid: uid(), desc: String(e.desc || ''), cat: String(e.cat || ''), direct: r2(n(e.direct)) }));
          S.visitDate = String(dr.visitDate != null ? dr.visitDate : S.visitDate);
          S.pages = String(dr.pagesToDelete || '');
          S.noIndirects = !!dr.noIndirects;
          S.events.forEach(e => S.touched.add(e.cat)); rows.forEach(r => S.touched.add(String(pick(r, 'Category')).trim()));
          S.restored = !dr.silent && isDirty();     // silent = we only came back from "Hide details"
        }
        if (dr.silent) ui = dr.ui || {};
        S.lastDraft = null;                         // next save rewrites a normal draft
      }
    } catch (e) { /* no draft */ }
    $('#mp-pages-in').value = S.pages;
    if (ui && ui.search) { S.search = String(ui.search); $('#mp-ev-search').value = S.search; }
    render();
    if (ui) { $('#mp-body').scrollTop = Number(ui.scroll) || 0; flushDraft(); }
  }

  /* ---------- hide / show the details panel ---------- */
  function onCollapse() {
    if (S.busy) return;
    if (S.edit && !commitEdit()) { toast('warn', 'Finish the row you are editing', 'Save or cancel it first, then hide the details.'); return; }
    if (S.vdEdit) { toast('warn', 'Finish editing the visit date', 'Apply or cancel it first.'); return; }
    if (S.modal) closeModal();
    flushDraft({ collapse: true })
      .then(() => App.setVariable(CFG.VAR_COLLAPSED, true))
      .catch(err => toast('error', 'Could not hide the details', String((err && err.message) || err)));
  }
  function discardRestored() {
    const it = S._lastItemRaw; S.restored = false;
    Promise.resolve().then(() => App.setVariable(CFG.VAR_DRAFT, '')).catch(() => {}).then(() => applyItem(it));
  }

  /* ---------- wiring ---------- */
  function bind() {
    const root = $('#mp-root');
    root.addEventListener('click', e => {
      const t = e.target.closest('button, label.mp-radio'); if (!t) {
        if (e.target === $('#mp-modal')) closeModal();
        return;
      }
      const d = t.dataset;
      if (t.id === 'mp-back') return onBack();
      if (t.id === 'mp-refresh') return onRefresh();
      if (t.id === 'mp-collapse') return onCollapse();
      if (t.id === 'mp-add') return startNew();
      if (t.id === 'mp-approve') return onApprove();
      if (t.id === 'mp-save') return onSave();
      if (t.id === 'mp-reject') return onReject();
      if (d.act) { const tr = t.closest('tr[data-uid]'); if (tr) rowAction(d.act, tr.dataset.uid); return; }
      if ('edSave' in d) return commitEdit();
      if ('edCancel' in d) return cancelEdit();
      if (d.vd === 'edit') { if (S.edit && !commitEdit()) return; S.vdEdit = { text: S.visitDate, err: '' }; render(); const i = $('#mp-vd-in'); if (i) { i.focus(); i.select(); } return; }
      if (d.vd === 'cancel') { S.vdEdit = null; return render(); }
      if (d.vd === 'apply') return applyVisitDate();
      if (d.vd === 'revert') { const c = replaceVisitDate(S.visitDate, S.initialVisitDate); toast('success', 'Visit date reverted', c ? `Also changed back in ${plural(c, 'event description')}.` : ''); return changed(); }
      if (d.banner === 'discard') return discardRestored();
      if (d.m === 'close') return closeModal();
      if (d.m === 'confirm') return confirmModal();
      if (d.mReason && S.modal) { const c = d.mReason, r = d.r, cur = S.modal.reasons[c] || []; S.modal.reasons[c] = cur.includes(r) ? cur.filter(x => x !== r) : cur.concat(r); return renderModal(); }
    });
    root.addEventListener('change', e => {
      const t = e.target;
      if (t.id === 'mp-ni') { S.noIndirects = t.checked; return changed(); }
      if (t.dataset.mOpt && S.modal) { S.modal.option = t.dataset.mOpt; return renderModal(); }
      if (t.dataset.mRej && S.modal) { S.modal.reason = t.dataset.mRej; renderModal(); const ta = $('#mp-rej-custom'); if (ta) ta.focus(); return; }
      if (t.dataset.ed === 'cat') return onEditInput(t);
    });
    root.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.ed) return onEditInput(t);
      if (t.id === 'mp-ev-search') { S.search = t.value; return renderEvents(); }
      if (t.id === 'mp-pages-in') { S.pages = t.value; renderFoot(); renderHead(); scheduleDraft(); return; }
      if (t.id === 'mp-rej-custom' && S.modal) { S.modal.custom = t.value; return refreshModalButton(); }
      if (t.id === 'mp-clone-n' && S.modal) { S.modal.count = t.value; return refreshModalButton(); }
      if (t.id === 'mp-vd-in' && S.vdEdit) { S.vdEdit.text = t.value; if (S.vdEdit.err) { S.vdEdit.err = ''; $('#mp-vd-err').textContent = ''; } }
    });
    root.addEventListener('keydown', e => {
      const t = e.target;
      if (t.dataset && t.dataset.ed && t.tagName === 'INPUT') { if (e.key === 'Enter') { e.preventDefault(); commitEdit(); } if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); } return; }
      if (t.id === 'mp-vd-in') { if (e.key === 'Enter') { e.preventDefault(); applyVisitDate(); } if (e.key === 'Escape') { S.vdEdit = null; render(); } return; }
      if (t.id === 'mp-clone-n' && e.key === 'Enter') { e.preventDefault(); return confirmModal(); }
      if (e.key === 'Escape' && S.modal) { e.preventDefault(); closeModal(); }
    });
    $('#mp-pages-in').addEventListener('blur', () => { const pc = checkPages(S.pages); if (pc.ok && pc.norm !== S.pages) { S.pages = pc.norm; renderFoot(); scheduleDraft(); } });
  }

  async function init() {
    bind(); render();
    let got = false;
    App.onVariableChange(CFG.VAR_ITEM, v => { got = true; S._lastItemRaw = v; applyItem(v); });
    App.onVariableChange(CFG.VAR_RESULT, onResult);
    // panel shown again without being reloaded: turn the "collapse" draft back into a normal one
    App.onVariableChange(CFG.VAR_COLLAPSED, v => { if (v === false || String(v).toLowerCase() === 'false') { S.lastDraft = null; flushDraft(); } });
    try {
      const raw = await App.getVariable(CFG.VAR_ITEM);
      if (!got) { S._lastItemRaw = raw; await applyItem(raw); }
    } catch (e) { S.error = 'Could not read app variables: ' + ((e && e.message) || e); render(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
