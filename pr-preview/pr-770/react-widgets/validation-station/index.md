# Validation Station

Package: `@uipath/ui-widgets-validation-station`

A React wrapper for the UiPath Document Understanding **Validation Station**. It handles web component loading and bucket artifact fetching, and exposes a declarative props API for every Validation Station feature.

## Installation

```
npm install @uipath/ui-widgets-validation-station
```

### Peer dependencies

```
npm install react@^19.2.0 react-dom@^19.2.0 @uipath/uipath-typescript@^1.5.1
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
        baseUrl: "https://api.uipath.com",
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

The widget needs a taxonomy, an extraction result and a document DOM. There are three mutually exclusive ways to give it those:

| Mode                   | Pass                         | Who fetches                                                   | Who writes back                                       |
| ---------------------- | ---------------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| **Self-fetching**      | `sdk` + `data`               | The widget, from the bucket paths on `ContentValidationData`  | The widget, to `ValidatedExtractionResultsPath`       |
| **Self-fetching, IXP** | `sdk` + `processedDocument`  | The widget, through the Flow run that produced the document   | The widget, as a review recorded against the Flow run |
| **Pre-fetched**        | `artifacts` (+ `documentId`) | You — hand it a `DuDocumentArtifacts` object you already hold | You, from the request the widget emits                |

If both `data` and `processedDocument` are set, `data` wins.

**The outputs do not change with the mode.** `onSubmit`, `onSaveAsDraft` and `onReportException` fire for every user action either way, and always carry the request the web component produced. The only difference is a second argument: when the widget persisted the data itself, it passes the outcome too.

Pre-fetched mode is what you want when the document does not live in a storage bucket, when the artifacts are already in memory (e.g. fetched once and shared with the [subcomponents](https://github.com/UiPath/uipath-ui-widgets/blob/develop/packages/validation-station/docs/validation-station-subcomponents.md)), or when persistence goes somewhere other than `ValidatedExtractionResultsPath`.

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

`{ taxonomy, extractionResult, predictedExtractionResult?, dom, text, customizationInfo, original }` — `original` is the base64-encoded document the viewer renders. In `DuDocumentArtifacts`, `taxonomy` and `extractionResult` are UiPath DU contracts. `ValidationStation` also takes `IxpDocumentArtifacts`, the same shape with all three in the IXP representation (an `IXPTaxonomy` JSON Schema, an `IXPReviewedExtraction` — an `IXPExtraction` plus optional `confirmations` — and an optional `IXPExtraction` prediction). So do the `CompactFieldsForm`, `CompactTableEditor` and `DocumentViewer` subcomponents; `CompactBusinessRules` and `CompactDocTypeField` take `DuDocumentArtifacts` only.

### Comparing against the prediction

`predictedExtractionResult` is the model's prediction — the extraction output nobody edited — as opposed to `extractionResult`, the result the user reviews. Self-fetching fills it from `AutomaticExtractionResultsPath`; in pre-fetched mode it is optional, and a hand-built `DuDocumentArtifacts` without it is still valid. Supply it in the same representation as `extractionResult`: an `IXPExtraction` on `IxpDocumentArtifacts`. A Flow `ProcessedDocument` carries no prediction, so self-fetching one leaves it unset.

Change it together with `extractionResult`

Once the element has paired a prediction with the loaded values, assigning a different `predictedExtractionResult` (or `null`) on its own reloads the last `extractionResult` it was fed and drops unsaved edits. With `EnablePredictionDiff` on, the element also inserts predicted rows and values the result lacks, as unconfirmed values the user confirms or deletes.

By itself it changes nothing visible. It drives the `EnablePredictionDiff` customization flag (compact mode, on `ValidationStation`, `CompactFieldsForm` and `CompactTableEditor`): where the prediction differs from the current values, the element shows the predicted value with a button that takes it over. Like every customization flag, it lives under `FeatureCustomization` in `customizationInfo` — typed by the exported `ICustomizationInfoDTO` / `IFeatureCustomization`:

```
import type { ICustomizationInfoDTO } from "@uipath/ui-widgets-validation-station";

