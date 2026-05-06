import { UiPath } from '@uipath/uipath-typescript/core';
import {
  Entities,
  EntityAggregateFunction,
  LogicalOperator,
  QueryFilterOperator,
} from '@uipath/uipath-typescript/entities';

// ─── Hardcoded demo config ───────────────────────────────────────────────────
//
// Vite proxies /datafabric → https://alpha.uipath.com/datafabric (see vite.config.js).
// The SDK builds URLs like {baseUrl}/{orgName}/{tenantName}/datafabric_/api/...
// so we point baseUrl at the local origin and let the dev server forward.
const CONFIG = {
  baseUrl: window.location.origin,
  orgName: 'datafabric',
  tenantName: 'DefaultTenant',
};

const ENTITY_ID = '06365c35-fd3e-f111-8ef3-6045bd00bc8b'; // AshishShared

// Salary buckets used by the "by salary range" charts. Adjust if your data
// distribution is different — each bucket becomes one parallel aggregate query.
const SALARY_BUCKETS = [
  { label: '< 30k',     min: null,   max: 30000  },
  { label: '30k–60k',   min: 30000,  max: 60000  },
  { label: '60k–100k',  min: 60000,  max: 100000 },
  { label: '100k–150k', min: 100000, max: 150000 },
  { label: '≥ 150k',    min: 150000, max: null   },
];

const TOKEN_STORAGE_KEY = 'datafabric-dashboard-token';

// ─── DOM refs ────────────────────────────────────────────────────────────────
const tokenInput = document.getElementById('token-input');
const applyBtn = document.getElementById('apply-token-btn');
const clearBtn = document.getElementById('clear-token-btn');
const statusEl = document.getElementById('status');
const schemaPanel = document.getElementById('schema-panel');
const dashboard = document.getElementById('dashboard');
const entityNameEl = document.getElementById('entity-name');
const entityFieldsEl = document.getElementById('entity-fields');

const charts = {};

// ─── Entrypoint ──────────────────────────────────────────────────────────────
applyBtn.addEventListener('click', () => loadDashboard(tokenInput.value.trim()));
clearBtn.addEventListener('click', () => {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  tokenInput.value = '';
  schemaPanel.classList.add('hidden');
  dashboard.classList.add('hidden');
  setStatus('Token cleared.', 'info');
});

// Auto-load if a token is already in this tab's session
const savedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
if (savedToken) {
  tokenInput.value = savedToken;
  loadDashboard(savedToken);
}

async function loadDashboard(token) {
  if (!token) {
    setStatus('Paste a bearer token first.', 'error');
    return;
  }

  applyBtn.disabled = true;
  setStatus('Initializing SDK and loading entity schema…', 'info');

  try {
    const sdk = new UiPath({ ...CONFIG, secret: token });
    const entities = new Entities(sdk);

    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);

    const entity = await entities.getById(ENTITY_ID);
    renderSchema(entity);

    setStatus('Running aggregate queries…', 'info');
    await Promise.all([
      renderKpis(entities),
      renderCountBySalaryRange(entities),
      renderSumBySalaryRange(entities),
      renderTopTitlesBySalary(entities),
    ]);

    setStatus(`Dashboard loaded for "${entity.displayName || entity.name}".`, 'success');
    dashboard.classList.remove('hidden');
  } catch (err) {
    console.error(err);
    const message = err?.message || String(err);
    setStatus(`Failed: ${message}`, 'error');
  } finally {
    applyBtn.disabled = false;
  }
}

// ─── Schema view ─────────────────────────────────────────────────────────────
function renderSchema(entity) {
  entityNameEl.textContent = `${entity.displayName || entity.name} (${entity.name})`;
  entityFieldsEl.innerHTML = '';
  for (const field of entity.fields || []) {
    const tag = document.createElement('span');
    tag.className = 'field-tag';
    tag.innerHTML = `<strong>${field.name}</strong> <span class="type">${field.fieldDataType?.name || ''}</span>`;
    entityFieldsEl.appendChild(tag);
  }
  schemaPanel.classList.remove('hidden');
}

