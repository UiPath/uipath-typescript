# Data Fabric Aggregate Dashboard (sample)

A vanilla HTML/JS sample that demonstrates the new aggregate query support in the
UiPath TypeScript SDK by powering a small dashboard from a single Data Fabric entity.

What this sample shows:

- KPI cards (total count + sum / avg / max of salary) — one aggregate query, four aggregates
- "Headcount by salary range" and "Total salary by salary range" — five parallel
  `COUNT(Id)` / `SUM(salary)` aggregate queries with range filters, run via `Promise.all`
- "Top 5 titles by total salary" — a true `groupBy` aggregate query

All calls go through `entities.queryRecordsById()` with the new `aggregates` and
`groupBy` options.

## Hardcoded for this demo

| Setting     | Value |
|-------------|-------|
| Environment | `https://alpha.uipath.com` |
| Org name    | `datafabric` |
| Tenant      | `DefaultTenant` |
| Entity      | `AshishShared` (`06365c35-fd3e-f111-8ef3-6045bd00bc8b`) |
| Schema used | `Title` (Text), `salary` (Number) |

To target a different entity or environment, edit the constants at the top of
[`app.js`](./app.js) and the proxy `target` in [`vite.config.js`](./vite.config.js).

## Auth — paste a bearer token

To keep the sample local-only, it skips the OAuth dance and asks you to paste a
bearer token. The token lives in `sessionStorage` (cleared when the tab closes)
and is only sent through the local Vite proxy to alpha.

How to get a token:

1. Open <https://alpha.uipath.com/datafabric/> in a browser tab and sign in normally.
2. Open DevTools → **Network** tab.
3. Click on any `/datafabric_/api/...` request.
4. Copy the value of the `Authorization: Bearer …` request header (everything
   after `Bearer `, no quotes).
5. Paste it into the **Bearer token** input on this sample's page.

UiPath PATs work the same way — paste the token and click Load.

## Run it

The sample depends on the local SDK build via `file:../..`, so build the SDK first:

```bash
# from the repo root
npm install
npm run build
```

Then run the sample:

```bash
cd samples/datafabric-dashboard-app
npm install
npm run dev
```

Open <http://localhost:5173>, paste a bearer token, click **Load Dashboard**.

## Why does this need a dev server (Vite)?

Browser → `alpha.uipath.com` direct calls hit CORS preflight. Vite forwards
`/datafabric/*` requests from `localhost:5173` to `alpha.uipath.com/datafabric/*`,
which sidesteps CORS. The SDK's `baseUrl` is set to `window.location.origin`
so calls go to the proxy, not the cloud directly.

## Files

```
samples/datafabric-dashboard-app/
├── index.html       # Layout + Chart.js CDN
├── app.js           # SDK init, aggregate queries, chart rendering
├── styles.css       # Minimal styling
├── vite.config.js   # Dev server + proxy
├── package.json     # Vite + local SDK dependency
└── README.md
```
