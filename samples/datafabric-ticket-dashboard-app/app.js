import { UiPath } from '@uipath/uipath-typescript/core';
import {
  Entities,
  ChoiceSets,
  EntityAggregateFunction,
  LogicalOperator,
  QueryFilterOperator,
} from '@uipath/uipath-typescript/entities';

// ─── Hardcoded demo config ───────────────────────────────────────────────────
//
// Vite proxies /dataservicetest/* → https://staging.uipath.com/dataservicetest/*
// (see vite.config.js). The SDK builds URLs as
// {baseUrl}/{orgName}/{tenantName}/datafabric_/api/...
const CONFIG = {
  baseUrl: window.location.origin,
  orgName: 'dataservicetest',
  tenantName: 'ashishTest',
};

const ENTITY_ID = 'cbcc0a09-6b49-f111-8ef3-000d3a261acd'; // Tickets

// Field name constants — adjust if your entity uses different casing
const F = {
  ID: 'Id',
  TICKET_NUMBER: 'ticketNumber',
  SUBJECT: 'subject',
  DESCRIPTION: 'description',
  CUSTOMER_NAME: 'customerName',
  CUSTOMER_EMAIL: 'customerEmail',
  ASSIGNEE: 'assignee',
  STATUS: 'status',
  PRIORITY: 'priority',
  CATEGORY: 'category',
  REASON_FOR_DELAY: 'reasonForDelay',
  RESOLUTION_MINUTES: 'resolutionMinutes',
  RESOLVED_TIME: 'resolvedTime',
  ATTACHMENT: 'attachment',
  CREATE_TIME: 'CreateTime', // system field, PascalCase
};

// SLA target: resolutionMinutes above this means "breached" for an open ticket
const SLA_MINUTES = 240; // 4 hours

// Aging buckets driven by resolutionMinutes (running clock for open tickets).
// We can't filter on CreateTime because DF auto-sets it to "now" on insert,
// so every seeded record would land in the <1 day bucket.
const AGE_BUCKETS = [
  { label: '< 1 day',  minMin: 0,     maxMin: 1440  },
  { label: '1–3 days', minMin: 1440,  maxMin: 4320  },
  { label: '3–7 days', minMin: 4320,  maxMin: 10080 },
  { label: '> 7 days', minMin: 10080, maxMin: null  },
];

const TOKEN_STORAGE_KEY = 'ticket-dashboard-token';

// Choice set fields. Filled in on first load by loadChoiceSetMaps() —
// each entry maps a field name to { byLabel, byNumberId, byId }
// so we can convert between the human label and the numeric ID the
// API expects for filters and groupBy on choice-set fields.
const choiceSetMaps = {};

function nonResolvedFilter() {
  // Convert ['Resolved','Closed'] labels → numberIds for the API.
  const ids = ['Resolved', 'Closed']
    .map(l => csLabelToNumberId(F.STATUS, l))
    .filter(v => v != null)
    .map(String);
  return { fieldName: F.STATUS, operator: QueryFilterOperator.NotIn, valueList: ids };
}

function csLabelToNumberId(fieldName, label) {
  return choiceSetMaps[fieldName]?.byLabel.get(String(label))?.numberId;
}

function csIdToLabel(fieldName, value) {
  if (value === null || value === undefined) return null;
  const maps = choiceSetMaps[fieldName];
  if (!maps) return String(value);
  const v = String(value);
  // Try numberId first (most common case for groupBy results)
  const byNum = maps.byNumberId.get(v);
  if (byNum) return byNum.name;
  // Already a label
  if (maps.byLabel.has(v)) return v;
  // UUID id
  const byId = maps.byId.get(v);
  if (byId) return byId.name;
  return v;
}

// ─── DOM refs ────────────────────────────────────────────────────────────────
const tokenInput = document.getElementById('token-input');
const applyBtn   = document.getElementById('apply-token-btn');
const clearBtn   = document.getElementById('clear-token-btn');
const refreshBtn = document.getElementById('refresh-btn');
const statusEl   = document.getElementById('status');
const dashboard  = document.getElementById('dashboard');
const drilldown  = document.getElementById('drilldown');
const listBody   = document.getElementById('list-tbody');
const bulkBar    = document.getElementById('bulk-bar');