// Merge over what the bucket supplied rather than replacing it.
const fetched = artifacts.customizationInfo as
  | ICustomizationInfoDTO
  | undefined;
const withDiff = {
  ...artifacts,
  customizationInfo: {
    ...fetched,
    FeatureCustomization: {
      ...fetched?.FeatureCustomization,
      EnablePredictionDiff: true,
    },
  } satisfies ICustomizationInfoDTO,
};
```

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

### IXP (`ProcessedDocument`)

A Flow IDP node emits a `ProcessedDocument` rather than a `ContentValidationData`. It carries the taxonomy (an `IXPTaxonomy`) and the result (an `IXPExtraction`) inline, plus `metadata` naming the run that produced it — `traceId`, `spanId` and `folderKey`. The document, its DOM and its OCR text are read through that run's trace.

```
<ValidationStation
  sdk={sdk}
  processedDocument={task.data}
  onSubmit={(request, result) => completeTask(result?.processedDocument)}
/>
```

- **Loading.** The document opens on the result last saved against the producing span (a draft), else on the payload's `result`. A draft reopens with the values the reviewer had confirmed. `documentId` defaults to `metadata.traceId`.
- **Saving.** Submit and draft record the review against the producing span; report-as-exception records a rejection with the reason. `onSubmit`, `onSaveAsDraft` and `onReportException` receive the outcome as their second argument. `request.validatedData` is an `IXPExtraction` on submit, and an `IXPReviewedExtraction` — the same plus the reviewer's `confirmations` — on a draft.
- **Record format.** A review is stored as the `ProcessedDocument` the widget was given, with its `result` replaced by the validated one and `metadata.hitl.draft` set — `true` for a draft, `false` for a submit. This is the shape the Angular Validation Station uses, so either reopens a review the other saved. A record in any other shape — including the `{ draft, extraction }` envelope both used before — is ignored on load, and the document opens on the payload's `result`.
- **Completing the task is yours.** The downstream Flow node reads the validated document from the task completion. A submit's `result.processedDocument` is that document — the same one the record holds, a `ValidatedProcessedDocument` — so complete the task with it, verbatim, whatever `result.success` says: a failed record write must not block the review. `toValidatedProcessedDocument(processedDocument, validatedData, draft)` builds it when you persist yourself.
- **Subcomponents.** `CompactFieldsForm`, `CompactTableEditor` and `DocumentViewer` take `processedDocument` or `IxpDocumentArtifacts` too, and `CompactFieldsForm` saves a Flow document as `ValidationStation` does. `CompactBusinessRules` and `CompactDocTypeField` are Document Understanding-only. See the [subcomponents guide](https://github.com/UiPath/uipath-ui-widgets/blob/develop/packages/validation-station/docs/validation-station-subcomponents.md#ixp-documents).
- **OAuth scopes.** The `sdk`'s token needs `Traces.Api` (the run's spans, and the review record) and `OR.Buckets.Read` (the document, DOM and OCR text, via ECS). A coded action app completing the task also needs `OR.Tasks`. A missing scope surfaces as a 401/403 in the load or save error.
- **Hosting.** The artifacts are downloaded in the browser from pre-signed ECS storage URLs, so the host's origin must be in the ECS storage account's CORS rules. Coded apps (`https://{org}.{env}.uipath.host`) are.

The widget does this through exported functions, so a host that fetches up front runs exactly the same code:

