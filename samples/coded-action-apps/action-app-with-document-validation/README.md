# Action App With Document Validation

A UiPath Coded Action App whose entire UI is the **Document Understanding Validation Station**.

When a Document Understanding workflow raises a validation action, Action Center opens this app and
the reviewer corrects the extracted fields, edits line-item tables, and submits — inside the same
widget UiPath ships for its own validation experience. The app itself contributes no form of its
own; it hands the widget the task payload and completes the action once the widget reports it is
done.

There is deliberately **no task list, no inbox, no portal chrome**. Action Center already owns
task routing and assignment — an action app only ever renders the one action it was opened for. If
you want the browsable inbox instead (list tasks, pick one, then validate), that is the sibling
[`document-validation-app`](../../document-validation-app) web app.

---

## What it looks like

The widget fills the action pane. Everything below the title bar is the Validation Station:
document viewer on one side, extracted fields on the other, and its own action bar.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Invoice · INV-88213                        [ Save as draft ] [ Submit ] [⋯] │
├─────────────────────────────────────┬────────────────────────────────────────┤
│                                     │  Document type   Invoice          ▾    │
│    ┌─────────────────────────────┐  │                                        │
│    │  ACME SUPPLIES LTD          │  │  Vendor name     ACME Supplies Ltd     │
│    │  ┌───────────────────────┐  │  │  Invoice number  INV-88213             │
│    │  │ Invoice no  INV-88213 │◄─┼──┼─ Invoice date    2026-08-14        ⚠   │
│    │  └───────────────────────┘  │  │  Total           $12,480.00            │
│    │  Date       14 Aug 2026     │  │                                        │
│    │  ─────────────────────────  │  │  Line items                    3 rows  │
│    │  2 x Widget A     4 800.00  │  │  ┌──────────────────────────────────┐  │
│    │  1 x Widget B     7 680.00  │  │  │ Widget A   2   2 400.00  4 800.00│  │
│    │  ─────────────────────────  │  │  │ Widget B   1   7 680.00  7 680.00│  │
│    │  Total           12 480.00  │  │  └──────────────────────────────────┘  │
│    └─────────────────────────────┘  │                                        │
│                                     │  Business rules            1 warning   │
│         ◀  page 1 of 2  ▶     ⊕ ⊖   │  ⚠ Invoice date is in the future        │
└─────────────────────────────────────┴────────────────────────────────────────┘
```

Selecting a field highlights its bounding box in the document, and vice versa. Paging, zoom,
table editing, business-rule evaluation and translations all come from the widget — none of it is
implemented in this sample.

---

## How it works

The app does three things, and the widget does the rest.

```
Action Center ──getTask()──▶ app       task.data.contentValidationData is the
                                       ContentValidationData input: the bucket
                                       paths + document id

app ──data + sdk──▶ ValidationStation  widget reads the document and extraction
                                       results from the bucket and renders them

