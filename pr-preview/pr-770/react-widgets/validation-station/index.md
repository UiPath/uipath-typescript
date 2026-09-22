# Validation Station

A React wrapper for the UiPath Document Understanding **Validation Station**. It handles web component loading and bucket artifact fetching, and exposes a declarative props API for every Validation Station feature.

Package: `@uipath/ui-widgets-validation-station`

## Installation

```
npm install @uipath/ui-widgets-validation-station
```

### Peer dependencies

```
npm install react@^19.2.0 react-dom@^19.2.0 @uipath/uipath-typescript@^1.4.2
```

## Quick start

Theming

Add either a `light` or `dark` class to your HTML `<body>` element to enable proper theming.

```
import {
  configureValidationStationWc,
  ValidationStation,
} from "@uipath/ui-widgets-validation-station";
import { UiPath } from "@uipath/uipath-typescript/core";
import type { DuFramework } from "@uipath/uipath-typescript/document-understanding";
import { useEffect, useState } from "react";

// Once, at app startup — loads the web component from `du-vs-wc`, next to
// your app's own root by default. See "Hosting the web component" below.
configureValidationStationWc();

function App({ task }: { task: { data: DuFramework.ContentValidationData } }) {
  const [sdk, setSdk] = useState<UiPath | null>(null);

  useEffect(() => {
    const init = async () => {
      const uipath = new UiPath({
        baseUrl: "https://cloud.uipath.com",
        orgName: "your-org",
        tenantName: "your-tenant",
        clientId: "your-client-id",
        // `OR.Buckets` is the widget's own need; `OR.Tasks` is for the host
        // code that fetches the task and completes it after submit.
        scope: "OR.Buckets OR.Tasks",
        redirectUri: "http://localhost:3000/callback",
      });
      await uipath.initialize();
      setSdk(uipath);
    };
    init();
  }, []);

  if (!sdk) return <div>Loading...</div>;

  return <ValidationStation sdk={sdk} data={task.data} />;
}
```

`initialize()` drives the OAuth redirect

Under OAuth, `initialize()` navigates the browser to the identity provider and completes the flow when it returns, so keep it inside an effect rather than at module scope, and serve `redirectUri` as a route of this same app — it must match a URI registered on the external application exactly, scheme and path included.

`theme` defaults to `"light"` and `language` defaults to `ValidationStationLanguage.English`, so the minimal mount just needs `sdk` and `data`.

Call `configureValidationStationWc` first

