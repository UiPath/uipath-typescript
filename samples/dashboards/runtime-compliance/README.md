# Runtime Compliance Dashboard

A sample React + TypeScript dashboard for **UiPath agentic runtime-governance insights**: compliance check results, enforcement outcomes, and flagged agents across your AI agent fleet, built with the UiPath TypeScript SDK. Deploys as a UiPath Coded App.

> [!IMPORTANT]
> **Agentic Governance private preview required.** This dashboard reads agentic runtime-governance insights — the results of **UiPath compliance checks** (recommended runtime safeguards evaluated during agent runs, distinct from admin-deployed policies). Data appears only when your organization is **enrolled in the Agentic Governance private preview** and your agents run with compliance checks enabled. Outside the preview, the dashboard deploys and signs in fine but every widget shows an empty state — deploy it once your org is opted in.

> [!NOTE]
> **Data access.** If the APIs return `403`, your account doesn't have access to governance data for the organization — ask your administrator.

## What it shows

| Widget | Description |
| ------ | ----------- |
| **Failed Compliance Checks** (KPI) | Deny verdicts in the window, with a change badge vs the prior equal-length period. Click → every failed check with agent, check, hook, mode, action, and full reason text. |
| **Checks Failing** (KPI) | Distinct compliance checks with at least one failure. Click → evaluated-vs-failed per check. |
| **Flagged Agents** (KPI) | Agents with at least one failed check. Click → evaluated-vs-failed per agent. |
| **Enforcement Outcomes** (donut) | All evaluations split allowed / denied (enforced) / observed-only (audit mode). |
| **Why Checks Failed** (donut) | Failures grouped by reason — run-specific numbers are stripped so similar reasons merge. |
| **Agents by Failed Checks** (table) | Ranked highest first, with Top 5/10/20 toggle. |
| **Agent Compliance by Run** (table) | One row per agent run, paginated. Click a run → its full report: checks passed vs failed per lifecycle hook, what was denied and why, and the complete decision log. |

The KPI row shares one 24h / 7d / 30d toggle; each chart and the agents table carry their own.

## SDK Usage

### Importing the SDK

```typescript
// Core SDK for authentication
import { UiPath, UiPathError } from '@uipath/uipath-typescript/core';

// Agent traces service — carries the governance insights methods (SDK >= 1.5.1)
import {
  AgentTraces,
  AgentGovernanceMode,
  AgentGovernanceVerdict,
} from '@uipath/uipath-typescript/traces';
import type { AgentGovernanceDecisionGetResponse } from '@uipath/uipath-typescript/traces';
```

### Initializing the SDK

```typescript
// Create SDK instance — empty config is fine for Coded Apps;
// the SDK reads from <meta name="uipath:*"> tags injected by the platform
// (or by the @uipath/coded-apps-dev Vite plugin during local dev).
const sdk = new UiPath();
await sdk.initialize();

const traces = new AgentTraces(sdk);

// Aggregated posture for a window (+ the prior window for the change badge)
const summary = await traces.getGovernanceSummary(start, { endTime: end, topN: 100 });
console.log(`${summary.violations} failed of ${summary.total} checks`);

// Every individual decision — one page per call, so loop the cursor
let page = await traces.getGovernanceDecisions(start, { endTime: end, pageSize: 200 });
const rows = [...page.items];
while (page.hasNextPage && page.nextCursor) {
  page = await traces.getGovernanceDecisions(start, { endTime: end, pageSize: 200, cursor: page.nextCursor });
  rows.push(...page.items);
}
```

### SDK methods exercised by this sample

| Service | Method | Where it's used |
| ------- | ------ | --------------- |
| `AgentTraces` | `getGovernanceSummary` | KPI totals + prior-period change badge (`useKpis`) |
| `AgentTraces` | `getGovernanceDecisions` (cursor-paginated) | Donuts, agents table, runs table, run reports, and every drill-down (`useDecisions`) |

Everything else — outcome classification (audit mode = observed-only), reason normalization, per-run grouping by `traceId` — is derived client-side in [`src/lib/governance.ts`](./src/lib/governance.ts).

## Getting Started

### Prerequisites

- Node.js 20+
- An **External Application** (non-confidential) in your UiPath org with:
  - Scopes: `Insights Insights.RealTimeData OR.Folders.Read`
  - Redirect URI: `http://localhost:5173`

### Run locally

```bash
npm install
cp uipath.json.example uipath.json   # fill in clientId, orgName, tenantName
npm run dev
```

Open `http://localhost:5173` and sign in with your UiPath account.

## Building for Production

```bash
npm run build
```

Built bundle lives in `dist/`. From there:

```bash
# One-time: install the codedapp tool plugin for the uip CLI.
uip tools install codedapp

# Sign in with the uip CLI (interactive — pick the org + tenant to deploy to).
uip login --it

uip codedapp pack ./dist --name runtime-compliance-dashboard --version 1.0.0
uip codedapp publish
uip codedapp deploy
```

See the [Coded Apps CLI reference](https://uipath.github.io/uipath-typescript/coded-apps/cli-reference/) for full options.

## Troubleshooting

1. **Every widget is empty** — your organization isn't enrolled in the Agentic Governance private preview, or your agents aren't running with UiPath compliance checks enabled. There is genuinely no data to show until both are true.

2. **`403` / access errors** — your account doesn't have access to governance data for the organization. Ask your administrator.

3. **Authentication fails / "Invalid redirect URI"** — verify the redirect URI on the External App matches `http://localhost:5173` for dev, and your deployed URL for production.

4. **`getGovernanceDecisions is not a function`** — your installed SDK is older than `1.5.1`; run `npm install` to pick up the version pinned by this sample.

### Getting help

- [UiPath TypeScript SDK documentation](https://uipath.github.io/uipath-typescript/)

## Technologies Used

- **React 19** + **TypeScript** + **Vite**
- **@uipath/uipath-typescript** — the SDK under test (`AgentTraces` governance insights, ≥ 1.5.1)
- **@uipath/coded-apps-dev** — Vite plugin emitting `<meta name="uipath:*">` tags during local dev
- **Recharts** for the donuts · **Tailwind CSS** · **lucide-react** icons
- **OAuth 2.0** (handled by the SDK) for authentication