| Export                                                              | Use                                                                                             |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `fetchProcessedDocumentArtifacts(sdk, processedDocument)`           | Fetch the `IxpDocumentArtifacts` — what the widget fetches given `processedDocument`            |
| `useProcessedDocumentArtifacts(sdk, processedDocument)`             | The same fetch as a hook, for when the fetch belongs to a component's lifecycle                 |
| `submitProcessedDocument(sdk, processedDocument, request)`          | Record a submitted review; its result carries the `processedDocument` to complete the task with |
| `saveProcessedDocumentAsDraft(sdk, processedDocument, request)`     | Record a draft — the one the next load opens on                                                 |
| `reportProcessedDocumentException(sdk, processedDocument, request)` | Record a rejection with the reviewer's reason. Replaces a saved draft                           |

```
const artifacts = await fetchProcessedDocumentArtifacts(sdk, processedDocument);

<ValidationStation
  artifacts={artifacts}
  onSubmit={async (request) => {
    const result = await submitProcessedDocument(
      sdk,
      processedDocument,
      request,
    );
    // Undefined only for a payload the station could not have reviewed.
    if (result.processedDocument) completeTask(result.processedDocument);
  }}
  onSaveAsDraft={(request) =>
    saveProcessedDocumentAsDraft(sdk, processedDocument, request)
  }
/>;
```

The save functions are stateless: each one edits the span's newest review record, or creates it when there is none, so the widget and a host saving outside it always land on the same record.

## Props