const charts = {};
let entities = null;
let choiceSets = null;
let currentTickets = [];   // last loaded list rows
let selectedIds = new Set();
let openTicket = null;
let choiceMapsLoaded = false;

// ─── Entrypoint ──────────────────────────────────────────────────────────────
applyBtn.addEventListener('click', () => loadAll(tokenInput.value.trim()));
clearBtn.addEventListener('click', clearToken);
refreshBtn.addEventListener('click', loadAll.bind(null, null));

document.getElementById('apply-filter-btn').addEventListener('click', async () => {
  const btn = document.getElementById('apply-filter-btn');
  const original = btn.textContent;
  btn.disabled = true;
  btn.classList.add('is-loading');
  btn.textContent = 'Loading…';
  try {
    await loadList();
  } finally {
    btn.disabled = false;
    btn.classList.remove('is-loading');
    btn.textContent = original;
  }
});
document.getElementById('select-all').addEventListener('change', onSelectAll);
document.getElementById('bulk-reassign-btn').addEventListener('click', onBulkReassign);
document.getElementById('dd-close').addEventListener('click', closeDrilldown);
document.getElementById('dd-form').addEventListener('submit', onDrilldownSave);
document.getElementById('dd-attachment-btn').addEventListener('click', onAttachmentDownload);

// Auto-load if token saved
const savedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
if (savedToken) {
  tokenInput.value = savedToken;
  loadAll(savedToken);
}

function clearToken() {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  tokenInput.value = '';
  dashboard.classList.add('hidden');
  closeDrilldown();
  refreshBtn.disabled = true;
  setStatus('Token cleared.', 'info');
}

async function loadAll(token) {
  if (!entities) {
    if (!token) { setStatus('Paste a bearer token first.', 'error'); return; }
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    const sdk = new UiPath({ ...CONFIG, secret: token });
    entities = new Entities(sdk);
    choiceSets = new ChoiceSets(sdk);
  }

  applyBtn.disabled  = true;
  refreshBtn.disabled = true;

  try {
    if (!choiceMapsLoaded) {
      setStatus('Loading entity schema and choice sets…', 'info');
      await loadChoiceSetMaps();
      choiceMapsLoaded = true;
    }

    setStatus('Running aggregate queries…', 'info');
    await Promise.all([
      renderKpis(),
      renderByAgent(),
      renderByCategory(),
      renderByReason(),
      renderByAge(),
      loadList(),
    ]);

    dashboard.classList.remove('hidden');
    refreshBtn.disabled = false;
    setStatus('Dashboard loaded.', 'success');
  } catch (err) {
    console.error(err);
    const message = err?.message || String(err);
    setStatus(`Failed: ${message}`, 'error');
  } finally {
    applyBtn.disabled = false;
  }
}

// Fetches the entity metadata, finds choice-set fields, and pulls each
// choice set's values so we can map between human labels and the numeric
// IDs DataFabric stores internally for choice-set columns.
async function loadChoiceSetMaps() {
  const entity = await entities.getById(ENTITY_ID);
  const choiceFields = (entity.fields || []).filter(f =>
    f.choiceSetId &&
    (f.fieldDataType?.name === 'CHOICE_SET_SINGLE' ||
     f.fieldDataType?.name === 'CHOICE_SET_MULTIPLE')
  );

  // Fetch unique choice sets in parallel
  const uniqueIds = [...new Set(choiceFields.map(f => f.choiceSetId))];
  const csResults = await Promise.all(
    uniqueIds.map(id => choiceSets.getById(id).then(r => [id, r]))
  );
  const csById = new Map(csResults);

  for (const field of choiceFields) {
    const cs = csById.get(field.choiceSetId);
    const items = cs?.items || [];
    const byLabel = new Map();
    const byNumberId = new Map();
    const byId = new Map();
    for (const item of items) {
      byLabel.set(item.name, item);
      if (item.numberId !== undefined && item.numberId !== null) {
        byNumberId.set(String(item.numberId), item);
      }
      if (item.id) byId.set(item.id, item);
    }
    choiceSetMaps[field.name] = { items, byLabel, byNumberId, byId };
  }
}