You must call it once before rendering any widget from this package, and host the web component's files where it expects them. A `deploymentUrl` default handles this for most hosts — override it if yours doesn't. See [Hosting the web component](#hosting-the-web-component).

## Data sources

The widget needs a taxonomy, an extraction result and a document DOM. There are two mutually exclusive ways to give it those:

| Mode              | Pass                         | Who fetches                                                   | Who writes back                                 |
| ----------------- | ---------------------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| **Self-fetching** | `sdk` + `data`               | The widget, from the bucket paths on `ContentValidationData`  | The widget, to `ValidatedExtractionResultsPath` |
| **Pre-fetched**   | `artifacts` (+ `documentId`) | You — hand it a `DuDocumentArtifacts` object you already hold | You, from the request the widget emits          |

**The outputs do not change with the mode.** `onSubmit`, `onSaveAsDraft` and `onReportException` fire for every user action either way, and always carry the request the web component produced. The only difference is a second argument: when the widget persisted the data itself, it passes the outcome too.

Pre-fetched mode is what you want when the document does not live in a storage bucket, when the artifacts are already in memory, or when persistence goes somewhere other than `ValidatedExtractionResultsPath`.

```
import {
  ValidationStation,
  type DuDocumentArtifacts,
} from "@uipath/ui-widgets-validation-station";

function App({ artifacts }: { artifacts: DuDocumentArtifacts }) {
  return (
    <ValidationStation
      artifacts={artifacts}
      documentId="doc-123"
      onSubmit={(request) => persistItYourself(request)}
    />
  );
}
```

Every bucket call is scoped to the folder `data` names — `FolderId`, or `FolderKey` when both are present. The activity that produces the `ContentValidationData` sets one of them; if neither is there, the widget renders an error instead of fetching.

The two modes can be mixed: pass `artifacts` **and** `sdk` + `data` to skip the fetch while keeping the built-in write-back — `onSubmit` then receives the outcome as well.

`DuDocumentArtifacts`

`{ taxonomy, extractionResult, dom, text, customizationInfo, original }` — `original` is the base64-encoded document the viewer renders.

### Owning the round-trip

Pre-fetched mode does not mean writing the bucket plumbing yourself. Everything the widget does internally is exported, so a host can drive the same flow:

| Export                                         | Use                                                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `fetchDuDocumentArtifacts(sdk, data)`          | Fetch `DuDocumentArtifacts` imperatively — outside render, ahead of time, or in a loader |
| `useDuDocumentArtifacts(sdk, data)`            | The same fetch as a hook, for when the fetch belongs to a component's lifecycle          |
| `submitValidatedData(sdk, data, request)`      | The submit flow: `ProcessExtractedData`, then upload to `ValidatedExtractionResultsPath` |
| `saveValidatedDataAsDraft(sdk, data, request)` | The draft flow: upload `validatedData` straight to the bucket                            |

```
import {
  fetchDuDocumentArtifacts,
  submitValidatedData,
  saveValidatedDataAsDraft,
  ValidationStation,
  type DuDocumentArtifacts,
} from "@uipath/ui-widgets-validation-station";

function HostOwnedReview({ sdk, data }) {
  const [artifacts, setArtifacts] = useState<DuDocumentArtifacts | null>(null);

  useEffect(() => {
    fetchDuDocumentArtifacts(sdk, data).then(setArtifacts);
  }, [sdk, data]);

  if (!artifacts) return <div>Loading document…</div>;

  return (
    <ValidationStation
      artifacts={artifacts}
      documentId={data.DocumentId}
      // no sdk / data — the host loads and persists
      onSubmit={async (request) => {
        const result = await submitValidatedData(sdk, data, request);
        afterSubmit(result);
      }}
      onSaveAsDraft={(request) => saveValidatedDataAsDraft(sdk, data, request)}
    />
  );
}
```

Handle both callbacks

The widget always offers **Save as draft**, so leaving `onSaveAsDraft` unwired means a draft click persists nothing.

The request payloads are exported too — `IVsSaveValidatedDataRequest`, `IVsSaveValidatedDataAsDraftRequest` and `IVsSaveExceptionReportRequest` — so handlers declared outside JSX can name their parameter.

## Props

| Prop                             | Type                                           | Required | Default   | Description                                                                                                                                                                                                                                                            |
| -------------------------------- | ---------------------------------------------- | -------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk`                            | `UiPath`                                       | No\*     | —         | UiPath SDK instance for authentication and API calls. Required for self-fetching / persistence                                                                                                                                                                         |
| `data`                           | `ContentValidationData`                        | No\*     | —         | Document data containing the bucket paths, document ID, and the folder they live in — `FolderId` or `FolderKey`, whichever the producing activity set. Required for self-fetching / persistence                                                                        |
| `artifacts`                      | `DuDocumentArtifacts`                          | No\*     | —         | Pre-fetched document artifacts. When supplied, no bucket fetch is performed. \*Either `artifacts` or `sdk` + `data` must be provided                                                                                                                                   |
| `documentId`                     | `string`                                       | No       | —         | Document ID forwarded to the web component. Falls back to `data.DocumentId` — pass it in pre-fetched mode, where there is no `data`                                                                                                                                    |
| `theme`                          | `'light' \| 'dark' \| 'light-hc' \| 'dark-hc'` | No       | `'light'` | Visual theme                                                                                                                                                                                                                                                           |
| `language`                       | `ValidationStationLanguage`                    | No       | `English` | UI language (see [the enum](#language-enum))                                                                                                                                                                                                                           |
| `isReadonly`                     | `boolean`                                      | No       | `false`   | When `true`, renders in read-only mode                                                                                                                                                                                                                                 |
| `persistent`                     | `boolean`                                      | No       | `false`   | Render the persistent element variant, which survives portal/DOM detachment (e.g. tab switches)                                                                                                                                                                        |
| `options`                        | `IValidationStationOptions`                    | No       | —         | Fine-grained UI feature flags, passed through to the element as given                                                                                                                                                                                                  |
| `save={{ validate: false }}`     | `{ validate: boolean }`                        | No       | —         | Trigger **save as draft**                                                                                                                                                                                                                                              |
| `save={{ validate: true }}`      | `{ validate: boolean }`                        | No       | —         | Trigger **submit** — runs validation first, then saves                                                                                                                                                                                                                 |
| `discardChanges`                 | `{ value: boolean }`                           | No       | —         | Trigger a discard-changes operation. Call `setDiscardChanges({ value: true })` (or `false` — the boolean is ignored) every time you want it to fire. Each call creates a brand-new object even if the content looks identical, and that is what the widget watches for |
| `setFieldValueByPath`            | `SetFieldValueByPath`                          | No       | —         | Set a field value addressed by a path of `{ fieldName, valueIndex }` segments                                                                                                                                                                                          |
| `selectAndFocusFieldValueByPath` | `SelectAndFocusFieldValueByPath`               | No       | —         | Select and focus a field value addressed by a path; focuses the document reference if any                                                                                                                                                                              |
| `deleteFieldValueByPath`         | `DeleteFieldValueByPath`                       | No       | —         | Delete a field value addressed by a path                                                                                                                                                                                                                               |

The three save callbacks (`onSubmit`, `onSaveAsDraft`, `onReportException`) are documented [below](#reacting-to-save-draft-and-exception-flows); the state callbacks in [Reading the document state](#reading-the-document-state).

## Reacting to save, draft and exception flows

The widget surfaces three user-initiated flows and reports each through exactly one callback, whichever mode it is in. Every callback receives the raw request; `result` is filled in only for the flows the widget persisted itself.

| Callback            | User action             | Signature                    | What the widget does                                                                                                                                               | What the host does                                                                                                                       |
| ------------------- | ----------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `onSubmit`          | **Submit**              | `(request, result?) => void` | With `sdk` + `data`: `processExtractedData`, then uploads to `ValidatedExtractionResultsPath`, and passes the outcome as `result`. Without: emits the request only | React to `result`, or — when it is absent — persist the request yourself (`submitValidatedData` does exactly what the widget would have) |
| `onSaveAsDraft`     | **Save as draft**       | `(request, result?) => void` | With `sdk` + `data`: uploads `validatedData` straight to the bucket (no `processExtractedData`). Without: emits the request only                                   | Same as above; the host-side equivalent is `saveValidatedDataAsDraft`                                                                    |
| `onReportException` | **Report as exception** | `(request) => void`          | Nothing — the widget never persists exceptions, in either mode. The reason is at `request.exceptionReport.Reason`                                                  | Required if you want the report persisted — call `OrchestratorDuModule.submitExceptionReport(...)` yourself                              |

Submit and draft hand you a `SaveValidatedDataResult` (`{ success, error? }`) — the host owns all UI feedback (toast, retry, etc.); the widget does not surface failures itself. The exception callback hands you `documentId` and `reason` strings ready to forward to the SDK.

All three fire on every user action, regardless of mode — that is the contract. Only `result` varies.

```
import {
  ValidationStation,
  type SaveValidatedDataResult,
} from "@uipath/ui-widgets-validation-station";
import { OrchestratorDuModule } from "@uipath/uipath-typescript/orchestrator-du-module";

function App({ sdk, data, task }) {
  // `sdk` + `data` are set, so the widget persisted it and `result` is present.
  const handleSubmit = async (request, result?: SaveValidatedDataResult) => {
    if (!result?.success) {
      console.warn("Submit failed:", result?.error);
      return;
    }
    await task.complete({ action: "Completed", type: "DocumentValidation" });
  };

  const handleSaveAsDraft = (request, result?: SaveValidatedDataResult) => {
    if (!result?.success) console.warn("Draft save failed:", result?.error);
  };

  const handleReportException = async (request) => {
    const reason = request.exceptionReport?.Reason ?? "";
    const response = await new OrchestratorDuModule(sdk).submitExceptionReport(
      task.id,
      request.documentId,
      reason || "Reported via Validation Station",
      { folderId: task.folderId },
    );
    if (!response.IsSuccessful) {
      console.error("submitExceptionReport failed:", response.ErrorMessage);
    }
  };

  return (
    <ValidationStation
      sdk={sdk}
      data={data}
      onSubmit={handleSubmit}
      onSaveAsDraft={handleSaveAsDraft}
      onReportException={handleReportException}
    />
  );
}
```

Failures are silent if you skip the callbacks

All three callbacks are optional, but the widget surfaces no errors on its own. `onReportException` is the only place the report goes — without it, the user's **Report as exception** click is a no-op.

## Reading the document state

These callbacks report the rest of the element's `IValidationStationStandaloneWcEventMap`; the three save flows are above.

| Prop                                     | Fires when                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `onExtractionResultChanged`              | Any change to the extraction result — needs `options={{ emitDtoStateChanges: true }}` |
| `onLoaded`                               | The element finished loading                                                          |
| `onDirtyChange`                          | Unsaved changes appear or are cleared                                                 |
| `onIsValidChange`                        | Validity flips (`true` = no Must rule broken, no invalid values)                      |
| `onDocumentTypeChanged`                  | The user picks another document type                                                  |
| `onFieldValueSelected`                   | The user selects a field value                                                        |
| `onFieldValueChanged`                    | The user edits a field value                                                          |
| `onBusinessRulesEvaluated`               | Validation errors and business rules are re-evaluated                                 |
| `onSaveResult`                           | A `save` command completes                                                            |
| `onSetFieldValueByPathResult`            | A `setFieldValueByPath` command completes                                             |
| `onSelectAndFocusFieldValueByPathResult` | A `selectAndFocusFieldValueByPath` command completes                                  |
| `onDeleteFieldValueByPathResult`         | A `deleteFieldValueByPath` command completes                                          |
| `onFieldsPanelWidthChanged`              | The fields panel is resized (width in px)                                             |
| `onFieldsPanelSideChanged`               | The panel moves to the other side of the viewer                                       |

Commands need a loaded document

`setFieldValueByPath`, `selectAndFocusFieldValueByPath` and `deleteFieldValueByPath` resolve their `path` against the taxonomy and the current extraction result, so one issued before those arrive fails to resolve. Gate on `onLoaded`, and wire the matching `*Result` callback — it carries the reason (`No field value found at path …`), which is otherwise invisible.

`onTaxonomyLoaded` is the exception. The element never emits it — the taxonomy is an input, not something it produces — so the wrapper reports it instead, handing you the `DocumentTaxonomy` it resolved:

```
<ValidationStation
  sdk={sdk}
  data={contentValidationData}
  onTaxonomyLoaded={(taxonomy) => setFields(taxonomy.DocumentTypes)}
/>
```

It fires once per taxonomy — on mount in pre-fetched mode, and once the fetch resolves in self-fetching mode, which is otherwise the only mode where the host never sees the taxonomy at all. It lands *before* `onLoaded`, so it is not a substitute for it: commands still need the element loaded.

## Language enum

`ValidationStationLanguage` provides all supported locales:

```
import { ValidationStationLanguage } from "@uipath/ui-widgets-validation-station";

ValidationStationLanguage.English; // "en"
ValidationStationLanguage.German; // "de"
ValidationStationLanguage.Spanish; // "es"
ValidationStationLanguage.SpanishMexico; // "es-MX"
ValidationStationLanguage.French; // "fr"
ValidationStationLanguage.Japanese; // "ja"
ValidationStationLanguage.Korean; // "ko"
ValidationStationLanguage.Portuguese; // "pt"
ValidationStationLanguage.PortugueseBrazil; // "pt-BR"
ValidationStationLanguage.Romanian; // "ro"
ValidationStationLanguage.Russian; // "ru"
ValidationStationLanguage.Turkish; // "tr"
ValidationStationLanguage.ChineseSimplified; // "zh-CN"
ValidationStationLanguage.ChineseTraditional; // "zh-TW"
```

## Exported types

All parameter types are re-exported from the package for convenience:

```
import {
  configureValidationStationWc,
  DU_WC_TAGS,
  joinDeploymentUrl,
  VALIDATION_STATION_TAG,
  ValidationStationLanguage,
} from "@uipath/ui-widgets-validation-station";
import type {
  ValidationStationProps,
  ValidationStationWcConfig,
  DuArtifactsSource,
  DuDocumentArtifacts,
  IValidationStationOptions,
  IVsSaveValidatedDataRequest,
  IVsSaveValidatedDataAsDraftRequest,
  IVsSaveExceptionReportRequest,
  SaveValidatedDataResult,
  SetFieldValueByPath,
  SelectAndFocusFieldValueByPath,
  DeleteFieldValueByPath,
  ValidationStationEventProps,
  VsStateEventProps,
  VsSaveResultEventProps,
  IFieldValueDetailsDto,
  EvaluatedBusinessRulesForFieldValueDto,
  ISaveResult,
  SetFieldValueByPathResult,
  SelectAndFocusFieldValueByPathResult,
  DeleteFieldValueByPathResult,
} from "@uipath/ui-widgets-validation-station";
```

`DU_WC_TAGS` and `VALIDATION_STATION_TAG` are the custom-element tag names the loader registers — useful for `document.querySelector` or asserting readiness in tests. The wrappers in this package render them for you.

## Examples

### Setting a field value by path

Address fields by path when you have nested groups or table rows. Each segment is `{ fieldName, valueIndex }`.

Paths resolve only after the document loads

See [Reading the document state](#reading-the-document-state). Wire `onSetFieldValueByPathResult` while you are building this, or a mistimed command fails silently.

```
import { useState } from "react";
import {
  ValidationStation,
  type SetFieldValueByPath,
} from "@uipath/ui-widgets-validation-station";

function App({ sdk, data }) {
  const [fieldValueByPath, setFieldValueByPath] = useState<
    SetFieldValueByPath | undefined
  >(undefined);

  return (
    <>
      <button
        onClick={() =>
          setFieldValueByPath({
            path: [
              { fieldName: "Invoice", valueIndex: 0 }, // parent field name
              { fieldName: "Amount", valueIndex: 0 }, // child field name
            ],
            update: { Value: "100.00", OperatorConfirmed: true },
          })
        }
      >
        Set Amount by path
      </button>
      <ValidationStation
        sdk={sdk}
        data={data}
        setFieldValueByPath={fieldValueByPath}
      />
    </>
  );
}
```

### Focusing a field by path

```
import { useState } from "react";
import {
  ValidationStation,
  type SelectAndFocusFieldValueByPath,
} from "@uipath/ui-widgets-validation-station";

function App({ sdk, data }) {
  const [focus, setFocus] = useState<
    SelectAndFocusFieldValueByPath | undefined
  >(undefined);

  return (
    <>
      <button
        onClick={() =>
          setFocus({
            path: [
              { fieldName: "Invoice", valueIndex: 0 },
              { fieldName: "Amount", valueIndex: 0 },
            ],
          })
        }
      >
        Focus Amount by path
      </button>
      <ValidationStation
        sdk={sdk}
        data={data}
        selectAndFocusFieldValueByPath={focus}
      />
    </>
  );
}
```

### Triggering save

```
const [save, setSave] = useState<{ validate: boolean } | undefined>(undefined);

<button onClick={() => setSave({ validate: true })}>Save</button>
<ValidationStation sdk={sdk} data={data} save={save} />
```

## Hosting the web component

The widgets in this package render the Validation Station **web component**, which ships as a prebuilt Angular bundle in `@uipath/du-validation-station-wc`. The bundle is **not** imported by the package — it is loaded at runtime from a URL you host, via `@uipath/du-utils`.

That means there is no bundler configuration to write. You need two things:

1. Serve the contents of `node_modules/@uipath/du-validation-station-wc` as static files at `du-vs-wc`, next to your app's own root (see the default below — pass an explicit `deploymentUrl` if you host it somewhere else).
1. Call `configureValidationStationWc` once, before rendering any widget.

```
import { configureValidationStationWc } from "@uipath/ui-widgets-validation-station";

configureValidationStationWc({
  // Set true unless your app already loads Apollo fonts + Material Icons
  // globally — otherwise icon glyphs render as empty boxes.
  includeFonts: true,
}).catch((error) => {
  console.error("Validation Station web component failed to load", error);
});
```

`deploymentUrl` defaults to `du-vs-wc` joined onto `getAppBase()` — `/du-vs-wc` on a plain host, or the deployed app's own base path if you are running as a UiPath Coded App. Most integrations need nothing more than the call above. Pass an explicit `deploymentUrl` only when the web component is hosted somewhere that default doesn't reach:

```
import {
  configureValidationStationWc,
  joinDeploymentUrl,
} from "@uipath/ui-widgets-validation-station";

configureValidationStationWc({
  // A literal, a build-time constant, or a resolver — see "Notes" below.
  deploymentUrl: joinDeploymentUrl(
    "https://cdn.example.com/my-app",
    "du-vs-wc",
  ),
  includeFonts: true,
});
```

`joinDeploymentUrl(base, path)` exists because hand-rolled string concatenation is an easy way to end up with a doubled or missing slash — it strips any trailing slash from `base` and any leading slash from `path` before joining them, regardless of which one supplied it (or neither).

The served directory must keep the package's own layout, because the bundle resolves these against its own `import.meta.url`:

```
/du-vs-wc/
├── main.js          ← entry, plus its hashed chunk-*.js siblings
├── polyfills.js     ← zone.js; must load before main.js (the loader handles ordering)
├── styles.css       ← fetched as raw CSS and adopted into the shadow root
├── fonts.css        ← Apollo fonts + Material Icons (opt-in via includeFonts)
├── media/           ← the font files fonts.css references
└── du-assets/       ← pdf.js scripts, cmaps, wasm decoders, translations,
                       the business-rules executor
```

Copying the package directory verbatim satisfies this.

### Notes

- **Call it once.** Loading is cached per page, so a second call with a different `deploymentUrl` is ignored. A *failed* load is not cached — call again to retry.
- **The returned promise is the error channel.** Components only observe success; a bad URL or a 404 surfaces on the promise, so attach a `.catch`. Without it, a load failure leaves the widgets showing their loading state.
- **`du-assets/` and `media/` are outside that promise.** The loader only ever touches `polyfills.js`, `main.js`, `styles.css` and `fonts.css`; the web component fetches those two directories itself, at render time. Without `du-assets/`, PDF rendering and translations 404 silently while business-rules validation rejects outright — its executor is pulled in with a dynamic `import()`, so it fails loudly where the rest degrades quietly. Without `media/`, `fonts.css` resolves but every `url()` inside it 404s, so `includeFonts: true` loads no fonts.
- **`deploymentUrl` accepts a resolver.** Pass `() => string | Promise<string>` instead of a plain string for cases where the URL isn't known synchronously — it is called lazily, at most once per load.
- **`deploymentUrl` is a script source.** The loader injects `<script type="module" src>` from it, so whoever controls the URL executes code in your app's origin. Pass a literal, a build-time constant, or a resolver derived from one of those — never a value from `location`, a query parameter, or other user input.
- **CSP.** Serving from your own origin needs no more than `script-src 'self'`. A separate origin must be added to `script-src` and `style-src`, and note that the loader offers no Subresource Integrity hook — self-hosting avoids that exposure entirely.
- **Version skew.** The URL decides which web component version actually runs, and it is not checked against the installed `@uipath/du-validation-station-wc`. Keep the hosted copy in step with the version this package's types are built against.

## Migrating from 1.0.x

Four things changed since `1.0.1`, ordered by how loudly they fail.

The web component now loads from a URL

`1.0.x` imported the web component as a bare module specifier, which put a prebuilt Angular bundle into your module graph and made its assets your bundler's problem. It now loads at runtime from a hosted URL, so you must call `configureValidationStationWc` once before rendering any widget from this package:

```
+ import { configureValidationStationWc } from "@uipath/ui-widgets-validation-station";
+
+ configureValidationStationWc();
```

Miss it and nothing renders. See [Hosting the web component](#hosting-the-web-component) for the `deploymentUrl` default and when to override it.

**Delete your 1.0.x bundler setup.** None of it applies any more, and what it produces is no longer read:

- the build-time `du-assets` / `media` / CSS copy plugin
- `optimizeDeps.exclude` for `@uipath/du-validation-station-wc`
- any dev-server middleware that intercepted the component's raw `fetch("styles.css")` by sniffing `Sec-Fetch-Dest`

Save callbacks are unified

`1.0.x` had one pair of callbacks meaning "the widget persisted it" and another meaning "over to you", chosen by an unrelated input. There is now one callback per user action. It always carries the request, and takes the outcome as an optional second argument, present exactly when the widget did the write-back itself:

```
- onSubmitComplete={(result) => …}
- onSaveAsDraftComplete={(result) => …}
- onReportExceptionComplete={(documentId, reason) => …}
- onSaveValidatedDataRequest={(request) => …}
- onSaveValidatedDataAsDraftRequest={(request) => …}
+ onSubmit={(request, result) => …}
+ onSaveAsDraft={(request, result) => …}
+ onReportException={(request) => …}
```

**Check the first parameter, not just the name.** The old callbacks took the result first, the new ones take the request. A rename that leaves the body alone reads `success` off the wrong object — and does it silently wherever the handler isn't type-checked.

`onReportException` no longer receives `(documentId, reason)`; the reason is at `request.exceptionReport.Reason`. The widget still never persists that flow, so it has no `result` argument at all.

The folder comes from `ContentValidationData`

The `folderId` prop is gone. The folder now travels on `ContentValidationData` itself, as `FolderId` or `FolderKey` — the activity that produces the payload sets one of them, so in the common case there is nothing to pass and nothing to wire up.

```
- <ValidationStation sdk={sdk} data={data} folderId={folderId} />
+ <ValidationStation sdk={sdk} data={data} />
```

The four exported helpers lost the same parameter:

```
- fetchDuDocumentArtifacts(sdk, data, folderId)
- useDuDocumentArtifacts(sdk, data, folderId)
- submitValidatedData(sdk, data, folderId, request)
- saveValidatedDataAsDraft(sdk, data, folderId, request)
+ fetchDuDocumentArtifacts(sdk, data)
+ useDuDocumentArtifacts(sdk, data)
+ submitValidatedData(sdk, data, request)
+ saveValidatedDataAsDraft(sdk, data, request)
```

If you construct the object yourself, set `FolderId` or `FolderKey` — for example from the Action Center task's folder, which the SDK surfaces as `task.folderId`. Memoise the object you pass in, or the widget takes a new reference on every render and refetches the document each time.

Renamed exports

Same shapes, new names — a find-and-replace:

| 1.0.x                         | Now                      |
| ----------------------------- | ------------------------ |
| `useBucketArtifacts`          | `useDuDocumentArtifacts` |
| `BucketArtifacts`             | `DuDocumentArtifacts`    |
| `SubcomponentDataSource`      | `DuArtifactsSource`      |
| `SubcomponentStateEventProps` | `VsStateEventProps`      |

Nothing to do

`sdk` and `data` became optional, alongside the new `artifacts` / `documentId` props — existing calls that pass both keep working. See [Data sources](#data-sources). `ValidationStation` also gained `persistent` plus fourteen state, command-result and panel callbacks; all are additive.