| Prop                             | Type                             | Required               | Default   | Description                                                                                                                                                                                                                                                            |
| -------------------------------- | -------------------------------- | ---------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk`                            | `UiPath`                         | No\*                   | —         | UiPath SDK instance for authentication and API calls. Required for self-fetching / persistence                                                                                                                                                                         |
| `data`                           | `ContentValidationData`          | No\*                   | —         | Document data containing the bucket paths, document ID, and the folder they live in — `FolderId` or `FolderKey`, whichever the producing activity set. Required for self-fetching / persistence                                                                        |
| `processedDocument`              | `ProcessedDocument`              | No\*                   | —         | A Flow IDP node's output. With `sdk`, the widget fetches its artifacts and records reviews through the producing run — see [IXP documents](#ixp-documents-processeddocument). Ignored when `data` is set                                                               |
| `artifacts`                      | \`DuDocumentArtifacts            | IxpDocumentArtifacts\` | No\*      | —                                                                                                                                                                                                                                                                      |
| `documentId`                     | `string`                         | No                     | —         | Document ID forwarded to the web component. Falls back to `data.DocumentId`, else `processedDocument.metadata.traceId` — pass it in pre-fetched mode                                                                                                                   |
| `theme`                          | `DuTheme`                        | No                     | `'light'` | Visual theme: `'light'`, `'dark'`, `'light-hc'`, `'dark-hc'`, or the Apollo Modern `'future-light'` / `'future-dark'`                                                                                                                                                  |
| `language`                       | `ValidationStationLanguage`      | No                     | `English` | UI language (see [the enum](#language-enum))                                                                                                                                                                                                                           |
| `isReadonly`                     | `boolean`                        | No                     | `false`   | When `true`, renders in read-only mode                                                                                                                                                                                                                                 |
| `persistent`                     | `boolean`                        | No                     | `false`   | Render the persistent element variant, which survives portal/DOM detachment (e.g. tab switches)                                                                                                                                                                        |
| `options`                        | `IValidationStationOptions`      | No                     | —         | Fine-grained UI feature flags, passed through to the element as given                                                                                                                                                                                                  |
| `save={{ validate: false }}`     | `{ validate: boolean }`          | No                     | —         | Trigger **save as draft**                                                                                                                                                                                                                                              |
| `save={{ validate: true }}`      | `{ validate: boolean }`          | No                     | —         | Trigger **submit** — runs validation first, then saves                                                                                                                                                                                                                 |
| `discardChanges`                 | `{ value: boolean }`             | No                     | —         | Trigger a discard-changes operation. Call `setDiscardChanges({ value: true })` (or `false` — the boolean is ignored) every time you want it to fire. Each call creates a brand-new object even if the content looks identical, and that is what the widget watches for |
| `setFieldValueByPath`            | `SetFieldValueByPath`            | No                     | —         | Set a field value addressed by a path of `{ fieldName, valueIndex }` segments                                                                                                                                                                                          |
| `selectAndFocusFieldValueByPath` | `SelectAndFocusFieldValueByPath` | No                     | —         | Select and focus a field value addressed by a path; focuses the document reference if any                                                                                                                                                                              |
| `deleteFieldValueByPath`         | `DeleteFieldValueByPath`         | No                     | —         | Delete a field value addressed by a path                                                                                                                                                                                                                               |

The three save callbacks (`onSubmit`, `onSaveAsDraft`, `onReportException`) are documented [below](#reacting-to-save-draft-and-exception-flows); the state callbacks in [Reading the document state](#reading-the-document-state).

## Reacting to save, draft and exception flows

The widget surfaces three user-initiated flows and reports each through exactly one callback, whichever mode it is in. Every callback receives the raw request; `result` is filled in only for the flows the widget persisted itself.

| Callback            | User action             | Signature                    | What the widget does                                                                                                                                                                   | What the host does                                                                                                                       |
| ------------------- | ----------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `onSubmit`          | **Submit**              | `(request, result?) => void` | With `sdk` + `data`: `processExtractedData`, then uploads to `ValidatedExtractionResultsPath`, and passes the outcome as `result`. Without: emits the request only                     | React to `result`, or — when it is absent — persist the request yourself (`submitValidatedData` does exactly what the widget would have) |
| `onSaveAsDraft`     | **Save as draft**       | `(request, result?) => void` | With `sdk` + `data`: uploads `validatedData` straight to the bucket (no `processExtractedData`). Without: emits the request only                                                       | Same as above; the host-side equivalent is `saveValidatedDataAsDraft`                                                                    |
| `onReportException` | **Report as exception** | `(request, result?) => void` | With `sdk` + `processedDocument`: records the rejection against the Flow run and passes the outcome as `result`. Otherwise nothing — the reason is at `request.exceptionReport.Reason` | For any other source, persist it yourself — call `OrchestratorDuModule.submitExceptionReport(...)`                                       |

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

All three callbacks are optional, but the widget surfaces no errors on its own. Outside a `processedDocument`, `onReportException` is the only place the report goes — without it, the user's **Report as exception** click is a no-op.

## Reading the document state

These callbacks report the rest of the element's `IValidationStationStandaloneWcEventMap`; the three save flows are above.

| Prop                                     | Fires when                                                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onExtractionResultChanged`              | Any change to the extraction result — needs `options={{ emitDtoStateChanges: true }}`. An IXP document reports an `IXPReviewedExtraction`, with its `confirmations` |
| `onLoaded`                               | The element finished loading                                                                                                                                        |
| `onDirtyChange`                          | Unsaved changes appear or are cleared                                                                                                                               |
| `onIsValidChange`                        | Validity flips (`true` = no Must rule broken, no invalid values)                                                                                                    |
| `onDocumentTypeChanged`                  | The user picks another document type                                                                                                                                |
| `onFieldValueSelected`                   | The user selects a field value                                                                                                                                      |
| `onFieldValueChanged`                    | The user edits a field value                                                                                                                                        |
| `onBusinessRulesEvaluated`               | Validation errors and business rules are re-evaluated                                                                                                               |
| `onSaveResult`                           | A `save` command completes                                                                                                                                          |
| `onSetFieldValueByPathResult`            | A `setFieldValueByPath` command completes                                                                                                                           |
| `onSelectAndFocusFieldValueByPathResult` | A `selectAndFocusFieldValueByPath` command completes                                                                                                                |
| `onDeleteFieldValueByPathResult`         | A `deleteFieldValueByPath` command completes                                                                                                                        |
| `onFieldsPanelWidthChanged`              | The fields panel is resized (width in px)                                                                                                                           |
| `onFieldsPanelSideChanged`               | The panel moves to the other side of the viewer                                                                                                                     |
| `onWcMessage`                            | The element publishes a message on its bus (`ui-du-vs-wc-message`) — see below                                                                                      |

