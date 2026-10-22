/* =====================================================================
   Reimbursement · ItemSelectionPage · Custom HTML control — JavaScript tab

   Talks to the app ONLY through these Text app variables:
     String_UserContextJson  IN   {"displayName","isAdmin","runtime","users":[...]}
     String_ItemsJson        IN   [{"Id","ProjectNumber","StudyID","StudyDate","RSSNumber",
                                   "Status","AssignedTo","LastUpdatedBy"}, ...]
     String_ActionRequest    OUT  {"requestId","action","ids":[...],"assignee","readOnly",
                                   "label","status","assignedTo","sentAt"}
                                  action = "assign" | "unassign" | "open" | "refresh"
     String_ActionResult     IN   {"requestId","action","assignee","ok":[ids],
                                   "failed":[{"id","reason","assignedTo"}]}
   ===================================================================== */
(function () {
  'use strict';

  const CFG = {
    VAR_ITEMS: 'String_ItemsJson',
    VAR_CONTEXT: 'String_UserContextJson',
    VAR_ACTION: 'String_ActionRequest',
    VAR_RESULT: 'String_ActionResult',
    UNASSIGNED: ['', '-', 'null', 'unassigned'],        // " - " is trimmed to "-"
    ACTIVE: ['to be processed', 'in progress'],
    STATUS_ORDER: ['To be processed', 'In Progress', 'Approved', 'Rejected'],
    PAGE_SIZES: [25, 50, 100],
    REQUEST_TIMEOUT_MS: 45000
  };

  const COLS = [
    { key: 'ProjectNumber', label: 'Project Number', type: 'text' },
    { key: 'StudyID',       label: 'Study ID',       type: 'text' },
    { key: 'StudyDate',     label: 'Study Date',     type: 'date' },
    { key: 'RSSNumber',     label: 'RSS Number',     type: 'text' },
    { key: 'Status',        label: 'Status',         type: 'enum' },
    { key: 'AssignedTo',    label: 'Assigned To',    type: 'enum' },
    { key: 'LastUpdatedBy', label: 'Last Updated By', type: 'enum', cls: 'c-lub' }
  ];
  const COLMAP = Object.fromEntries(COLS.map(c => [c.key, c]));
  const OPS = {
    text: [['contains', 'contains'], ['eq', 'equals'], ['starts', 'starts with'], ['ncontains', 'does not contain']],
    enum: [['is', 'is'], ['isnot', 'is not']],
    date: [['on', 'is on'], ['before', 'is before'], ['after', 'is after']]
  };

  /* ---------- icons ---------- */
  const ic = p => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const I = {
    user: ic('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
    inbox: ic('<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5.5 5h13L21 13v6H3v-6z"/>'),
    layers: ic('<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>'),
    open: ic('<path d="M7 17 17 7"/><path d="M9 7h8v8"/>'),
    eye: ic('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    userPlus: ic('<circle cx="9" cy="8" r="4"/><path d="M2 21c1.3-3.8 4-6 7-6s5.7 2.2 7 6"/><path d="M19 8v6M16 11h6"/>'),
    userMinus: ic('<circle cx="9" cy="8" r="4"/><path d="M2 21c1.3-3.8 4-6 7-6s5.7 2.2 7 6"/><path d="M16 11h6"/>'),
    x: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
    plus: ic('<path d="M12 5v14M5 12h14"/>'),
    left: ic('<path d="m15 6-6 6 6 6"/>'),
    right: ic('<path d="m9 6 6 6-6 6"/>'),
    up: '<svg class="i up" viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg>',
    dn: '<svg class="i dn" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
    ok: ic('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'),
    warn: ic('<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>'),
    info: ic('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
    search: ic('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    refresh: ic('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>')
  };

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = v => String(v == null ? '' : v).trim().toLowerCase();
  const parse = raw => { if (raw == null || raw === '') return null; if (typeof raw !== 'string') return raw; try { return JSON.parse(raw); } catch (e) { return undefined; } };
  const pick = (o, ...ks) => { for (const k of ks) if (o[k] != null) return o[k]; return ''; };
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const dateKey = s => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(s).trim()); return m ? (+m[3]) * 10000 + (+m[1]) * 100 + (+m[2]) : 0; };
  const isoKey = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? (+m[1]) * 10000 + (+m[2]) * 100 + (+m[3]) : 0; };
  const isoToUs = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? `${m[2]}/${m[3]}/${m[1]}` : s; };
  const initials = n => { const p = String(n).trim().split(/\s+/); return (p.length > 1 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2)).toUpperCase(); };
  const AV = ['#3b5b92', '#2f7d62', '#7a4f95', '#9a6127', '#2d7a8a', '#6a6f2a', '#8f3f5a'];
  const avColor = n => { let h = 0; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AV[h % AV.length]; };
  const ago = t => { if (!t) return ''; const s = Math.round((Date.now() - t) / 1000); if (s < 45) return 'just now'; const m = Math.round(s / 60); if (m < 60) return `${m} min ago`; return `${Math.round(m / 60)} h ago`; };

  /* ---------- state ---------- */
  const S = {
    items: [], byId: new Map(), me: '', isAdmin: false, runtime: '', users: [],
    view: 'mine', search: '', statuses: new Set(), filters: [], sort: { key: null, dir: 1 },
    page: 1, pageSize: 25, selected: new Set(), pending: new Set(), inflight: new Map(),
    loading: true, refreshing: false, error: null, loadedAt: 0, filterOpen: false, assignTarget: '', list: []
  };
  let fid = 0;

  const isUnassigned = it => CFG.UNASSIGNED.includes(norm(it.AssignedTo));
  const isMine = it => !!S.me && norm(it.AssignedTo) === norm(S.me);
  const isActive = it => CFG.ACTIVE.includes(norm(it.Status));
  const canAssign = it => S.isAdmin ? isActive(it) : (isActive(it) && isUnassigned(it));
  const canUnassign = it => isActive(it) && !isUnassigned(it) && (S.isAdmin || isMine(it));
  const getVal = (it, k) => k === 'AssignedTo' ? (isUnassigned(it) ? 'Unassigned' : it.AssignedTo) : it[k];

  const VIEWS = {
    mine:       { label: 'My items',   icon: I.user,   test: it => isMine(it) && isActive(it) },
    unassigned: { label: 'Unassigned', icon: I.inbox,  test: it => isUnassigned(it) && isActive(it) },
    all:        { label: 'All items',  icon: I.layers, test: () => true }
  };

  function normalize(r) {
    return {
      Id: String(pick(r, 'Id', 'id', 'ID')),
      ProjectNumber: String(pick(r, 'ProjectNumber', 'Project Number')).trim(),
      StudyID: String(pick(r, 'StudyID', 'Study ID', ' Study ID')).trim(),
      StudyDate: String(pick(r, 'StudyDate', 'Study Date')).trim(),
      RSSNumber: String(pick(r, 'RSSNumber', 'RSS Number')).trim(),
      Status: String(pick(r, 'Status')).trim(),
      AssignedTo: String(pick(r, 'AssignedTo', 'Assigned To')).trim(),
      LastUpdatedBy: String(pick(r, 'LastUpdatedBy', 'Last Updated By')).trim()
    };
  }
  function upsert(it) {
    const i = S.items.findIndex(x => x.Id === it.Id);
    if (i >= 0) S.items[i] = it; else S.items.push(it);
    S.byId.set(it.Id, it);
  }
  function patch(id, fields) { const it = S.byId.get(String(id)); if (it) Object.assign(it, fields); }

  /* ---------- data pipeline (all in the browser = instant) ---------- */
  const filterDone = f => f.col && f.op && String(f.val).trim() !== '';
  const hasNarrowing = () => !!(S.search.trim() || S.statuses.size || S.filters.some(filterDone));

  function matchFilter(it, f) {
    const col = COLMAP[f.col], v = getVal(it, f.col);
    if (col.type === 'date') {
      const a = dateKey(v), b = isoKey(f.val); if (!a || !b) return false;
      return f.op === 'on' ? a === b : f.op === 'before' ? a < b : a > b;
    }
    const a = norm(v), b = norm(f.val);
    switch (f.op) {
      case 'contains': return a.includes(b);
      case 'ncontains': return !a.includes(b);
      case 'starts': return a.startsWith(b);
      case 'eq': case 'is': return a === b;
      case 'isnot': return a !== b;
    }
    return true;
  }
  function narrow(list, skipStatus) {
    const q = norm(S.search), fs = S.filters.filter(filterDone);
    return list.filter(it => {
      if (!skipStatus && S.statuses.size && !S.statuses.has(it.Status)) return false;
      if (q && !COLS.some(c => norm(getVal(it, c.key)).includes(q))) return false;
      return fs.every(f => matchFilter(it, f));
    });
  }
  const statusRank = s => { const i = CFG.STATUS_ORDER.indexOf(s); return i < 0 ? 99 : i; };
  function sortList(list) {
    const { key, dir } = S.sort; if (!key) return list;
    const t = COLMAP[key].type;
    return list.slice().sort((x, y) => {
      const a = getVal(x, key), b = getVal(y, key);
      if (t === 'date') return (dateKey(a) - dateKey(b)) * dir;
      if (key === 'Status') return (statusRank(a) - statusRank(b)) * dir;
      return collator.compare(a, b) * dir;
    });
  }
  function distinct(key) {
    if (key === 'Status') { const have = new Set(S.items.map(i => i.Status)); return CFG.STATUS_ORDER.filter(s => have.has(s)).concat([...have].filter(s => s && !CFG.STATUS_ORDER.includes(s))); }
    const set = new Set(S.items.map(i => getVal(i, key)).filter(Boolean));
    const arr = [...set].sort(collator.compare);
    if (key === 'AssignedTo' && set.has('Unassigned')) return ['Unassigned'].concat(arr.filter(x => x !== 'Unassigned'));
    return arr;
  }

  /* ---------- rendering ---------- */
  function render(opts = {}) {
    renderHead(); renderTabs(); if (opts.panel !== false) renderFilterPanel();
    renderSubbar(); renderTable(); renderSelbar(); renderFooter();
    $('#mq-progress').hidden = !(S.refreshing || S.inflight.size || (S.loading && S.items.length));
    const fb = $('#mq-filter-badge'), n = S.filters.filter(filterDone).length;
    fb.hidden = !n; fb.textContent = n;
    const ft = $('#mq-filter-toggle'); ft.classList.toggle('is-on', S.filterOpen || n > 0); ft.setAttribute('aria-expanded', S.filterOpen);
    $('#mq-refresh').classList.toggle('is-spinning', S.refreshing);
    $('#mq-kbd').hidden = !!S.search;
  }

  function avatar(name, me) { return `<span class="mq-avatar${me ? ' mq-avatar--me' : ''}" style="background:${avColor(name)}">${esc(initials(name))}</span>`; }

  function renderHead() {
    $('#mq-head-right').innerHTML =
      (S.runtime ? `<span class="mq-env" data-env="${esc(S.runtime)}" title="Reading the ${esc(S.runtime)} Data Fabric entity">${esc(S.runtime)}</span>` : '') +
      (S.me ? `<span class="mq-me">${avatar(S.me, true)}${esc(S.me)}${S.isAdmin ? '<span class="mq-role">Admin</span>' : ''}</span>` : '');
  }

  function renderTabs() {
    const ready = !(S.loading && !S.items.length);
    $('#mq-tabs').innerHTML = Object.keys(VIEWS).map(v => {
      const on = S.view === v, n = ready ? S.items.filter(VIEWS[v].test).length : '–';
      return `<button class="mq-tab${on ? ' is-active' : ''}" role="tab" aria-selected="${on}" data-view="${v}">${VIEWS[v].icon}<span>${VIEWS[v].label}</span><span class="mq-count">${n}</span></button>`;
    }).join('');
  }

  function renderFilterPanel() {
    const p = $('#mq-fpanel'); p.hidden = !S.filterOpen; if (!S.filterOpen) return;
    const rows = S.filters.map((f, i) => {
      const col = COLMAP[f.col];
      const colSel = `<select class="mq-input" data-f-col="${f.id}" aria-label="Column">${COLS.map(c => `<option value="${c.key}"${c.key === f.col ? ' selected' : ''}>${esc(c.label)}</option>`).join('')}</select>`;
      const opSel = `<select class="mq-input" data-f-op="${f.id}" aria-label="Condition">${OPS[col.type].map(([k, l]) => `<option value="${k}"${k === f.op ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
      let val;
      if (col.type === 'enum') val = `<select class="mq-input" data-f-val="${f.id}" aria-label="Value"><option value="">Select…</option>${distinct(f.col).map(o => `<option value="${esc(o)}"${o === f.val ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
      else if (col.type === 'date') val = `<input class="mq-input" type="date" data-f-val="${f.id}" value="${esc(f.val)}" aria-label="Date">`;
      else val = `<input class="mq-input" type="text" data-f-val="${f.id}" value="${esc(f.val)}" placeholder="Type a value…" aria-label="Value">`;
      return `<div class="mq-frow"><span class="mq-where">${i ? 'and' : 'where'}</span>${colSel}${opSel}${val}<button class="mq-btn mq-btn--ghost mq-btn--icon" data-f-rm="${f.id}" title="Remove filter" aria-label="Remove filter">${I.x}</button></div>`;
    }).join('');
    p.innerHTML = rows + `<div class="mq-ffoot">
        <button class="mq-btn mq-btn--outline mq-btn--sm" data-f-add>${I.plus}Add filter</button>
        ${S.filters.length ? '<button class="mq-btn mq-btn--ghost mq-btn--sm" data-f-clear>Clear all</button>' : ''}
        <span class="mq-hint">All conditions must match · results update as you type</span>
      </div>`;
  }

  function renderSubbar() {
    if (S.loading && !S.items.length) { $('#mq-subbar').innerHTML = '<span class="mq-updated" style="margin-left:0">Loading items from Data Fabric…</span>'; return; }
    const base = narrow(S.items.filter(VIEWS[S.view].test), true);
    const counts = {}; base.forEach(i => { counts[i.Status] = (counts[i.Status] || 0) + 1; });
    const statuses = CFG.STATUS_ORDER.filter(s => counts[s] || S.statuses.has(s)).concat(Object.keys(counts).filter(s => !CFG.STATUS_ORDER.includes(s)));
    const dotColor = s => ({ 'To be processed': 'var(--blue)', 'In Progress': 'var(--amber)', 'Approved': 'var(--green)', 'Rejected': 'var(--red)' }[s] || 'var(--text-3)');
    let h = `<button class="mq-chip${S.statuses.size ? '' : ' is-on'}" data-status="">All statuses <span class="n">${base.length}</span></button>`;
    h += statuses.map(s => `<button class="mq-chip${S.statuses.has(s) ? ' is-on' : ''}" data-status="${esc(s)}"><span class="dot" style="background:${dotColor(s)}"></span>${esc(s || '(blank)')} <span class="n">${counts[s] || 0}</span></button>`).join('');
    const done = S.filters.filter(filterDone);
    if (done.length) {
      h += '<span class="mq-sep"></span>' + done.map(f => {
        const col = COLMAP[f.col], opl = OPS[col.type].find(o => o[0] === f.op)[1];
        const v = col.type === 'date' ? isoToUs(f.val) : f.val;
        return `<span class="mq-fchip"><b>${esc(col.label)}</b> ${esc(opl)} “${esc(v)}”<button data-f-rm="${f.id}" aria-label="Remove filter">${I.x}</button></span>`;
      }).join('') + `<button class="mq-btn mq-btn--link mq-btn--sm" data-f-clear style="margin-left:4px">Clear filters</button>`;
    }
    h += `<span class="mq-updated">${S.loadedAt ? 'Updated ' + ago(S.loadedAt) : ''}</span>`;
    $('#mq-subbar').innerHTML = h;
  }

  function statusPill(s) { const k = { 'to be processed': 'tbp', 'in progress': 'inp', 'approved': 'app', 'rejected': 'rej' }[norm(s)] || 'oth'; return `<span class="mq-pill mq-pill--${k}">${esc(s || '—')}</span>`; }
  function assigneeCell(it) {
    if (isUnassigned(it)) return '<span class="mq-unassigned">Unassigned</span>';
    if (isMine(it)) return `<span class="mq-person">${avatar(it.AssignedTo, true)}<span class="mq-you">You</span></span>`;
    return `<span class="mq-person">${avatar(it.AssignedTo)}${esc(it.AssignedTo)}</span>`;
  }
  function rowActions(it) {
    if (S.pending.has(it.Id)) return '<span class="mq-rowspin" role="status" aria-label="Working"></span>';
    const id = esc(it.Id), b = [];
    if (canUnassign(it)) b.push(`<button class="mq-btn mq-btn--ghost mq-btn--icon" data-act="unassign" data-id="${id}" title="${isMine(it) ? 'Unassign from me' : 'Unassign from ' + esc(it.AssignedTo)}" aria-label="Unassign">${I.userMinus}</button>`);
    if (isMine(it) && isActive(it)) b.push(`<button class="mq-btn mq-btn--primary mq-btn--sm" data-act="open" data-id="${id}">${I.open}Open</button>`);
    else {
      if (isUnassigned(it) && isActive(it)) b.push(`<button class="mq-btn mq-btn--green-outline mq-btn--sm" data-act="assign-me" data-id="${id}">${I.userPlus}Assign to me</button>`);
      b.push(`<button class="mq-btn mq-btn--outline mq-btn--sm" data-act="view" data-id="${id}" title="Open read-only">${I.eye}View</button>`);
    }
    return `<span class="wrap">${b.join('')}</span>`;
  }

  function renderTable() {
    const list = sortList(narrow(S.items.filter(VIEWS[S.view].test)));
    S.list = list;
    const pages = Math.max(1, Math.ceil(list.length / S.pageSize));
    if (S.page > pages) S.page = pages;
    const rows = list.slice((S.page - 1) * S.pageSize, S.page * S.pageSize);
    const skeleton = S.loading && !S.items.length;

    const allOnPage = rows.length > 0 && rows.every(r => S.selected.has(r.Id));
    const someOnPage = rows.some(r => S.selected.has(r.Id));
    $('#mq-thead').innerHTML = `<tr>
      <th class="c-check"><input type="checkbox" id="mq-check-page" aria-label="Select all on this page"${allOnPage ? ' checked' : ''}${rows.length ? '' : ' disabled'}></th>
      ${COLS.map(c => {
        const on = S.sort.key === c.key, cls = on ? (S.sort.dir > 0 ? ' is-asc' : ' is-desc') : '';
        const aria = on ? (S.sort.dir > 0 ? 'ascending' : 'descending') : 'none';
        return `<th class="${c.cls || ''}" aria-sort="${aria}"><button class="mq-th-sort${cls}" data-sort="${c.key}">${esc(c.label)}<span class="arr">${I.up}${I.dn}</span></button></th>`;
      }).join('')}
      <th class="c-actions">Actions</th></tr>`;
    $('#mq-check-page').indeterminate = someOnPage && !allOnPage;

    const tb = $('#mq-tbody'), empty = $('#mq-empty');
    if (skeleton) {
      const w = [70, 55, 60, 65, 80, 75, 60];
      tb.innerHTML = Array.from({ length: 9 }, (_, r) => `<tr><td class="c-check"><div class="mq-skel" style="width:16px;height:16px;border-radius:4px;display:inline-block"></div></td>${COLS.map((c, i) => `<td class="${c.cls || ''}"><div class="mq-skel" style="width:${w[i] + ((r * 7 + i * 13) % 30)}px"></div></td>`).join('')}<td class="c-actions"><div class="mq-skel" style="width:120px;margin-left:auto;height:26px;border-radius:8px"></div></td></tr>`).join('');
      empty.hidden = true; return;
    }
    if (!list.length) { tb.innerHTML = ''; empty.hidden = false; empty.innerHTML = emptyState(); return; }
    empty.hidden = true;
    tb.innerHTML = rows.map(it => {
      const sel = S.selected.has(it.Id), cls = [sel && 'is-selected', S.pending.has(it.Id) && 'is-pending'].filter(Boolean).join(' ');
      return `<tr data-id="${esc(it.Id)}" class="${cls}">
        <td class="c-check"><input type="checkbox" class="mq-rowcheck" data-id="${esc(it.Id)}" aria-label="Select ${esc(it.RSSNumber)}"${sel ? ' checked' : ''}></td>
        <td class="c-strong">${esc(it.ProjectNumber)}</td>
        <td>${esc(it.StudyID)}</td>
        <td>${esc(it.StudyDate)}</td>
        <td>${esc(it.RSSNumber)}</td>
        <td>${statusPill(it.Status)}</td>
        <td>${assigneeCell(it)}</td>
        <td class="c-muted c-lub">${esc(it.LastUpdatedBy)}</td>
        <td class="c-actions">${rowActions(it)}</td></tr>`;
    }).join('');
  }

  function emptyState() {
    const box = (icon, t, p, btn) => `<div class="mq-empty"><div class="ic">${icon}</div><h3>${t}</h3><p>${p}</p>${btn || ''}</div>`;
    if (S.error) return box(I.warn, 'Items could not be loaded', esc(S.error), `<button class="mq-btn mq-btn--primary" data-refresh>${I.refresh}Try again</button>`);
    if (hasNarrowing()) return box(I.search, 'No items match your filters', 'Try removing a filter or changing the search text.', `<button class="mq-btn mq-btn--outline" data-f-clear-all>Clear search & filters</button>`);
    if (S.view === 'mine') return box(I.inbox, 'No items assigned to you yet', 'Pick up work from the unassigned list. Items you assign to yourself will show up here.', `<button class="mq-btn mq-btn--primary" data-goto="unassigned">${I.inbox}Browse unassigned items</button>`);
    if (S.view === 'unassigned') return box(I.ok, 'Nothing waiting to be picked up', 'Every open item is already assigned. Refresh to check for new ones.', `<button class="mq-btn mq-btn--outline" data-refresh>${I.refresh}Refresh</button>`);
    return box(I.layers, 'No items found', 'There are no items in this entity yet.', '');
  }

  function renderSelbar() {
    const bar = $('#mq-selbar');
    const sel = [...S.selected].map(id => S.byId.get(id)).filter(Boolean);
    if (!sel.length) { bar.hidden = true; bar.innerHTML = ''; return; }
    bar.hidden = false;
    const target = S.isAdmin ? (S.assignTarget || S.me) : S.me;
    const nAssign = sel.filter(it => canAssign(it) && norm(it.AssignedTo) !== norm(target)).length;
    const nUn = sel.filter(canUnassign).length;
    const pageRows = S.list.slice((S.page - 1) * S.pageSize, S.page * S.pageSize);
    const offerAll = pageRows.length && pageRows.every(r => S.selected.has(r.Id)) && S.list.length > pageRows.length && !S.list.every(r => S.selected.has(r.Id));
    let h = `<span class="mq-selcount">${plural(sel.length, 'item')} selected</span>`;
    if (offerAll) h += `<button class="mq-btn mq-btn--link mq-btn--sm" data-select-all>Select all ${S.list.length} matching</button>`;
    h += `<button class="mq-btn mq-btn--ghost mq-btn--sm" data-clear-sel>Clear</button><span class="spacer"></span>`;
    if (S.isAdmin) {
      const users = [S.me].concat(S.users.filter(u => norm(u) !== norm(S.me)));
      h += `<select class="mq-input" id="mq-assign-target" aria-label="Assign to">${users.map(u => `<option value="${esc(u)}"${norm(u) === norm(target) ? ' selected' : ''}>${norm(u) === norm(S.me) ? 'Me (' + esc(u) + ')' : esc(u)}</option>`).join('')}</select>`;
      h += `<button class="mq-btn mq-btn--primary" data-bulk="assign"${nAssign ? '' : ' disabled'}>${I.userPlus}Assign (${nAssign})</button>`;
    } else {
      if (nAssign === 0 && nUn === 0) h += `<span class="mq-selnote">None of the selected items can be changed by you</span>`;
      h += `<button class="mq-btn mq-btn--primary" data-bulk="assign"${nAssign ? '' : ' disabled'} title="Only unassigned, open items can be assigned">${I.userPlus}Assign to me (${nAssign})</button>`;
    }
    h += `<button class="mq-btn mq-btn--outline" data-bulk="unassign"${nUn ? '' : ' disabled'}>${I.userMinus}Unassign (${nUn})</button>`;
    bar.innerHTML = h;
  }

  function renderFooter() {
    const n = S.list.length, from = n ? (S.page - 1) * S.pageSize + 1 : 0, to = Math.min(n, S.page * S.pageSize);
    const pages = Math.max(1, Math.ceil(n / S.pageSize));
    const viewTotal = S.items.filter(VIEWS[S.view].test).length;
    const pg = [];
    if (pages <= 7) for (let i = 1; i <= pages; i++) pg.push(i);
    else { const s = new Set([1, pages, S.page - 1, S.page, S.page + 1]); if (S.page <= 3) [2, 3, 4].forEach(x => s.add(x)); if (S.page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach(x => s.add(x)); let last = 0; [...s].filter(x => x >= 1 && x <= pages).sort((a, b) => a - b).forEach(x => { if (x - last > 1) pg.push('…'); pg.push(x); last = x; }); }
    $('#mq-footer').innerHTML = `
      <span>${S.loading && !S.items.length ? 'Loading items from Data Fabric…' : !n ? 'No items to show' : `Showing <b>${from}–${to}</b> of <b>${n}</b> ${n === 1 ? 'item' : 'items'}${hasNarrowing() && n !== viewTotal ? ` <span style="color:var(--text-3)">(filtered from ${viewTotal})</span>` : ''}`}</span>
      <span class="right">
        <label>Rows per page <select id="mq-pagesize">${CFG.PAGE_SIZES.map(s => `<option${s === S.pageSize ? ' selected' : ''}>${s}</option>`).join('')}</select></label>
        <span class="mq-pager">
          <button class="mq-pg" data-page="${S.page - 1}"${S.page <= 1 ? ' disabled' : ''} aria-label="Previous page">${I.left}</button>
          ${pg.map(p => p === '…' ? '<span class="mq-gap">…</span>' : `<button class="mq-pg${p === S.page ? ' is-on' : ''}" data-page="${p}">${p}</button>`).join('')}
          <button class="mq-pg" data-page="${S.page + 1}"${S.page >= pages ? ' disabled' : ''} aria-label="Next page">${I.right}</button>
        </span>
      </span>`;
  }

  /* ---------- toasts ---------- */
  function toast(type, title, msg, action) {
    const box = $('#mq-toasts'), el = document.createElement('div');
    el.className = `mq-toast mq-toast--${type}`;
    el.innerHTML = `<span class="ti">${{ success: I.ok, warn: I.warn, error: I.warn, info: I.info }[type]}</span>
      <div class="tb"><div class="tt">${esc(title)}</div>${msg ? `<div class="tm">${esc(msg)}</div>` : ''}${action ? `<div class="ta"><button class="mq-btn mq-btn--link mq-btn--sm">${esc(action.label)}</button></div>` : ''}</div>
      <button class="tx" aria-label="Dismiss">${I.x}</button>`;
    const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 200); };
    el.querySelector('.tx').onclick = close;
    if (action) el.querySelector('.ta button').onclick = () => { action.fn(); close(); };
    box.appendChild(el); setTimeout(close, type === 'error' || type === 'warn' ? 7000 : 4500);
  }

  /* ---------- talking to the app ----------
     Requests are sent one at a time (queued), so the hidden trigger textbox
     never receives two changes while its workflow is still running.        */
  let chain = Promise.resolve();

  function send(action, ids, extra) {
    extra = extra || {};
    if (action !== 'refresh' && !ids.length) return;
    if (action === 'refresh') { if (S.refreshing) return; S.refreshing = true; }
    ids.forEach(id => S.pending.add(id));
    render({ panel: false });
    chain = chain.then(() => sendNow(action, ids, extra));
  }

  function finish(requestId) {
    const req = S.inflight.get(requestId); if (!req) return null;
    clearTimeout(req.timer); S.inflight.delete(requestId);
    req.ids.forEach(id => S.pending.delete(id));
    if (req.action === 'refresh') S.refreshing = false;
    req.done();
    return req;
  }

  function sendNow(action, ids, extra) {
    return new Promise(resolve => {
      const requestId = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const it = action === 'open' && ids.length ? S.byId.get(ids[0]) : null;
      const req = {
        requestId, action, ids,
        assignee: extra.assignee || '',
        readOnly: !!extra.readOnly,
        label: it ? [it.ProjectNumber, it.RSSNumber, it.StudyID, it.StudyDate].join(' - ') : '',
        status: it ? it.Status : '',
        assignedTo: it ? it.AssignedTo : '',
        sentAt: new Date().toISOString()
      };
      const timer = setTimeout(() => {
        if (finish(requestId)) { toast('error', 'No response from the app', 'The action took too long. Refresh the list and try again.'); render({ panel: false }); }
      }, CFG.REQUEST_TIMEOUT_MS);
      S.inflight.set(requestId, Object.assign({}, req, { timer, done: resolve }));
      render({ panel: false });
      Promise.resolve()
        .then(() => App.setVariable(CFG.VAR_ACTION, JSON.stringify(req)))
        .catch(e => { if (finish(requestId)) { toast('error', 'Action could not be sent', String((e && e.message) || e)); render({ panel: false }); } });
    });
  }

  function onResult(raw) {
    const r = parse(raw); if (!r || !r.requestId) return;
    const req = finish(r.requestId); if (!req) return;
    const ok = (r.ok || []).map(String), failed = r.failed || [];
    const assignee = r.assignee || req.assignee;

    // apply the outcome locally – no reload of the whole list needed
    if (req.action === 'assign') ok.forEach(id => patch(id, { AssignedTo: assignee }));
    if (req.action === 'unassign') ok.forEach(id => patch(id, { AssignedTo: ' - ' }));
    failed.forEach(f => {
      if (!f) return;
      if (f.assignedTo != null && f.assignedTo !== '') patch(f.id, { AssignedTo: String(f.assignedTo) });
      if (f.status) patch(f.id, { Status: String(f.status) });
    });
    (r.updated || []).forEach(u => upsert(normalize(u)));
    req.ids.forEach(id => S.selected.delete(id));
    if (req.action === 'refresh') S.loadedAt = Date.now();

    if (req.action === 'assign' && ok.length) {
      const toMe = norm(assignee) === norm(S.me);
      const goMine = toMe && S.view !== 'mine';
      toast('success', `${plural(ok.length, 'item')} assigned to ${toMe ? 'you' : assignee}`, goMine ? 'They are now in My items.' : '', goMine ? { label: 'Go to My items →', fn: () => setView('mine') } : null);
    }
    if (req.action === 'unassign' && ok.length) toast('success', `${plural(ok.length, 'item')} unassigned`, 'They are back in the Unassigned list.');
    if (failed.length) {
      const verb = { assign: 'assigned', unassign: 'unassigned', open: 'opened', refresh: 'refreshed' }[req.action] || 'processed';
      toast('warn', `${plural(failed.length, 'item')} could not be ${verb}`, failed.slice(0, 3).map(f => f && f.reason).filter(Boolean).join(' · '));
    }
    if (r.message) toast('info', 'Info', r.message);
    render({ panel: false });
  }

  function applyItems(raw) {
    if (raw == null || raw === '') { S.items = []; S.byId = new Map(); S.selected.clear(); S.loading = true; render({ panel: false }); return; }
    const arr = parse(raw);
    if (!Array.isArray(arr)) { S.loading = false; S.refreshing = false; S.error = 'The item list returned by the app is not valid JSON.'; render({ panel: false }); return; }
    S.items = arr.map(normalize); S.byId = new Map(S.items.map(i => [i.Id, i]));
    [...S.selected].forEach(id => { if (!S.byId.has(id)) S.selected.delete(id); });
    [...S.inflight].forEach(([k, v]) => { if (v.action === 'refresh') finish(k); });
    S.loading = false; S.error = null; S.loadedAt = Date.now();
    render();
  }

  function applyContext(raw) {
    const c = parse(raw) || {};
    const roleChanged = S.isAdmin !== !!c.isAdmin;
    S.me = String(c.displayName || '');
    S.isAdmin = !!c.isAdmin;
    S.runtime = String(c.runtime || '').trim().toUpperCase();
    S.users = (Array.isArray(c.users) ? c.users : []).map(String).filter(u => u.trim() && !/assign to self/i.test(u));
    if (!S.assignTarget || !S.users.some(u => norm(u) === norm(S.assignTarget))) S.assignTarget = S.me;
    if (roleChanged) S.selected.clear();
  }

  /* ---------- interactions ---------- */
  function setView(v) { S.view = v; S.page = 1; S.statuses.clear(); S.selected.clear(); render({ panel: false }); $('#mq-tablewrap').scrollTop = 0; }
  function addFilter() { S.filters.push({ id: ++fid, col: 'ProjectNumber', op: 'contains', val: '' }); S.filterOpen = true; render(); const el = $(`[data-f-val="${fid}"]`); if (el) el.focus(); }
  function clearFilters() { S.filters = []; S.page = 1; render(); }
  const rerunResults = debounce(() => { S.page = 1; render({ panel: false }); }, 140);

  function bind() {
    const root = $('#miles-root');

    root.addEventListener('click', e => {
      const t = e.target.closest('button, [data-id]'); if (!t) return;
      const d = t.dataset;
      if (d.view) return setView(d.view);
      if (d.goto) return setView(d.goto);
      if ('status' in d) { if (!d.status) S.statuses.clear(); else if (S.statuses.has(d.status)) S.statuses.delete(d.status); else S.statuses.add(d.status); S.page = 1; return render({ panel: false }); }
      if (d.sort) { const s = S.sort; if (s.key !== d.sort) { s.key = d.sort; s.dir = 1; } else if (s.dir === 1) s.dir = -1; else { s.key = null; s.dir = 1; } return render({ panel: false }); }
      if (d.page) { S.page = +d.page; render({ panel: false }); $('#mq-tablewrap').scrollTop = 0; return; }
      if ('fAdd' in d) return addFilter();
      if ('fClear' in d) return clearFilters();
      if ('fClearAll' in d) { S.search = ''; $('#mq-search').value = ''; S.statuses.clear(); return clearFilters(); }
      if (d.fRm) { S.filters = S.filters.filter(f => f.id !== +d.fRm); S.page = 1; return render(); }
      if ('refresh' in d) return send('refresh', []);
      if ('selectAll' in d) { S.list.forEach(r => S.selected.add(r.Id)); return render({ panel: false }); }
      if ('clearSel' in d) { S.selected.clear(); return render({ panel: false }); }
      if (d.bulk) {
        const sel = [...S.selected].map(id => S.byId.get(id)).filter(Boolean);
        if (d.bulk === 'assign') { const target = S.isAdmin ? (S.assignTarget || S.me) : S.me; return send('assign', sel.filter(it => canAssign(it) && norm(it.AssignedTo) !== norm(target)).map(i => i.Id), { assignee: target }); }
        if (d.bulk === 'unassign') return send('unassign', sel.filter(canUnassign).map(i => i.Id));
      }
      if (d.act && d.id) {
        const it = S.byId.get(d.id); if (!it || S.pending.has(it.Id)) return;
        if (d.act === 'open') return send('open', [it.Id], { readOnly: false });
        if (d.act === 'view') return send('open', [it.Id], { readOnly: true });
        if (d.act === 'assign-me') return send('assign', [it.Id], { assignee: S.me });
        if (d.act === 'unassign') return send('unassign', [it.Id]);
      }
      // click on a row (not on a control) toggles selection
      if (t.tagName === 'TR' && d.id && !e.target.closest('input')) { if (S.selected.has(d.id)) S.selected.delete(d.id); else S.selected.add(d.id); render({ panel: false }); }
    });

    root.addEventListener('dblclick', e => {
      const tr = e.target.closest('tr[data-id]'); if (!tr || e.target.closest('button, input')) return;
      const it = S.byId.get(tr.dataset.id); if (!it || S.pending.has(it.Id)) return;
      send('open', [it.Id], { readOnly: !(isMine(it) && isActive(it)) });
    });

    root.addEventListener('change', e => {
      const t = e.target;
      if (t.classList.contains('mq-rowcheck')) { if (t.checked) S.selected.add(t.dataset.id); else S.selected.delete(t.dataset.id); return render({ panel: false }); }
      if (t.id === 'mq-check-page') { const rows = S.list.slice((S.page - 1) * S.pageSize, S.page * S.pageSize); rows.forEach(r => { if (t.checked) S.selected.add(r.Id); else S.selected.delete(r.Id); }); return render({ panel: false }); }
      if (t.id === 'mq-pagesize') { S.pageSize = +t.value; S.page = 1; return render({ panel: false }); }
      if (t.id === 'mq-assign-target') { S.assignTarget = t.value; return renderSelbar(); }
      const f = S.filters.find(x => x.id === +(t.dataset.fCol || t.dataset.fOp || t.dataset.fVal));
      if (!f) return;
      if (t.dataset.fCol) { f.col = t.value; f.op = OPS[COLMAP[f.col].type][0][0]; f.val = ''; render(); const el = $(`[data-f-val="${f.id}"]`); if (el) el.focus(); return; }
      if (t.dataset.fOp) { f.op = t.value; S.page = 1; return render({ panel: false }); }
      if (t.dataset.fVal) { f.val = t.value; S.page = 1; return render({ panel: false }); }
    });

    root.addEventListener('input', e => {
      const t = e.target;
      if (t.id === 'mq-search') { S.search = t.value; $('#mq-kbd').hidden = !!t.value; return rerunResults(); }
      if (t.dataset.fVal && t.type === 'text') { const f = S.filters.find(x => x.id === +t.dataset.fVal); if (f) { f.val = t.value; rerunResults(); } }
    });

    $('#mq-filter-toggle').addEventListener('click', () => { S.filterOpen = !S.filterOpen; if (S.filterOpen && !S.filters.length) return addFilter(); render(); });
    $('#mq-refresh').addEventListener('click', () => send('refresh', []));
    $('#mq-search').addEventListener('keydown', e => { if (e.key === 'Escape') { e.target.value = ''; S.search = ''; rerunResults(); } });
    document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $('#mq-search').focus(); } });
    setInterval(() => { const u = $('.mq-updated'); if (u && S.loadedAt) u.textContent = 'Updated ' + ago(S.loadedAt); }, 30000);
  }

  /* ---------- start ---------- */
  async function init() {
    bind(); render();
    let gotItems = false, gotCtx = false;
    // listen first, then read – so a value written while we start up is never missed
    App.onVariableChange(CFG.VAR_CONTEXT, v => { gotCtx = true; applyContext(v); render(); });
    App.onVariableChange(CFG.VAR_ITEMS, v => { gotItems = true; applyItems(v); });
    App.onVariableChange(CFG.VAR_RESULT, onResult);
    try {
      const [ctx, items] = await Promise.all([App.getVariable(CFG.VAR_CONTEXT), App.getVariable(CFG.VAR_ITEMS)]);
      if (!gotCtx) applyContext(ctx);
      if (!gotItems) applyItems(items); else render();
    } catch (e) {
      S.loading = false; S.error = 'Could not read app variables: ' + ((e && e.message) || e); render();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