// ─── KPI strip ───────────────────────────────────────────────────────────────
async function renderKpis() {
  const [openAndAge, breach, resolved] = await Promise.all([
    // Open count + average open age in one query (two aggregates)
    entities.queryRecordsById(ENTITY_ID, {
      filterGroup: { logicalOperator: LogicalOperator.And, queryFilters: [nonResolvedFilter()] },
      aggregates: [
        { function: EntityAggregateFunction.Count, field: F.ID,                 alias: 'openCount' },
        { function: EntityAggregateFunction.Avg,   field: F.RESOLUTION_MINUTES, alias: 'avgAge'    },
      ],
    }),
    // SLA breached count
    entities.queryRecordsById(ENTITY_ID, {
      filterGroup: {
        logicalOperator: LogicalOperator.And,
        queryFilters: [
          nonResolvedFilter(),
          { fieldName: F.RESOLUTION_MINUTES, operator: QueryFilterOperator.GreaterThan, value: String(SLA_MINUTES) },
        ],
      },
      aggregates: [{ function: EntityAggregateFunction.Count, field: F.ID, alias: 'breach' }],
    }),
    // Resolved count (total — simpler than time-windowed)
    entities.queryRecordsById(ENTITY_ID, {
      filterGroup: {
        logicalOperator: LogicalOperator.And,
        queryFilters: [{
          fieldName: F.STATUS,
          operator: QueryFilterOperator.Equals,
          value: String(csLabelToNumberId(F.STATUS, 'Resolved')),
        }],
      },
      aggregates: [{ function: EntityAggregateFunction.Count, field: F.ID, alias: 'resolved' }],
    }),
  ]);

  const kpi = openAndAge.items?.[0] || {};
  document.getElementById('kpi-open').textContent     = formatNumber(kpi.openCount);
  document.getElementById('kpi-breach').textContent   = formatNumber(breach.items?.[0]?.breach);
  document.getElementById('kpi-avg').textContent      = formatMinutes(kpi.avgAge);
  document.getElementById('kpi-resolved').textContent = formatNumber(resolved.items?.[0]?.resolved);
}

// ─── Chart 1: Tickets per agent (groupBy assignee, COUNT) ───────────────────
async function renderByAgent() {
  const result = await entities.queryRecordsById(ENTITY_ID, {
    filterGroup: { logicalOperator: LogicalOperator.And, queryFilters: [nonResolvedFilter()] },
    selectedFields: [F.ASSIGNEE],
    groupBy: [F.ASSIGNEE],
    aggregates: [{ function: EntityAggregateFunction.Count, field: F.ID, alias: 'count' }],
  });

  const rows = (result.items || [])
    .map(r => ({ assignee: r[F.ASSIGNEE] ?? '(unassigned)', count: Number(r.count ?? 0) }))
    .sort((a, b) => b.count - a.count);

  drawBar('chart-by-agent', {
    labels: rows.map(r => r.assignee),
    datasets: [{ label: 'Open tickets', data: rows.map(r => r.count), backgroundColor: '#fa4616' }],
  });

  // Populate assignee filter dropdown from real data
  const sel = document.getElementById('filter-assignee');
  const existing = new Set(Array.from(sel.options).map(o => o.value));
  for (const r of rows) {
    if (r.assignee !== '(unassigned)' && !existing.has(r.assignee)) {
      const opt = document.createElement('option');
      opt.value = opt.textContent = r.assignee;
      sel.appendChild(opt);
    }
  }
}

// ─── Chart 2: Avg resolution time by category (groupBy category, AVG) ───────
async function renderByCategory() {
  const result = await entities.queryRecordsById(ENTITY_ID, {
    selectedFields: [F.CATEGORY],
    groupBy: [F.CATEGORY],
    aggregates: [{ function: EntityAggregateFunction.Avg, field: F.RESOLUTION_MINUTES, alias: 'avgMin' }],
  });

  const rows = (result.items || [])
    .map(r => ({
      category: csIdToLabel(F.CATEGORY, r[F.CATEGORY]) ?? '(none)',
      avg: Number(r.avgMin ?? 0),
    }))
    .sort((a, b) => b.avg - a.avg);

  drawBar('chart-by-category', {
    labels: rows.map(r => r.category),
    datasets: [{ label: 'Avg minutes', data: rows.map(r => Math.round(r.avg)), backgroundColor: '#2563eb' }],
  });
}