Commands need a loaded document

`setFieldValueByPath`, `selectAndFocusFieldValueByPath` and `deleteFieldValueByPath` resolve their `path` against the taxonomy and the current extraction result, so one issued before those arrive fails to resolve. Gate on `onLoaded`, and wire the matching `*Result` callback — it carries the reason (`No field value found at path …`), which is otherwise invisible.

The subcomponents report subsets of this set — see [subcomponents](https://github.com/UiPath/uipath-ui-widgets/blob/develop/packages/validation-station/docs/validation-station-subcomponents.md).

### Rendering your own value-indicator overlay

Hovering a value's confidence indicator opens a built-in popover. `onWcMessage` receives an `IVsWcMessage`, discriminated on `type`: `indicator-overlay-show` carries the value's confidence, thresholds, confirmation and broken-rule state (`IVsIndicatorOverlayContext`) plus the trigger's viewport rect to position against, and `indicator-overlay-hide` closes it. Hide the built-in popover with CSS, then render your own:

```
ui-du-validation-station-standalone-wc-element::part(indicator-overlay) {
  display: none;
}
```

```
<ValidationStation
  sdk={sdk}
  data={data}
  onWcMessage={(message) => {
    if (message.type === "indicator-overlay-show") showPopover(message.context);
    else hidePopover();
  }}
/>
```

`message.instanceId` tells elements apart when several report to one handler. `CompactFieldsForm`, `CompactTableEditor` and `CompactBusinessRules` take `onWcMessage` too.

### Opening a field in your taxonomy editor

An annotation host — one that sets `options={{ intendedUse: "document-annotation" }}` — gets an *Edit instructions* link on each prediction-diff warning. Clicking it publishes `taxonomy-field-focus-request` on the same bus, naming the field group or table (`fieldId`) and its `documentTypeId`:

```
<ValidationStation
  artifacts={artifacts}
  options={{ intendedUse: "document-annotation" }}
  onWcMessage={(message) => {
    if (message.type === "taxonomy-field-focus-request")
      openTaxonomyField(message.documentTypeId, message.fieldId);
  }}
/>
```

`ValidationStation` and `CompactFieldsForm` publish it; the table editor does not. Since `IVsWcMessage` gained this member, an exhaustive `switch` over `message.type` needs a new case.

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
  ValidationStationArtifactsSource,
  DuDocumentArtifacts,
  IxpDocumentArtifacts,
  ValidationStationArtifacts,
  IXPTaxonomy,
  IXPExtraction,
  IXPReviewedExtraction,
  ProcessedDocument,
  ValidatedProcessedDocument,
  DuTheme,
  ValidationStationIntendedUse,
  IValidationStationOptions,
  FieldFilterOptions,
  DocumentViewerOptions,
  ICustomizationInfoDTO,
  IFeatureCustomization,
  IVsWcMessage,
  IVsIndicatorOverlayContext,
  IVsTaxonomyFieldFocusRequestMessage,
  IVsSaveValidatedDataRequest,
  IVsSaveValidatedDataAsDraftRequest,
  IVsSaveExceptionReportRequest,
  SaveValidatedDataResult,
  SetFieldValueByPath,
  SelectAndFocusFieldValueByPath,
  DeleteFieldValueByPath,
  ValidationStationEventProps,
  VsStateEventProps,
  VsAnyRepresentationStateEventProps,
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
  // Set true unless your app already loads Material Icons globally —
  // otherwise every icon renders as its ligature text. See "Fonts" below.
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
├── polyfills.js     ← must load before main.js (the loader handles ordering)
├── styles.css       ← fetched as raw CSS and adopted into the shadow root
├── fonts.css        ← Material Icons only (opt-in via includeFonts)
├── media/           ← the font files fonts.css references
└── du-assets/       ← pdf.js scripts, cmaps, wasm decoders, translations,
                       the business-rules executor
```

Copying the package directory verbatim satisfies this.

### Serving it with Vite

No `vite.config.ts` changes are needed

Since `1.1.0` the web component is fetched at runtime instead of imported, so it never enters the module graph. The `optimizeDeps.exclude`, asset-copy plugin and dev-server middleware that `1.0.x` required are all obsolete — delete them (see [Migrating from 1.0.x](#migrating-from-10x)). A Vite app needs nothing in its config beyond whatever it already has.

What it does need is the package copied into `public/`, which Vite serves verbatim in dev and copies to `dist/` on build. The four samples below all do it with one script wired to the `predev` and `prebuild` hooks, so a plain `npm run dev` or `npm run build` stages it:

package.json

```
{
  "scripts": {
    "stage-du-wc": "node scripts/stage-du-wc.mjs",
    "predev": "npm run stage-du-wc",
    "prebuild": "npm run stage-du-wc"
  },
  "devDependencies": {
    "@uipath/du-validation-station-wc": "1.0.0-rc.6"
  }
}
```

The script copies `node_modules/@uipath/du-validation-station-wc` to `public/du-vs-wc` — which is exactly where the `deploymentUrl` default looks — skipping the npm metadata, verifying that `main.js`, `polyfills.js`, `styles.css`, `fonts.css` and `du-assets/` all landed, and stamping the staged version so a repeat run is a no-op. Take it as-is: `scripts/stage-du-wc.mjs`.

Keep `public/du-vs-wc` out of git

It is generated, and it is tens of megabytes — the fonts alone are most of it. Add it to `.gitignore` and let the `predev` / `prebuild` hooks produce it.

### Fonts

The `fonts.css` in `@uipath/du-validation-station-wc` carries **Material Icons only** — the one font the component cannot do without. The Apollo text fonts (Poppins, Noto Sans, Inconsolata) are not in the package, so the component's text inherits your app's own font stack. A UiPath-styled host already loads them; to get the UiPath typography otherwise, install `@uipath/apollo-fonts` and import its `font.css` in your app. That file contains Material Icons as well, so `includeFonts` can then stay off.

A UiPath-hosted deployment of the web component is built with the full font set, so `includeFonts: true` against one of those links the Apollo fonts too.

### Notes

- **Call it once.** Loading is cached per page, so a second call with a different `deploymentUrl` is ignored. A *failed* load is not cached — call again to retry.
- **The returned promise is the error channel.** Components only observe success; a bad URL or a 404 surfaces on the promise, so attach a `.catch`. Without it, a load failure leaves the widgets showing their loading state.
- **`du-assets/` and `media/` are outside that promise.** The loader only ever touches `polyfills.js`, `main.js`, `styles.css` and `fonts.css`; the web component fetches those two directories itself, at render time. Without `du-assets/`, PDF rendering and translations 404 silently while business-rules validation rejects outright — its executor is pulled in with a dynamic `import()`, so it fails loudly where the rest degrades quietly. Without `media/`, `fonts.css` resolves but every `url()` inside it 404s, so `includeFonts: true` loads no fonts.
- **`deploymentUrl` accepts a resolver.** Pass `() => string | Promise<string>` instead of a plain string for cases where the URL isn't known synchronously — it is called lazily, at most once per load.
- **`deploymentUrl` is a script source.** The loader injects `<script type="module" src>` from it, so whoever controls the URL executes code in your app's origin. Pass a literal, a build-time constant, or a resolver derived from one of those — never a value from `location`, a query parameter, or other user input.
- **CSP.** Serving from your own origin needs no more than `script-src 'self'`. A separate origin must be added to `script-src` and `style-src`, and note that the loader offers no Subresource Integrity hook — self-hosting avoids that exposure entirely.
- **Version skew.** The URL decides which web component version actually runs, and it is not checked against the installed `@uipath/du-validation-station-wc`. Keep the hosted copy in step with the version this package's types are built against.

## Web component 1.0.0-rc.6

The widgets now render `@uipath/du-validation-station-wc` `1.0.0-rc.6`. Keep the hosted copy in step (see *Version skew* above). No prop of this package was removed or renamed, but the web component changes a few things you will see.

From rc.6 — read the behaviour changes before upgrading:

- **IXP documents in the subcomponents.** `CompactFieldsForm`, `CompactTableEditor` and `DocumentViewer` take `processedDocument` or `IxpDocumentArtifacts` — see the [subcomponents guide](https://github.com/UiPath/uipath-ui-widgets/blob/develop/packages/validation-station/docs/validation-station-subcomponents.md#ixp-documents). `onExtractionResultChanged` on `CompactFieldsForm` and `CompactTableEditor` is typed for either representation, so a handler typed for `ExtractionResult` alone no longer compiles on either one.
- **The compact fields form and table editor reject `boundingBoxes`-only IXP citations.** An IXP extraction whose sources cite by `boundingBoxes` alone (no `references`) does not load on these elements, and such a prediction shows no predicted values. Either cites fine in `ValidationStation` and `DocumentViewer`, which have the document.
- **New compact UI, on by default:** the field filter bar counts confirmed fields, and a filled field or table cell shows a *Replace value* button.
- **New options:** `options.hideDiscardButton`, and `documentViewerOptions.floatingButtonsOptions.showDownloadButton`.
- **`fieldValueChanged` now fires for IXP documents.**

From rc.5:

The Flow review record and the task completion changed

This release follows the Angular Validation Station in how a `ProcessedDocument` review is recorded and completed. A review is now stored as the validated `ProcessedDocument` (`metadata.hitl.draft` telling a draft from a submit) instead of `{ draft, extraction }`, and a draft saved in the old envelope no longer reopens — the document opens on the payload's `result`. Complete the task with a submit's `result.processedDocument` rather than `request.validatedData`. See [IXP (`ProcessedDocument`)](#ixp-processeddocument).

- **A value with a validation error can no longer be confirmed**, nor the row, table or field group containing it. `setFieldValueByPath` follows suit: `OperatorConfirmed: true` on such a value fails with `success: false` and applies nothing, and without `OperatorConfirmed` an updated value is confirmed only when valid.
- **IXP documents keep their confirmations.** `extractionResult` takes an `IXPReviewedExtraction` (`confirmations` are JSON Pointers of confirmed values), `onExtractionResultChanged` now fires for IXP documents, and a draft carries the confirmations, so a saved draft reopens with them. A bare `IXPExtraction` still opens with nothing confirmed.
- **IXP citations are rewritten on save.** `validatedData` cites every value afresh with `references` in page units plus `pageWidth` / `pageHeight`; `boundingBoxes` is deprecated and written for words only.
- **`EnablePredictionDiff` inserts missing predicted values**, and changing `predictedExtractionResult` alone resets the element — see [Comparing against the prediction](#comparing-against-the-prediction).
- **New compact UI, on by default:** a confirm-all checkbox on each field group, clickable line numbers in the table editor, an autocomplete box for set fields, and field filters that reach inside field groups. Field-group rows are now called *instances*.
- **The value-indicator popover's custom properties are renamed** from `--du-vs-indicator-overlay-*` to `--ui-hover-popover-*` (`padding`, `shadow`, `radius`, `background`). Old names are silently ignored.
- **New options:** `options.intendedUse` (`'extraction-validation'` or `'document-annotation'`), `documentViewerOptions.hideReferencedFieldsPopover`, and the `FeatureCustomization` flags `DisableKeyboardShortcuts`, `EnableFieldGroupTableView`, `EnableMarkReferenceAsMissing` and `DistinguishUnconfirmedValues`.
- **New message:** `taxonomy-field-focus-request` on `onWcMessage` — see [Opening a field in your taxonomy editor](#opening-a-field-in-your-taxonomy-editor).
- **New themes:** `theme` accepts the Apollo Modern `'future-light'` and `'future-dark'`.
- **`DocumentViewer` is deprecated**, following the web component's own document-viewer element. For a viewer that does not need `instanceId` linking, use `@uipath/ui-widgets-document-viewer`.

From rc.4:

- **IXP predictions.** `IxpDocumentArtifacts` takes an `IXPExtraction` `predictedExtractionResult`, so an IXP document can show the prediction diff.
- **Single-instance field groups** in IXP taxonomies (a nullable `object`) render as one row; such a taxonomy failed to load before.
- **New compact UI, on by default:** a *No taxonomy defined* state (text via `options.emptyTaxonomyMessage`), a *Duplicate row* action and column freezing in the table editor, and a **Shift+N** shortcut to the next flagged value.

From rc.3:

- **The IXP representation.** `ValidationStation` takes an IXP document — a Flow `processedDocument`, or `IxpDocumentArtifacts` — see [IXP documents](#ixp-documents-processeddocument).
- **`HideHighlightRow`** on `FeatureCustomization` (compact mode) hides the *Highlight row* action from each field group row's menu.
- The compact fields form's expand / collapse-all control is redesigned, and reads *Expand all field groups* / *Collapse all field groups*.

From rc.2:

- **New compact UI, on by default:** a field-filter toolbar (trim or remove it with `options.fieldFilterOptions`), expandable field groups, a line-number column in the table editor, and a *Waiting for input* screen until the document data arrives.
- **`HideConfidence` now applies in compact mode too**, and is deprecated in favour of `IgnoreConfidence` (either one takes confidence out of the experience). A `customizationInfo` that already sets it will now hide the confidence indicator in compact.
- **`fonts.css` carries Material Icons only** — see [Fonts](#fonts).
- **New options:** `fieldFilterOptions`, `defaultFieldsAreaPercentage` / `defaultFieldsAreaWidth`, and `documentViewerOptions` for the embedded viewer (with the new `hideExtractedTokensToggle` / `hideLanguageSelect` flags).
- **New outputs and inputs on this package:** `onWcMessage` (see [Rendering your own value-indicator overlay](#rendering-your-own-value-indicator-overlay)) and `predictedExtractionResult` (see [Comparing against the prediction](#comparing-against-the-prediction)).
- **`@uipath/uipath-typescript` `>= 1.5.1`** is now required — the web component declares it as a peer dependency.

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

## Sample apps

Four runnable apps in this repository use the widget end to end — task fetch, render, submit and completion. Each has a `README.md` with setup steps and a preview GIF; all four are also in the [Sample Apps Gallery](../../samples/).

| Sample                                                                | What it shows                                                                                                                                                                                        |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `document-validation-app`                                             | A standalone validation inbox: lists Action Center Document Validation tasks as Pending / Unassigned / Completed tabs and reviews the selected one with the all-in-one `ValidationStation` component |
| `document-validation-subcomponents-app`                               | The same review screen built from the package's five subcomponents in a custom grid, linked by one shared `instanceId` — the path to take when the standard layout does not fit                      |
| `coded-action-apps/action-app-with-document-validation`               | The same widget as a [Coded Action App](../../coded-action-apps/getting-started/): no task list, Action Center routes the reviewer straight to one action                                            |
| `coded-action-apps/action-app-with-document-validation-subcomponents` | The subcomponent layout as a Coded Action App                                                                                                                                                        |

All four stage the web component with the script described in [Serving it with Vite](#serving-it-with-vite).

## TypeScript

This package is written in TypeScript and ships its own type definitions — prop types are exported for use in your own component signatures:

```
import type { ValidationStationProps } from "@uipath/ui-widgets-validation-station";
```
