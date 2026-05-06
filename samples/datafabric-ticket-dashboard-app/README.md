# Ticket Operations Dashboard (sample)

A vanilla HTML/JS sample showing the **Ticket Operations Dashboard** demo from
[the Confluence demo script](https://uipath.atlassian.net/wiki/spaces/CC/pages/90657849606/Ticket+system).

A support team lead's morning workspace — KPIs, four aggregate charts, a filtered
ticket list with drill-down + bulk reassign — all powered by Data Fabric and
the UiPath TypeScript SDK only.

## What it demonstrates

| Feature | SDK call |
|---|---|
| KPIs (open count, SLA breaches, avg open age, resolved count) | `entities.queryRecordsById(...)` with `aggregates` (multi-aggregate single query for open + avg) |
| Tickets per agent | `aggregates` + `groupBy: ['assignee']` |
| Avg resolution time by category | `aggregates` (AVG) + `groupBy: ['category']` |
| Where time is going | `aggregates` (COUNT) + `groupBy: ['reasonForDelay']` |
| Tickets by age | 4 parallel filtered `COUNT` aggregate queries via `Promise.all` |
| Drill-down list with filters | `queryRecordsById` with `filterGroup`, `sortOptions`, `pageSize` |
| Inline edit (status / priority / reason / assignee) | `entities.updateRecordById(...)` |
| Bulk reassign | `entities.updateRecordsById(...)` |
| Attachment preview | `entities.downloadAttachment(...)` |

## Hardcoded for this demo

| Setting | Value |
|---|---|
| Environment | `https://staging.uipath.com` |
| Org name | `dataservicetest` |
| Tenant | `ashishTest` |
| Entity ID | `cbcc0a09-6b49-f111-8ef3-000d3a261acd` (`Tickets`) |

To target a different entity / environment, edit the constants at the top of
[`app.js`](./app.js) and the proxy `target` in [`vite.config.js`](./vite.config.js).

## Expected entity schema

The app expects a `Tickets` entity with the following local fields (camelCase).
If your entity uses different field names, edit the `F` constants object near
the top of `app.js`.

| Field | Type |
|---|---|
| `ticketNumber` | AUTO_NUMBER |
| `subject` | STRING |
| `description` | MULTILINE_TEXT |
| `customerName` | STRING |
| `customerEmail` | STRING |
| `assignee` | STRING (agent email) |
| `status` | CHOICE_SET_SINGLE → `Open` / `InProgress` / `WaitingOnCustomer` / `Escalated` / `Resolved` / `Closed` |
| `priority` | CHOICE_SET_SINGLE → `Critical` / `High` / `Medium` / `Low` |
| `category` | CHOICE_SET_SINGLE → `Billing` / `Technical` / `Account` / `FeatureRequest` / `Other` |
| `reasonForDelay` | CHOICE_SET_SINGLE (nullable) → `AwaitingCustomer` / `AwaitingEngineering` / `PendingRefundApproval` / `AwaitingApproval` / `KnowledgeGap` |
| `resolutionMinutes` | **Number** (running clock for open tickets, final value for resolved) |
| `resolvedTime` | DATETIME (nullable) |
| `attachment` | FILE (nullable) |

> **`resolutionMinutes` must be Number, not Text.** AVG / SUM / MIN / MAX
> aggregates only operate on numeric fields server-side. With a text field, the
> "Avg open age" KPI and "Resolution time by category" chart will fail.

## Auth — paste a bearer token

This sample skips the OAuth flow and asks you to paste a bearer token. The
token lives in `sessionStorage` (cleared when the tab closes) and is only sent
through the local Vite proxy to staging.

How to get a token:

1. Open <https://staging.uipath.com/dataservicetest/ashishTest/datafabric_/> in
   a browser tab and sign in normally.
2. Open DevTools → **Network** tab.
3. Click on any `/datafabric_/api/...` request.
4. Copy the value of the `Authorization: Bearer …` header (everything after
   `Bearer `, no quotes).
5. Paste it into the **Bearer token** input on this sample's page.

## Run it

The sample depends on the local SDK build via `file:../..`, so build the SDK first:

```bash
# from the repo root
npm install
npm run build
```

Then run the sample:

```bash
cd samples/datafabric-ticket-dashboard-app
npm install
npm run dev
```

Open <http://localhost:5174>, paste a bearer token, click **Load Dashboard**.

## Why does this need a dev server (Vite)?

Browser → `staging.uipath.com` direct calls hit CORS preflight. Vite forwards
`/dataservicetest/*` requests from `localhost:5174` to
`staging.uipath.com/dataservicetest/*`, sidestepping CORS. The SDK's
`baseUrl` is set to `window.location.origin` so calls go to the proxy, not the
cloud directly.

## Files

```
samples/datafabric-ticket-dashboard-app/
├── index.html       # Layout (KPIs, charts, list, drill-down)
├── app.js           # SDK init, aggregate queries, write-back, chart rendering
├── styles.css       # Styling
├── vite.config.js   # Dev server + proxy
├── package.json     # Vite + local SDK dependency
└── README.md
```