// ─── Chart 3: Where time is going (groupBy reasonForDelay, COUNT) ───────────
async function renderByReason() {
  const result = await entities.queryRecordsById(ENTITY_ID, {
    filterGroup: { logicalOperator: LogicalOperator.And, queryFilters: [nonResolvedFilter()] },
    selectedFields: [F.REASON_FOR_DELAY],
    groupBy: [F.REASON_FOR_DELAY],
    aggregates: [{ function: EntityAggregateFunction.Count, field: F.ID, alias: 'count' }],
  });

  // Drop null/empty reasons client-side (the API has no IS NOT NULL operator).
  const rows = (result.items || [])
    .filter(r => r[F.REASON_FOR_DELAY] !== null && r[F.REASON_FOR_DELAY] !== undefined && r[F.REASON_FOR_DELAY] !== '')
    .map(r => ({
      reason: csIdToLabel(F.REASON_FOR_DELAY, r[F.REASON_FOR_DELAY]) ?? '',
      count: Number(r.count ?? 0),
    }))
    .filter(r => r.reason)
    .sort((a, b) => b.count - a.count);

  drawBar('chart-by-reason', {
    labels: rows.map(r => r.reason),
    datasets: [{ label: 'Stuck tickets', data: rows.map(r => r.count), backgroundColor: '#16a34a' }],
  }, { indexAxis: 'y' });
}

// ─── Chart 4: Tickets by age (parallel filtered COUNT queries) ──────────────
async function renderByAge() {
  const queries = AGE_BUCKETS.map(bucket => {
    const filters = [nonResolvedFilter()];
    if (bucket.minMin > 0) {
      filters.push({
        fieldName: F.RESOLUTION_MINUTES,
        operator: QueryFilterOperator.GreaterThanOrEqual,
        value: String(bucket.minMin),
      });
    }
    if (bucket.maxMin !== null) {
      filters.push({
        fieldName: F.RESOLUTION_MINUTES,
        operator: QueryFilterOperator.LessThan,
        value: String(bucket.maxMin),
      });
    }
    return entities.queryRecordsById(ENTITY_ID, {
      filterGroup: { logicalOperator: LogicalOperator.And, queryFilters: filters },
      aggregates: [{ function: EntityAggregateFunction.Count, field: F.ID, alias: 'count' }],
    });
  });

  const results = await Promise.all(queries);
  const counts = results.map(r => Number(r.items?.[0]?.count ?? 0));

  drawBar('chart-by-age', {
    labels: AGE_BUCKETS.map(b => b.label),
    datasets: [{ label: 'Open tickets', data: counts, backgroundColor: '#9333ea' }],
  });
}

// ─── Drill-down list ────────────────────────────────────────────────────────
async function loadList() {
  const assignee = document.getElementById('filter-assignee').value;
  const priority = document.getElementById('filter-priority').value;
  const statusVal = document.getElementById('filter-status').value;
  const sortMode = document.getElementById('filter-sort').value;

  const queryFilters = [];
  if (assignee) {
    queryFilters.push({ fieldName: F.ASSIGNEE, operator: QueryFilterOperator.Equals, value: assignee });
  }
  if (priority) {
    const id = csLabelToNumberId(F.PRIORITY, priority);
    if (id != null) {
      queryFilters.push({ fieldName: F.PRIORITY, operator: QueryFilterOperator.Equals, value: String(id) });
    }
  }
  if (statusVal === 'open') {
    queryFilters.push(nonResolvedFilter());
  } else if (statusVal) {
    const id = csLabelToNumberId(F.STATUS, statusVal);
    if (id != null) {
      queryFilters.push({ fieldName: F.STATUS, operator: QueryFilterOperator.Equals, value: String(id) });
    }
  }

  const result = await entities.queryRecordsById(ENTITY_ID, {
    filterGroup: queryFilters.length ? { logicalOperator: LogicalOperator.And, queryFilters } : undefined,
    sortOptions: [{ fieldName: F.CREATE_TIME, isDescending: sortMode === 'newest' }],
    pageSize: 20,
  });

  currentTickets = result.items || [];
  selectedIds.clear();
  document.getElementById('select-all').checked = false;
  renderListRows();
  updateBulkBar();
}