widget ──onSubmitComplete──▶ app       app completes the action with an outcome
```

### Who owns which flow

The widget's action bar exposes three flows. Two of them it finishes by itself; the third it only
reports.

| Flow | What the widget does | What this app has to do |
|---|---|---|
| **Submit** | Runs `ProcessExtractedData`, uploads the validated result to the bucket, then fires `onSubmitComplete` | Complete the action with the `Submit` outcome |
| **Save as draft** | Uploads the in-progress data to the bucket, then fires `onSaveAsDraftComplete` | Nothing — a draft leaves the action open. Just report success or failure |
| **Report as exception** | **No API call at all.** Fires `onReportExceptionComplete(documentId, reason)` | Persist it via `OrchestratorDuModule.submitExceptionReport(...)` — and *not* complete the action, see below |

Two consequences worth internalising, because both fail silently:

- **The widget renders no error UI.** `onSubmitComplete` and `onSaveAsDraftComplete` fire with
  `{ success: false, error }` and show the reviewer nothing. Every failure message in this app is
  surfaced by the host through `showMessage`.
- **Report-as-exception persists nothing on its own.** Without the `submitExceptionReport` call in
  [`src/components/Validation.tsx`](./src/components/Validation.tsx), the reviewer's click would
  be a no-op that still looks like it worked.

### Why there is no toolbar of our own

The Validation Station ships its own action bar, and `IValidationStationOptions` can only hide two
of those buttons (`hideSubmitButton`, `hideReportAsExceptionButton`) — there is no flag for the
built-in discard or save-as-draft controls. So a custom toolbar cannot fully replace the built-in
one, only duplicate it. This sample uses the built-ins and passes callbacks only; it never passes
the controlled `save` / `discardChanges` props.

The one option it does set is `emitDtoStateChanges: true`. That makes the web component emit its
in-memory extraction state as the reviewer edits, which is what the built-in **Save as draft**
button uploads — without it, that button is a silent no-op.

### Theme

Action Center reports its current theme on `getTask()`. The app maps it to the widget's `theme`
prop and puts a matching `light` / `dark` class on `<body>`, which is what the widget's own
stylesheets key off (`body.light { … }`). `Theme.AutoTheme` is resolved against
`prefers-color-scheme`. There is no in-app theme toggle — a validation action follows the theme the
reviewer already chose in Action Center.

---

## Pre-requisites

- **Node.js** 20.x or later, **npm** 8.x or later
- A **UiPath Automation Cloud** tenant with Document Understanding
- [UiPath CLI](https://github.com/UiPath/cli#installation): `npm i -g @uipath/cli`
- A Document Understanding workflow that raises validation actions, so there is a task to open
- A non-confidential **External Application** (OAuth client) with the scopes below

The widget's peer requirements are hard: **React ≥ 19.2**, **`@uipath/uipath-typescript` ≥ 1.4.2**.
Both are already satisfied by this sample's `package.json`.

### OAuth scopes

| Scope | Why |
|---|---|
| `OR.Buckets` | The widget reads the document and its extraction artifacts from a storage bucket, and writes the validated result back |
| `OR.Tasks` | `submitExceptionReport` records the exception against the task |
| `OR.Folders` | Resolves the folder the task and bucket live in |

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Configure

```bash
cp uipath.json.example uipath.json
```

Fill in `clientId`, `orgName` and `tenantName`. `uipath.json` is what the app reads for its
runtime OAuth configuration; it is git-ignored, `uipath.json.example` is the committed template.

### 3. Deploy

```bash
uip login
npm run build
uip codedapp pack dist -n <appName> --version 1.0.0
uip codedapp publish --type Action --name <appName>
uip codedapp deploy --folder-key <folderKey>
```

`uip or folders list --output json` gives you the folder key.

> **`--type Action` is mandatory on every publish.** `uip codedapp publish` defaults to
> `--type Web`; published as a web app, this will never bind to an Action Center task.

Then point your Document Understanding validation action at the deployed app, and the next
validation task will open it.

---

## Action Schema

Defined in `action-schema.json`. There is exactly one input, and it uses a dedicated schema type:

```json
"contentValidationData": {
  "type": "ContentValidationData",
  "required": true
}
```

`ContentValidationData` is a **first-class action-schema type**, alongside `string`, `integer`,
`number`, `boolean`, `array`, `object` and `file`. The CLI maps it to the .NET contract
`UiPath.DocumentProcessing.Contracts.Actions.ContentValidationData`, so the platform already knows
the shape — the bucket id, the document id and the paths to the encoded document, text, document
object model, taxonomy, extraction results and customization info.

**Do not model it as `"type": "object"` with the members spelled out.** That is a silent
downgrade on two counts: the field is typed as a plain `System.Object` instead of the real
contract, and the CLI's `transformProperty` only recurses into nested `properties` when the type is
literally `object` — so the members you listed are dropped on the floor.

There are **no outputs and no inOuts**. Everything the reviewer changes travels back through the
storage bucket — the widget writes the validated result there itself — so by the time this app
completes the action there is nothing left to send, and both completions carry an empty payload.

There is a single outcome, `Submit`. A validation action is not an approve/reject decision —
the document is either finished with or it is not — so there is nothing else to record.

| Outcome | Triggered by |
|---|---|
| `Submit` | a successful **Submit** in the widget |

**Reporting an exception does not complete the action from here.**
`submitExceptionReport` transitions the task on the Document Understanding side, so calling
`completeTask` after it would be a second close of the same task. The app persists the report,
confirms it to the reviewer, and stops. (The `document-validation-app` web app does the same: it
reports, then only refreshes its list.)

---

## The Vite config is not boilerplate

The Validation Station wraps a web component (`@uipath/du-validation-station-wc`) that fetches its
own stylesheets, fonts and PDF assets **at runtime**, resolved relative to `import.meta.url`. So
[`vite.config.ts`](./vite.config.ts) carries three pieces that are all load-bearing:

| Piece | Without it |
|---|---|
| `copyDuValidationStationAssets()` | Production build 404s on fonts, icons and the PDF viewer's assets |
| `serveDuValidationStationRawCss()` | In dev, Vite returns the widget's CSS as a JS module and icons render as their names (`warning`, `error`, `circle`) |
| `optimizeDeps.exclude: ['@uipath/du-validation-station-wc']` | Vite's pre-bundler rewrites `import.meta.url` and runtime asset resolution breaks |

**A green `npm run build` does not prove any of this works**, because the assets load at runtime.
Verify instead that `dist/assets/` contains `du-assets/`, `media/`, `styles.css` and `fonts.css`,
and that icons render as glyphs when you run the app.

---

## What you should see

| | Result |
|---|---|
| Action opens | Document viewer and extracted fields, populated from the bucket |
| A field is selected | Its bounding box highlights in the document |
| **Save as draft** | "Draft saved." toast; the action stays open and reopens with your edits |
| **Submit** | The action completes with `Submit` and leaves the reviewer's queue |
| **Report as exception** | The exception is recorded against the task and a confirmation appears; the app does not complete the action itself |
| Task is read-only | The same view, non-editable, with the action bar suppressed |

### If something looks wrong

| Symptom | Cause |
|---|---|
| `Loading...` never resolves | The widget cannot read the bucket artifacts — usually a missing `OR.Buckets` scope |
| Icons render as the words `warning` / `error` | The dev raw-CSS middleware is not running — check `vite.config.ts` |
| Toast: `folderId of Storage bucket is required` | Neither the task's `folderId` nor `data.FolderId` resolved |
| "This action arrived without its `contentValidationData` input" | The action was not created by a Document Understanding validation workflow, or its input is not wired up |
| Unstyled or wrongly themed widget | `<body>` is missing its `light` / `dark` class |
