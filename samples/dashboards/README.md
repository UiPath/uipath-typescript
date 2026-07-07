# Dashboard Samples

A collection of UiPath **dashboard** samples — React + TypeScript Coded Apps that visualize live tenant data through the `@uipath/uipath-typescript` SDK: KPI cards with period-over-period deltas, drill-down charts, and record-grain tables.

Pick the dashboard that matches what you want to observe, then open its folder and follow that README to set up and deploy.

## Choose a sample

| Sample | Use it when… | Demonstrates | OAuth scopes |
|--------|--------------|--------------|--------------|
| [`runtime-compliance`](./runtime-compliance) | You want runtime observability over **UiPath compliance checks** on your AI agent fleet — failures, enforcement outcomes, flagged agents, per-run reports. **Requires the Agentic Governance private preview.** | `AgentTraces.getGovernanceSummary` + cursor-paginated `getGovernanceDecisions` (SDK ≥ 1.5.1), client-side derivations, per-card time-range toggles | `Insights`, `Insights.RealTimeData`, `OR.Folders.Read` |