function renderListRows() {
  listBody.innerHTML = '';
  for (const t of currentTickets) {
    const statusLabel   = csIdToLabel(F.STATUS,   t[F.STATUS])   || '';
    const priorityLabel = csIdToLabel(F.PRIORITY, t[F.PRIORITY]) || '';
    const categoryLabel = csIdToLabel(F.CATEGORY, t[F.CATEGORY]) || '';
    const tr = document.createElement('tr');
    tr.dataset.id = t[F.ID];
    tr.innerHTML = `
      <td class="check"><input type="checkbox" data-id="${t[F.ID]}" ${selectedIds.has(t[F.ID]) ? 'checked' : ''} /></td>
      <td>${formatTicketNumber(t[F.TICKET_NUMBER])}</td>
      <td>${escapeHtml(t[F.SUBJECT] || '')}</td>
      <td>${escapeHtml(t[F.CUSTOMER_NAME] || '')}</td>
      <td>${escapeHtml(t[F.ASSIGNEE] || '')}</td>
      <td><span class="status-badge status-${escapeHtml(statusLabel)}">${escapeHtml(statusLabel)}</span></td>
      <td><span class="priority-badge priority-${escapeHtml(priorityLabel)}">${escapeHtml(priorityLabel)}</span></td>
      <td>${escapeHtml(categoryLabel)}</td>
      <td>${formatAge(t[F.CREATE_TIME])}</td>
    `;
    tr.querySelector('input[type="checkbox"]').addEventListener('click', (e) => {
      e.stopPropagation();
      onRowCheckbox(t[F.ID], e.target.checked);
    });
    tr.addEventListener('click', () => openDrilldown(t));
    listBody.appendChild(tr);
  }
}

function onRowCheckbox(id, checked) {
  if (checked) selectedIds.add(id); else selectedIds.delete(id);
  updateBulkBar();
}

function onSelectAll(e) {
  if (e.target.checked) {
    for (const t of currentTickets) selectedIds.add(t[F.ID]);
  } else {
    selectedIds.clear();
  }
  renderListRows();
  updateBulkBar();
}

function updateBulkBar() {
  const n = selectedIds.size;
  if (n === 0) { bulkBar.classList.add('hidden'); return; }
  bulkBar.classList.remove('hidden');
  document.getElementById('bulk-count').textContent = `${n} selected`;
}

async function onBulkReassign() {
  const newAssignee = document.getElementById('bulk-assignee-input').value.trim();
  if (!newAssignee) { setStatus('Enter an assignee email first.', 'error'); return; }
  if (selectedIds.size === 0) return;

  setStatus(`Reassigning ${selectedIds.size} tickets to ${newAssignee}…`, 'info');
  try {
    await entities.updateRecordsById(ENTITY_ID, [...selectedIds].map(id => ({
      [F.ID]: id,
      [F.ASSIGNEE]: newAssignee,
    })));
    setStatus(`Reassigned ${selectedIds.size} tickets. Refreshing…`, 'success');
    document.getElementById('bulk-assignee-input').value = '';
    await loadAll(null);
  } catch (err) {
    console.error(err);
    setStatus(`Reassign failed: ${err?.message || err}`, 'error');
  }
}

