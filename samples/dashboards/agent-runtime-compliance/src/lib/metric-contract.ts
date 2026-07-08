import type { UiPath } from '@uipath/uipath-typescript/core'

/** A single dynamic data row — the canonical shape for widget + detail data. */
export type Row = Record<string, unknown>

// The data-fetch signature every metric module exports for the MAIN widget.
//
// `sdk` is the authenticated `UiPath` client (services take it via DI:
// `new Agents(sdk)` — no cast needed). The return is `Row[]`
// (`Record<string, unknown>[]`) — the shape the widget/table renderer consumes.
// Rows you build (object literals, `countBy`) satisfy `Row` directly. SDK response
// types are interfaces (no index signature) and don't assign to `Row` as-is —
// project them into plain rows with `.map(x => ({ ...x }))`.
export type MetricFn = (sdk: UiPath, getToken: () => Promise<string>) => Promise<Row[]>

// What a DETAIL fetch may return: a bare array (single detail table) OR a
// named-source map for a RICH detail view — one fetch yields several named
// series (e.g. `{ rows, byHook, byStandard }`) and each `detailView` sub-widget
// reads `data[source]`. The generated detail view normalizes an array to `{ rows }`.
export type MetricResult = Row[] | NamedSourceMap

/** Named-source map for rich detail views: each key feeds one detailView sub-widget
 *  (e.g. { rows, byHook, byStandard }). */
export type NamedSourceMap = Record<string, Row[]>

/** One line/series in a multi-series chart (key = data field, color = CSS var). */
export interface ChartSeriesDef { key: string; color: string }

// Record-grain chart drill-down (`detail: true`): `export const fetchDetail: MetricDetailFn`.
// Return an array for a single table, or a named-source map for a rich detailView.
export type MetricDetailFn = (sdk: UiPath, getToken: () => Promise<string>) => Promise<MetricResult>

// The keyed-detail signature for row-click drill-downs. A table widget with a
// `rowLink` exports this so "click THIS row → fetch THAT entity's records"
// (e.g. fetchDetailByKey(sdk, agentName) → that agent's most recent trace spans).
// Returns an array (single detail table) or a named-source map (rich detail view).
// `key` is the clicked row's link field value (route param).
export type MetricDetailByKeyFn = (sdk: UiPath, key: string, getToken: () => Promise<string>) => Promise<MetricResult>