// ─── KPI cards: total + sum/avg/max with no groupBy ──────────────────────────
async function renderKpis(entities) {
  // One query, four aggregates — server returns a single row keyed by alias.
  const result = await entities.queryRecordsById(ENTITY_ID, {
    aggregates: [
      { function: EntityAggregateFunction.Count, field: 'Id',     alias: 'count' },
      { function: EntityAggregateFunction.Sum,   field: 'salary', alias: 'sum'   },
      { function: EntityAggregateFunction.Avg,   field: 'salary', alias: 'avg'   },
      { function: EntityAggregateFunction.Max,   field: 'salary', alias: 'max'   },
    ],
  });

  const row = result.items?.[0] || {};
  document.getElementById('kpi-count').textContent = formatNumber(row.count);
  document.getElementById('kpi-sum').textContent   = formatCurrency(row.sum);
  document.getElementById('kpi-avg').textContent   = formatCurrency(row.avg);
  document.getElementById('kpi-max').textContent   = formatCurrency(row.max);
}

// ─── Bar: count by salary range (parallel filtered COUNT queries) ────────────
async function renderCountBySalaryRange(entities) {
  const counts = await runBucketQueries(entities, EntityAggregateFunction.Count, 'Id', 'count');
  drawBarChart('chart-count-by-range', {
    labels: SALARY_BUCKETS.map(b => b.label),
    datasets: [{
      label: 'Records',
      data: counts,
      backgroundColor: '#fa4616',
    }],
  });
}

// ─── Bar: total salary by salary range ───────────────────────────────────────
async function renderSumBySalaryRange(entities) {
  const sums = await runBucketQueries(entities, EntityAggregateFunction.Sum, 'salary', 'sum');
  drawBarChart('chart-sum-by-range', {
    labels: SALARY_BUCKETS.map(b => b.label),
    datasets: [{
      label: 'Total salary',
      data: sums,
      backgroundColor: '#2563eb',
    }],
  });
}

async function runBucketQueries(entities, fn, field, alias) {
  const queries = SALARY_BUCKETS.map(bucket => {
    const filters = [];
    if (bucket.min !== null) {
      filters.push({ fieldName: 'salary', operator: QueryFilterOperator.GreaterThanOrEqual, value: String(bucket.min) });
    }
    if (bucket.max !== null) {
      filters.push({ fieldName: 'salary', operator: QueryFilterOperator.LessThan, value: String(bucket.max) });
    }
    return entities.queryRecordsById(ENTITY_ID, {
      filterGroup: { logicalOperator: LogicalOperator.And, queryFilters: filters },
      aggregates: [{ function: fn, field, alias }],
    });
  });

  const results = await Promise.all(queries);
  return results.map(r => Number(r.items?.[0]?.[alias] ?? 0));
}

// ─── Bar: top 5 titles by total salary (true groupBy) ────────────────────────
async function renderTopTitlesBySalary(entities) {
  const result = await entities.queryRecordsById(ENTITY_ID, {
    selectedFields: ['Title'],
    groupBy: ['Title'],
    aggregates: [
      { function: EntityAggregateFunction.Sum, field: 'salary', alias: 'totalSalary' },
    ],
  });

  // Sort + slice client-side: aggregate sorting on aliases isn't yet wired
  // through the SDK options, so we get all groups and trim here.
  const top = (result.items || [])
    .map(r => ({ title: r.Title ?? '(blank)', total: Number(r.totalSalary ?? 0) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  drawBarChart('chart-top-titles', {
    labels: top.map(r => r.title),
    datasets: [{
      label: 'Total salary',
      data: top.map(r => r.total),
      backgroundColor: '#16a34a',
    }],
  }, { indexAxis: 'y' });
}

// ─── Chart helper ────────────────────────────────────────────────────────────
function drawBarChart(canvasId, data, extraOptions = {}) {
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

function formatCurrency(value) {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function setStatus(message, kind = 'info') {
  statusEl.textContent = message;
  statusEl.className = `status ${kind}`;
}