// ─── Drill-down panel ───────────────────────────────────────────────────────
function openDrilldown(t) {
  openTicket = t;
  document.getElementById('dd-title').textContent = `Ticket ${formatTicketNumber(t[F.TICKET_NUMBER])}`;
  document.getElementById('dd-customer').textContent = `${t[F.CUSTOMER_NAME] || '—'} <${t[F.CUSTOMER_EMAIL] || ''}>`;
  document.getElementById('dd-subject').textContent = t[F.SUBJECT] || '—';
  document.getElementById('dd-description').textContent = t[F.DESCRIPTION] || '—';
  document.getElementById('dd-created').textContent = t[F.CREATE_TIME] ? new Date(t[F.CREATE_TIME]).toLocaleString() : '—';
  document.getElementById('dd-age').textContent = formatAge(t[F.CREATE_TIME]);

  const form = document.getElementById('dd-form');
  form.elements.status.value          = csIdToLabel(F.STATUS, t[F.STATUS]) || 'Open';
  form.elements.priority.value        = csIdToLabel(F.PRIORITY, t[F.PRIORITY]) || 'Medium';
  form.elements.reasonForDelay.value  = csIdToLabel(F.REASON_FOR_DELAY, t[F.REASON_FOR_DELAY]) || '';
  form.elements.assignee.value        = t[F.ASSIGNEE] || '';

  // Attachment block: show the download button only if the field is non-empty
  const wrap = document.getElementById('dd-attachment-wrap');
  const preview = document.getElementById('dd-attachment-preview');
  preview.innerHTML = '';
  wrap.style.display = t[F.ATTACHMENT] ? '' : 'none';

  document.getElementById('dd-status').textContent = '';
  drilldown.classList.remove('hidden');
}

function closeDrilldown() {
  drilldown.classList.add('hidden');
  openTicket = null;
}

async function onDrilldownSave(e) {
  e.preventDefault();
  if (!openTicket) return;

  const form = e.target;
  const reasonLabel = form.elements.reasonForDelay.value;
  const updates = {
    [F.STATUS]:           csLabelToNumberId(F.STATUS,   form.elements.status.value),
    [F.PRIORITY]:         csLabelToNumberId(F.PRIORITY, form.elements.priority.value),
    [F.REASON_FOR_DELAY]: reasonLabel ? csLabelToNumberId(F.REASON_FOR_DELAY, reasonLabel) : null,
    [F.ASSIGNEE]:         form.elements.assignee.value,
  };

  const ddStatus = document.getElementById('dd-status');
  ddStatus.textContent = 'Saving…';
  ddStatus.className = 'dd-status info';

  try {
    await entities.updateRecordById(ENTITY_ID, openTicket[F.ID], updates);
    ddStatus.textContent = 'Saved. Refreshing dashboard…';
    ddStatus.className = 'dd-status success';
    await loadAll(null);
    closeDrilldown();
  } catch (err) {
    console.error(err);
    ddStatus.textContent = `Save failed: ${err?.message || err}`;
    ddStatus.className = 'dd-status error';
  }
}

async function onAttachmentDownload() {
  if (!openTicket) return;
  const preview = document.getElementById('dd-attachment-preview');
  preview.innerHTML = 'Downloading…';
  try {
    const blob = await entities.downloadAttachment(ENTITY_ID, openTicket[F.ID], F.ATTACHMENT);
    const url = URL.createObjectURL(blob);
    if (blob.type.startsWith('image/')) {
      preview.innerHTML = `<img src="${url}" alt="Attachment" />`;
    } else {
      preview.innerHTML = `<a href="${url}" download="ticket-${openTicket[F.ID]}-attachment">Download file (${blob.type || 'binary'})</a>`;
    }
  } catch (err) {
    console.error(err);
    preview.textContent = `Failed: ${err?.message || err}`;
  }
}

// ─── Chart helper ────────────────────────────────────────────────────────────
function drawBar(canvasId, data, extraOptions = {}) {
  if (charts[canvasId]) charts[canvasId].destroy();
  const ctx = document.getElementById(canvasId);
  charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      ...extraOptions,
    },
  });
}

// ─── Utils ───────────────────────────────────────────────────────────────────
function formatNumber(value) {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString('en-US');
}

function formatMinutes(value) {
  if (value === null || value === undefined) return '—';
  const minutes = Number(value);
  if (Number.isNaN(minutes)) return '—';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

function formatTicketNumber(n) {
  if (n === null || n === undefined) return '—';
  return `#${n}`;
}

function formatAge(createTime) {
  if (!createTime) return '—';
  const ms = Date.now() - new Date(createTime).getTime();
  const minutes = Math.max(0, Math.floor(ms / 60000));
  return formatMinutes(minutes);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function setStatus(message, kind = 'info') {
  statusEl.textContent = message;
  statusEl.className = `status ${kind}`;
}
