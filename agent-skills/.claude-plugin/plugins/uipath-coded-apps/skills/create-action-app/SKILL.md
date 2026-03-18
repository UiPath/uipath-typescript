---
description: Use when the user asks to create a new UiPath coded action app. Scaffolds a full React + TypeScript project wired to the UiPath Action Center, optionally integrating the UiPath TypeScript SDK services (Data Fabric Entities, Storage Buckets, etc.). Guides the user step-by-step through naming, routing, SDK selection, service selection, and action-schema.json authoring before generating all project files.
tools: Read, Edit, Write, Glob, Grep, Bash
---

# Create a UiPath Coded Action App

Scaffold a production-ready UiPath coded action app from scratch.

> **Communication rule**: Before creating each file, tell the user which file you are creating and what it contains. After writing, confirm it is done.

---

## Pre-flight: collect required information

Ask the following questions **one at a time**, in order. Wait for each answer before asking the next. Do not start generating files until all answers are collected.

### Q1 — App name
> "What is the name of your action app? This will be used as the project folder name and in `package.json`."

Store as `<app-name>`. Convert to lowercase kebab-case if the user provides spaces (e.g. `my-loan-app`).

---

### Q2 — Routing name
> "What is the routing name for this app in UiPath Action Center? This becomes the `base` path in `vite.config.ts` (e.g. `loan-review-app`)."

Store as `<routing-name>`. Must satisfy:
- Pattern: `/^[a-z0-9-]+$/` — lowercase letters, digits, and hyphens only (no uppercase, no underscores)
- Length: 4–32 characters

If the user provides a value that does not match, convert it automatically (uppercase → lowercase, underscores/spaces → hyphens, strip other disallowed characters), then validate the length. If the converted value is still invalid, ask the user to provide a new one. Always confirm the final value before proceeding.

---

### Q3 — UiPath TypeScript SDK
> "Does this app need to call UiPath platform services (Data Fabric / Entities, Storage Buckets, Orchestrator APIs, etc.)? Answer **yes** or **no**."

If **yes**: set `SDK_NEEDED=true` and ask Q3b → Q3c → Q3a.
If **no**: set `SDK_NEEDED=false` and skip to the setup script section below.

#### Q3b — SDK services
> "Which UiPath SDK services does this app need? Enter comma-separated numbers:
>
> 1. Data Fabric Entities (`Entities` — query entity records)
> 2. Data Fabric ChoiceSets (`ChoiceSets` — enum picklists for entity fields)
> 3. Storage Buckets (`Buckets` — read/write files)
> 4. Orchestrator Tasks (`Tasks` — Action Center human tasks)
> 5. Orchestrator Processes (`Processes` — start/monitor automations)
> 6. Orchestrator Assets (`Assets`)
> 7. Orchestrator Queues (`Queues`)
> 8. Maestro Processes & Instances (`MaestroProcesses`, `ProcessInstances`, `ProcessIncidents`)
> 9. Cases (`Cases`, `CaseInstances`)
> 10. Conversational Agent (`ConversationalAgent` — real-time AI chat)
>
> Example: `1, 3`"

Record the selected services using this map:

| # | Service class(es) | Import subpath | Instance name(s) |
|---|-------------------|----------------|------------------|
| 1 | `Entities` | `@uipath/uipath-typescript/entities` | `entityService` |
| 2 | `ChoiceSets` | `@uipath/uipath-typescript/entities` | `choiceSetsService` |
| 3 | `Buckets` | `@uipath/uipath-typescript/buckets` | `bucketService` |
| 4 | `Tasks` | `@uipath/uipath-typescript/tasks` | `tasksService` |
| 5 | `Processes` | `@uipath/uipath-typescript/processes` | `processesService` |
| 6 | `Assets` | `@uipath/uipath-typescript/assets` | `assetsService` |
| 7 | `Queues` | `@uipath/uipath-typescript/queues` | `queuesService` |
| 8 | `MaestroProcesses`, `ProcessInstances`, `ProcessIncidents` | `@uipath/uipath-typescript/maestro-processes` | `maestroProcesses`, `processInstances`, `processIncidents` |
| 9 | `Cases`, `CaseInstances` | `@uipath/uipath-typescript/cases` | `cases`, `caseInstances` |
| 10 | `ConversationalAgent` | `@uipath/uipath-typescript/conversational-agent` | `conversationalAgent` |

Store selected services as `<selected-services>`.

#### Q3c — OAuth scopes (auto-deduced)

After the user answers Q3b, **do not ask for scopes directly**. Instead:

1. **Read `../create-app/references/oauth-scopes.md`** and look up the exact scopes required by every SDK method the selected services expose.
2. Collect the full deduplicated, space-separated scopes string for the selected services.
   - **If `Entities` (Data Fabric) is among the selected services**, ask the user: *"Are your Data Fabric entities tenant-scoped or folder-scoped?"* Only add `OR.Users` if they answer folder-scoped — it is not needed for tenant-scoped entities.
3. Present it to the user for confirmation:
   > "Based on the services you selected, the required OAuth scopes are:
   >
   > `<deduced-scopes>`
   >
   > Reply **ok** to use these, or provide your own scopes string to override."
4. If the user replies "ok", store the deduced scopes as `<scopes>`. If they provide a replacement, store that instead.

Store as `<scopes>`.

#### Q3a — Client ID
> "Enter the **Client ID** of the External Application registered in UiPath Automation Cloud.
>
> If you don't have a Client ID yet, go to **Org Admin Settings** in UiPath, navigate to **External Applications**, and create a new **non-confidential** client with the scopes listed above and the following redirect URI:
>
> `https://cloud.uipath.com/<orgId>/<tenantId>/actions_`"

Store as `<client-id>`.

---

### Run setup script (after Q3, before Q4)

**Tell the user:** "Running the setup script — scaffolding the project and installing dependencies."

Run this script immediately after collecting Q1–Q3c, before asking Q4. All static project files and dependencies are handled by the script.

**Script paths:** The setup script is in this skill's `scripts/` subdirectory. Use the **"Base directory for this skill"** path shown at the top when this skill was loaded — that is the absolute path to this skill's directory.

Run:
```bash
bash <skill-base-dir>/scripts/setup.sh "<app-name>" "<routing-name>" "<client-id>" "<scopes>" "<sdk-needed>"
```

Argument mapping:
- `<client-id>` — value from Q3a, or `""` if SDK_NEEDED=false
- `<scopes>` — confirmed value from Q3c, or `""` if SDK_NEEDED=false
- `<sdk-needed>` — `yes` if SDK_NEEDED=true, `no` otherwise

**IMPORTANT — Bash tool timeout:** Always set `timeout: 300000` (5 minutes) on the Bash tool call — `npm install` can take several minutes.

**If the script fails (non-zero exit):**
1. Ask the user:
   > "`@uipath/uipath-ts-coded-action-apps@1.0.0-beta.1` could not be installed from the registry. Do you have a local `.tgz` file for this package? If yes, paste the full path."
2. Re-run with the `.tgz` path as the 6th argument:
   ```bash
   bash <skill-base-dir>/scripts/setup.sh "<app-name>" "<routing-name>" "<client-id>" "<scopes>" "<sdk-needed>" "<tgz-path>"
   ```
3. If it still fails, **stop immediately** and show:
   > **Error: `@uipath/uipath-ts-coded-action-apps` could not be installed. Project creation has been aborted. Please resolve the installation issue and retry.**

Otherwise confirm: "Project scaffolded and dependencies installed successfully. Now let's define the action schema."

---

### Q4 — Action schema

Tell the user:
> "Now let's define your `action-schema.json` — the data contract between your form and the Maestro/Agent workflow."

#### Field types reference

Every field uses one of these JSON data types:

| Type | Notes |
|------|-------|
| `string` | Can optionally have `format: "uuid"` or `format: "date"` |
| `number` | Floating-point |
| `integer` | Whole numbers only |
| `boolean` | `true` / `false` |
| `array` | Must specify `items` (the element type). Nested arrays are **not** supported — `items.type` cannot be `array` |
| `object` | Must specify nested `properties` (a record of further fields, each following the same rules) |

Every field also supports an optional `description` string.

For each field, collect: **name** (camelCase), **type**, optional **description**, optional **format** (if type=`string`), and if type=`array` the **items type**, and if type=`object` the nested **properties**.

#### Q4a — Input fields
> "How many **INPUT** fields does your form have? (Fields passed in from the previous workflow stage — always read-only in the form.) Enter 0 if none."

For each input field ask:
> "Input field [N]:
> - Name (camelCase):
> - Type (`string` / `number` / `integer` / `boolean` / `array` / `object`):
> - Required? (`yes` / `no`):
> - Description (optional, press Enter to skip):
> - *(if type=`string`)* Format? (`uuid` / `date` / none):
> - *(if type=`array`)* Items type (cannot be `array`):
> - *(if type=`object`)* Define nested properties now? (describe them one by one):"

#### Q4b — Output fields
> "How many **OUTPUT** fields does your form have? (Fields the user fills in — editable.) Enter 0 if none."

For each output field ask the same set of sub-questions as Q4a.

#### Q4c — InOut fields
> "How many **INOUT** fields does your form have? (Pre-populated from upstream but editable.) Enter 0 if none."

For each inout field ask the same set of sub-questions as Q4a.

#### Q4d — Hidden fields

After collecting all input, output, and inout fields, ask:
> "Are there any fields that should **not** be shown as a form field (e.g. internal IDs, metadata passed silently)? If yes, list their names comma-separated. If none, press Enter to skip."

Store the resulting list as `<hidden-fields>` (may be empty).

Hidden fields remain part of the `action-schema.json` data contract and the `FormData` interface/initial state — they are simply **not rendered** in the form JSX.

#### Q4e — Outcomes
> "What are the outcome buttons for this task? Enter comma-separated names (e.g. `Approve, Reject`). Each outcome becomes a button in the form."

Store as `<outcomes>`. Each outcome is represented as a `string`-typed property in the `outcomes` section.

> **Note:** The `<hidden-fields>` list collected in Q4d does **not** affect `action-schema.json` — all fields appear in the schema. It only controls which fields are rendered in `Form.tsx`.

---

#### Confirm action-schema.json before proceeding

Show the user the fully generated `action-schema.json` and explain the structure:
- All four top-level sections (`inputs`, `outputs`, `inOuts`, `outcomes`) are always present — use `"properties": {}` for any section with no fields.
- Each section has `"type": "object"` and a `properties` map.
- `array` fields include an `items` object with its own `type`.
- `object` fields include a `properties` map of nested fields.
- `format` and `description` are included only when provided.

Example of a fully populated schema:
```json
{
  "inputs": {
    "type": "object",
    "properties": {
      "applicantName":  { "type": "string",  "required": true,  "description": "Full name of the applicant" },
      "loanAmount":     { "type": "number",  "required": false },
      "applicationId":  { "type": "string",  "required": true,  "format": "uuid" },
      "submittedAt":    { "type": "string",  "required": false, "format": "date" },
      "attachments":    { "type": "array",   "required": false, "items": { "type": "string" } },
      "metadata":       {
        "type": "object", "required": false,
        "properties": {
          "source": { "type": "string", "required": false }
        }
      }
    }
  },
  "outputs": {
    "type": "object",
    "properties": {
      "riskFactor":        { "type": "integer", "required": true },
      "reviewerComments":  { "type": "string",  "required": false }
    }
  },
  "inOuts": {
    "type": "object",
    "properties": {}
  },
  "outcomes": {
    "type": "object",
    "properties": {
      "Approve": { "type": "string" },
      "Reject":  { "type": "string" }
    }
  }
}
```

Ask:
> "Does this look correct? Reply **ok** to generate the project, or tell me what to change."

Wait for confirmation before proceeding to the Steps section.

### Form layout & style

> "Describe how you'd like the form laid out and styled — purpose of the form, visual layout, spacing, colour preferences, etc.
>
> Example: *'A loan review form. Show applicant details in a read-only summary card at the top, reviewer fields below in two columns. Clean white card with subtle shadow, UiPath orange accent on the action buttons.'*
>
> Press Enter to skip and use a clean default layout."

Store as `<form-description>`. If skipped, use `""`. Reference this when generating `Form.tsx` and `Form.css` in steps 3 and 4.

---

## Steps

The setup script (run after Q3) has already scaffolded all static project files. The steps below generate only the **dynamic files** that depend on the action schema and SDK service choices.

---

### 1. `action-schema.json`

**Tell the user:** "Creating `action-schema.json` — the confirmed data contract for this app."

Write the confirmed action-schema.json from the pre-flight wizard.

---

### 2. `src/uipath.ts` — SDK services (only if SDK_NEEDED=true)

**Tell the user:** "Updating `src/uipath.ts` — wiring selected UiPath SDK service instances."

The setup script wrote a basic `CodedActionApps`-only version. **Only execute this step if `SDK_NEEDED=true`.** Overwrite `src/uipath.ts` with the full SDK version using imports and instantiations for all services selected in Q3c:

```typescript
import { UiPath } from '@uipath/uipath-typescript/core';
import { <ServiceClass> } from '@uipath/uipath-typescript/<subpath>';  // repeat per service
import { CodedActionAppsService } from '@uipath/uipath-ts-coded-action-apps';

const sdk = new UiPath();
const codedActionAppsService = new CodedActionAppsService();
const <instanceName> = new <ServiceClass>(sdk);  // repeat per service

export default { codedActionAppsService, <instanceName>, ... };
```

Use this service table (same as Q3c):

| # | Service class(es) | Import subpath | Instance name(s) |
|---|-------------------|----------------|------------------|
| 1 | `Entities` | `@uipath/uipath-typescript/entities` | `entityService` |
| 2 | `ChoiceSets` | `@uipath/uipath-typescript/entities` | `choiceSetsService` |
| 3 | `Buckets` | `@uipath/uipath-typescript/buckets` | `bucketService` |
| 4 | `Tasks` | `@uipath/uipath-typescript/tasks` | `tasksService` |
| 5 | `Processes` | `@uipath/uipath-typescript/processes` | `processesService` |
| 6 | `Assets` | `@uipath/uipath-typescript/assets` | `assetsService` |
| 7 | `Queues` | `@uipath/uipath-typescript/queues` | `queuesService` |
| 8 | `MaestroProcesses`, `ProcessInstances`, `ProcessIncidents` | `@uipath/uipath-typescript/maestro-processes` | `maestroProcesses`, `processInstances`, `processIncidents` |
| 9 | `Cases`, `CaseInstances` | `@uipath/uipath-typescript/cases` | `cases`, `caseInstances` |
| 10 | `ConversationalAgent` | `@uipath/uipath-typescript/conversational-agent` | `conversationalAgent` |

---

### 3. `src/components/Form.tsx`

**Tell the user:** "Creating `src/components/Form.tsx` — the main form wired to the action schema."

Generate a complete React component following these rules:

**TypeScript `FormData` interface** — one property per field across all inputs, outputs, and inouts. Map schema types to TypeScript as follows:

| Schema type | TypeScript type | Initial value |
|-------------|-----------------|---------------|
| `string` | `string` | `''` |
| `number` | `number` | `0` |
| `integer` | `number` | `0` |
| `boolean` | `boolean` | `false` |
| `array` | `<itemsType>[]` (e.g. `string[]`) | `[]` |
| `object` | a named nested interface, or `Record<string, unknown>` | `{}` |

**Imports:**
- If SDK_NEEDED=false: `import codedActionApps from '../uipath';`
- If SDK_NEEDED=true: `import uipath from '../uipath';`
- Always: `import { Theme, MessageSeverity } from '@uipath/uipath-ts-coded-action-apps';`

**Service accessor shorthand:**
- SDK_NEEDED=false: call `codedActionApps.getTask()`, `.completeTask()`, `.setTaskData()`, `.showMessage()` directly
- SDK_NEEDED=true: call `uipath.codedActionAppsService.getTask()` etc.; call other services via `uipath.<instanceName>`

**Theme helper** (always include):
```typescript
const isDarkTheme = (theme: Theme): boolean =>
  theme === Theme.Dark || theme === Theme.DarkHighContrast;
```

**Task initialisation** (always include):
```typescript
const [isReadOnly, setIsReadOnly] = useState(false);
const [folderId, setFolderId] = useState<any>(null);

useEffect(() => {
  <service>.getTask().then((task) => {
    if (task.data) setFormData(task.data as FormData);
    setFolderId(task.folderId);
    setIsReadOnly(task.isReadOnly);
    onInitTheme(isDarkTheme(task.theme));
  });
}, [onInitTheme]);
```

**`handleChange`:**
```typescript
const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  if (isReadOnly) return;
  const { name, value } = e.target;
  const updatedData = { ...formData, [name]: value };
  setFormData(updatedData);
  <service>.setTaskData(updatedData);
};
```

**Outcome handlers** — one `async` function per outcome:
```typescript
const handle<OutcomeName> = async () => {
  await <service>.completeTask('<OutcomeName>', { ...formData, action: '<OutcomeName>' });
};
```

**JSX rendering rules:**
| Field type | Renders as |
|------------|------------|
| `inputs` field | `<input readOnly value={formData.<name>} />` — never editable |
| `inOuts` field | `<input value={formData.<name>} onChange={handleChange} readOnly={isReadOnly} />` |
| `outputs` field | `<input value={formData.<name>} onChange={handleChange} readOnly={isReadOnly} />` |
| Outcome button | `<button onClick={handle<Name>} disabled={!isFormValid}>` |

**Hidden fields** — any field whose name appears in `<hidden-fields>` must be **omitted entirely from the JSX**. Do not render a label or input element for it. The field must still be present in the `FormData` interface, the initial state object, and submitted via `setTaskData`/`completeTask` — it is only invisible in the UI.

`isFormValid` must be `false` when `isReadOnly` is `true` or when any required output/inout field (that is **not** hidden) is empty.

---

### 4. `src/components/Form.css`

**Tell the user:** "Creating `src/components/Form.css`."

Generate professional form CSS using the design-system tokens from `index.css`. The form card must stand out clearly from the page canvas — never blend into the background.

**Design-system tokens available:**
- Surfaces: `--bg-canvas` (page bg), `--bg-card` (card bg), `--bg-hover`, `--bg-input`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`
- Borders: `--border-color`, `--border-strong`, `--border-focus`
- Accent: `--accent-color`, `--accent-hover`, `--accent-text`
- Shadows: `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- Radius: `--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (12px)

Must include:
- `.form-container` — `background: var(--bg-card)`, `border: 1px solid var(--border-color)`, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-md)`, generous `padding` (1.75rem–2rem)
- `.form-title` — section heading, `font-size: 1.1rem`, `font-weight: 600`, `color: var(--text-primary)`, bottom border separator `1px solid var(--border-color)`
- `.form-group` — stacked label + input, `margin-bottom: 1.1rem`
- `label` — `font-size: 0.8rem`, `font-weight: 500`, `color: var(--text-secondary)`, `text-transform: uppercase`, `letter-spacing: 0.04em`, `margin-bottom: 0.35rem`
- `input`, `textarea` — full width, `background: var(--bg-input)`, `border: 1px solid var(--border-color)`, `border-radius: var(--radius-sm)`, `padding: 0.5rem 0.75rem`, `color: var(--text-primary)`, `font-size: 0.9rem`, transition on border-color and box-shadow; on `:focus` use `border-color: var(--border-focus)` and `box-shadow: 0 0 0 3px rgba(250,70,22,0.15)`
- `input[readonly]`, `textarea[readonly]` — `background: var(--bg-hover)`, `color: var(--text-secondary)`, `border-color: var(--border-color)`, `cursor: default`
- `.form-section` — optional grouping block with subtle left border `3px solid var(--border-color)`, `padding-left: 1rem`, `margin-bottom: 1.5rem`
- `.form-buttons` — `display: flex`, `justify-content: flex-end`, `gap: 0.75rem`, `padding-top: 1.25rem`, `border-top: 1px solid var(--border-color)`, `margin-top: 1.5rem`
- Outcome buttons — `padding: 0.55rem 1.4rem`, `border-radius: var(--radius-sm)`, `font-weight: 600`, `font-size: 0.875rem`, `cursor: pointer`, `transition: 0.2s`; primary outcome uses `background: var(--accent-color)`, `color: var(--accent-text)`, `border: none`; secondary outcomes use `background: transparent`, `border: 1.5px solid var(--border-strong)`, `color: var(--text-primary)`; `:disabled` — `opacity: 0.45`, `cursor: not-allowed`

Apply `<form-description>` layout intent (e.g. two-column grid, summary card at top) when it was provided by the user.

---

### 5. PDF viewer (when displaying PDF documents)

**When to use this step:** Any time the app needs to display a PDF — whether from a Storage Bucket, a blob, or a direct URL. This step applies both when building from scratch and when reviewing existing code.

#### Anti-pattern warning — ALWAYS enforce

> **If the user's code or plan uses `<embed>`, `<object>`, `<iframe src="...">`, or any browser-native PDF embedding tag to display PDFs, stop and warn them:**
>
> "`<embed>`, `<object>`, and `<iframe>` PDF rendering will not work inside UiPath Action Center. Action Center loads coded apps inside a sandboxed iframe with strict CSP/sandbox attributes that block browser-native PDF plugins entirely. You must use an open-source JavaScript PDF renderer instead. Please review the implementation below."
>
> Then present the pattern from this section and ask the user to confirm before generating.

#### Required package

Add `react-pdf` to `dependencies` in `package.json` and install it:

```bash
npm install react-pdf
```

`react-pdf` bundles `pdfjs-dist` as a peer dependency. Set the worker URL at module level using the unpkg CDN — no extra webpack/vite config needed:

```typescript
pdfjs.GlobalWorkerOptions.workerSrc =
  `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
```

#### Component template — `src/components/DocumentTab.tsx`

**Tell the user:** "Creating `src/components/DocumentTab.tsx` — PDF viewer using `react-pdf`."

Generate this component. Adapt `bucketName`, `filePath`, and `folderId` props to match whatever source the app uses (Storage Bucket is the default; if a direct URL is already available, skip the bucket-fetching block and accept a `fileUrl` prop instead).

```typescript
import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import uipath from '../uipath';
import './DocumentTab.css';

pdfjs.GlobalWorkerOptions.workerSrc =
  `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentTabProps {
  bucketName: string;
  filePath: string;
  folderId: number | null;
}

export default function DocumentTab({ bucketName, filePath, folderId }: DocumentTabProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pageRendering, setPageRendering] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  // Fetch PDF from storage bucket
  useEffect(() => {
    if (!bucketName || !filePath || folderId == null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFileUrl(null);
    setPageNumber(1);

    (async () => {
      try {
        const bucketsResult = await uipath.bucketService.getAll({
          filter: `name eq '${bucketName}'`,
          folderId,
        });
        if (cancelled) return;

        const bucket = bucketsResult.items[0];
        if (!bucket) throw new Error(`Storage bucket "${bucketName}" not found.`);

        const uriResponse = await uipath.bucketService.getReadUri({
          bucketId: bucket.id,
          folderId,
          path: filePath,
        });
        if (cancelled) return;

        let url: string;
        if (uriResponse.requiresAuth) {
          const response = await fetch(uriResponse.uri, { headers: uriResponse.headers });
          if (!response.ok) throw new Error(`Download failed (HTTP ${response.status}).`);
          const blob = await response.blob();
          url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
        } else {
          url = uriResponse.uri;
        }

        if (!cancelled) setFileUrl(url);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load document.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [bucketName, filePath, folderId]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const goToPrev = () => setPageNumber((p) => Math.max(1, p - 1));
  const goToNext = () => setPageNumber((p) => Math.min(numPages, p + 1));
  const zoomIn  = () => setScale((s) => Math.min(2.5, parseFloat((s + 0.2).toFixed(1))));
  const zoomOut = () => setScale((s) => Math.max(0.4, parseFloat((s - 0.2).toFixed(1))));
  const resetZoom = () => setScale(1.0);

  const handleDownload = async () => {
    if (!fileUrl) return;
    const fileName = filePath.split('/').pop() || 'document.pdf';
    let blobUrl: string;
    let tempBlob = false;
    if (fileUrl.startsWith('blob:')) {
      blobUrl = fileUrl;
    } else {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      blobUrl = URL.createObjectURL(blob);
      tempBlob = true;
    }
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (tempBlob) URL.revokeObjectURL(blobUrl);
  };

  if (loading) {
    return (
      <div className="pdf-shell">
        <div className="pdf-skeleton">
          <div className="pdf-skeleton__toolbar" />
          <div className="pdf-skeleton__page" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdf-shell pdf-shell--center">
        <div className="pdf-error">
          <span className="pdf-error__icon">⚠</span>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!fileUrl) {
    return (
      <div className="pdf-shell pdf-shell--center">
        <p className="pdf-empty">
          {bucketName && filePath
            ? 'Document will load when task data is available.'
            : 'No document path provided.'}
        </p>
      </div>
    );
  }

  return (
    <div className="pdf-shell">
      <div className="pdf-toolbar">
        <div className="pdf-toolbar__group">
          <button className="pdf-btn" onClick={goToPrev} disabled={pageNumber <= 1} title="Previous page">‹</button>
          <span className="pdf-page-info">
            <span className="pdf-page-info__current">{pageNumber}</span>
            <span className="pdf-page-info__sep">/</span>
            <span className="pdf-page-info__total">{numPages}</span>
          </span>
          <button className="pdf-btn" onClick={goToNext} disabled={pageNumber >= numPages} title="Next page">›</button>
        </div>
        <div className="pdf-toolbar__group">
          <button className="pdf-btn" onClick={zoomOut} disabled={scale <= 0.4} title="Zoom out">−</button>
          <button className="pdf-btn pdf-btn--zoom-label" onClick={resetZoom} title="Reset zoom">
            {Math.round(scale * 100)}%
          </button>
          <button className="pdf-btn" onClick={zoomIn} disabled={scale >= 2.5} title="Zoom in">+</button>
        </div>
        <div className="pdf-toolbar__group">
          <button className="pdf-btn pdf-btn--download" onClick={handleDownload} title="Download PDF">
            ⬇ Download
          </button>
        </div>
      </div>
      <div className="pdf-viewport">
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="pdf-page-loading">Loading…</div>}
          error={<div className="pdf-page-error">Failed to load PDF.</div>}
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            onRenderSuccess={() => setPageRendering(false)}
            onRenderError={() => setPageRendering(false)}
            loading={<div className="pdf-page-loading">Rendering page…</div>}
            className={`pdf-page${pageRendering ? ' pdf-page--rendering' : ''}`}
          />
        </Document>
      </div>
    </div>
  );
}
```

#### CSS — `src/components/DocumentTab.css`

**Tell the user:** "Creating `src/components/DocumentTab.css`."

Generate CSS for the PDF viewer using the design-system variables from `index.css`. Must include:
- `.pdf-shell` — flex column, full height, `background: var(--bg-secondary)`, `border-radius`, `overflow: hidden`
- `.pdf-shell--center` — centered content for loading/error/empty states
- `.pdf-toolbar` — sticky top bar, flex row, `justify-content: space-between`, `background: var(--bg-primary)`, `border-bottom: 1px solid var(--border-color)`, `padding: 0.5rem`
- `.pdf-toolbar__group` — `display: flex`, `align-items: center`, `gap: 0.25rem`
- `.pdf-btn` — compact button using `var(--bg-secondary)` / `var(--border-color)` / `var(--text-primary)`, `border-radius: 4px`, hover state
- `.pdf-btn--zoom-label` — fixed-width label button showing zoom percentage
- `.pdf-btn--download` — flex row with icon + text, uses `var(--accent-color)`
- `.pdf-page-info` — `display: flex`, `align-items: center`, `gap: 0.25rem`, `font-size: 0.85rem`
- `.pdf-viewport` — `flex: 1`, `overflow-y: auto`, centered page canvas
- `.pdf-skeleton__toolbar` and `.pdf-skeleton__page` — pulsing skeleton placeholders
- `.pdf-error` — centered error card with `var(--accent-color)` icon
- `.pdf-page--rendering` — `opacity: 0.6` during page transitions

---

### Run validate script

**Tell the user:** "Validating the project structure."

```bash
bash <skill-base-dir>/scripts/validate.sh "<app-name>"
```

If validation fails (exit code > 0), fix the reported issues before proceeding.

---

### Build verification

After all files are written, run:

```bash
cd <app-name> && npm run build
```

Fix all TypeScript errors before marking the task complete. Re-run `npm run build` after each fix until it succeeds with zero errors.

---

## Checklist

After all files are written, print a file tree of `<app-name>/` and confirm:

- [ ] `action-schema.json` matches the intended data contract
- [ ] `uipath.json` — fill in `scopes`, `clientId` and repack before deploying (if typescript SDK is being used)
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run dev` starts the local dev server
- [ ] Deploy using the UiPath TS CLI with `--type Action` on publish:
  ```bash
  uipath pack ./dist --name "<app-name>" --version "1.0.0" --reuse-client ...
  uipath publish --name "<app-name>" --type Action ...
  uipath deploy --name "<app-name>" ...
  ```
  **IMPORTANT:** You MUST use `--type Action` on `uipath publish`. Without it, the app registers as a regular web app and will NOT appear as a task app in Action Center.

---

## Warning: Input fields must be read-only

> **Important — `action-schema.json` inputs must be read-only in the form.**
>
> Maestro and Agents only track declared **inputs**, **outputs**, and **inouts**. Editing an input field is silently ignored — the workflow always uses the original upstream value.
>
> | Schema field type | Form behaviour |
> |-------------------|----------------|
> | `input`  | Always `readOnly` — never editable |
> | `output` | Editable — user fills this in |
> | `inout`  | Editable — pre-populated from upstream, user can modify |
>
> The generated `Form.tsx` already enforces this. Do not change input fields to editable.

---

## SDK Reference

> Reference files live in the `create-app` skill: `../create-app/references/`. Always read the relevant file before writing any service code.

---

## A. UiPath Services Overview

- **Orchestrator Processes** — the core execution unit in UiPath. A "process" can be an RPA automation, an agentic process (AI agent), or a case management process. **To start any of these — including Maestro processes, cases, or agents — use `Processes.start()`** from `@uipath/uipath-typescript/processes`.
- **Buckets** — cloud storage buckets used by automations to store and retrieve files (documents, data exports, etc.).
- **Assets** — key-value configuration stored in Orchestrator (credentials, settings, connection strings) that automations read at runtime.
- **Queues** — work queues that hold transaction items for automations to process (e.g., invoice records, customer requests).
- **Entities (Data Fabric)** — structured data tables in UiPath's Data Service. Think of them as database tables with schema, records, and relationships. ChoiceSets are enum-like picklists for entity fields.
- **Tasks (Action Center)** — human-in-the-loop tasks or escalations created by automations when human input/approval is needed.
- **Maestro Processes & Cases** — orchestration layer for complex workflows. MaestroProcesses are monitored process definitions; ProcessInstances are running executions. Cases are long-running business cases with stages.
- **Process Incidents** — errors or exceptions that occur during process instance execution.
- **Conversational Agent** — real-time chat with UiPath AI agents via WebSocket.

---

## B. SDK Module Import Table

| Subpath | Classes |
|---------|---------|
| `@uipath/uipath-typescript/core` | `UiPath`, `UiPathError`, pagination types |
| `@uipath/uipath-typescript/entities` | `Entities`, `ChoiceSets` |
| `@uipath/uipath-typescript/tasks` | `Tasks` |
| `@uipath/uipath-typescript/maestro-processes` | `MaestroProcesses`, `ProcessInstances`, `ProcessIncidents` |
| `@uipath/uipath-typescript/cases` | `Cases`, `CaseInstances` |
| `@uipath/uipath-typescript/assets` | `Assets` |
| `@uipath/uipath-typescript/queues` | `Queues` |
| `@uipath/uipath-typescript/buckets` | `Buckets` |
| `@uipath/uipath-typescript/processes` | `Processes` |
| `@uipath/uipath-typescript/conversational-agent` | `ConversationalAgent`, `Exchanges`, `Messages` |

Types, enums, and option interfaces are exported from the same subpath as their service class.

---

## C. Type-Driven Development Rules

When using any SDK service method, follow these rules strictly:

1. **Always import the response type** from the same subpath as the service class. Example: `import type { AssetGetResponse } from '@uipath/uipath-typescript/assets'`
2. **Read the imported interface** to know what fields are available. Only access properties defined in the type. Never guess field names.
3. **Import option types** for method parameters. Example: `import type { AssetGetAllOptions } from '@uipath/uipath-typescript/assets'`
4. **Import enums** from the SDK for any field that uses an enum value. Example: `import { TaskPriority, TaskType, TaskStatus } from '@uipath/uipath-typescript/tasks'`
5. **Use `OperationResponse<T>`** type for mutation results (import from `@uipath/uipath-typescript`). Has shape `{ success: boolean; data: T }`.
6. **Method-attached responses**: Some `getById`/`getAll` responses include callable methods. The response type is a union: `EntityGetResponse = RawEntityGetResponse & EntityMethods`. Read the `*Methods` interface to know available instance methods.
7. **Reference files are your primary source.** The `../create-app/references/` files contain all method signatures, types, enums, and fields you need. Only fall back to inspecting `node_modules` type definitions if the reference files do not cover the specific method or type you need.

---

## D. Anti-Patterns — NEVER Do These

- **NEVER import service classes from the root package** (`import { Entities } from '@uipath/uipath-typescript'`). Service classes are only available via subpath imports.
- **NEVER use deprecated dot-chain access** like `sdk.entities.getAll()`. Always use constructor-based DI: `import { UiPath } from '@uipath/uipath-typescript/core'` and `const entities = new Entities(sdk)`.
- **NEVER guess field names** on response objects. Import the response type and read its interface.
- **NEVER add `offline_access` to the scopes string.** It is not a valid scope for this SDK. Only use scopes from `../create-app/references/oauth-scopes.md`.
- **NEVER pass `expand: 'TaskSource'` to `tasks.getAll()`.** The `taskSource` field is a direct property on the task response — NOT an OData navigation property. Passing it as an expand value causes a backend error.
- **NEVER use `taskSource`, `taskSourceMetadata`, `tags`, or `parentOperationId` to correlate tasks with process instances.** Filter tasks by `CreatorJobKey`: `tasks.getAll({ filter: "CreatorJobKey eq ${instanceId}" })`.
- **NEVER call paginated methods without `pageSize`** for production use. Unpaginated calls fetch all records and can be slow or hit limits.
- **NEVER mix `folderId` (number) with `folderKey` (string), and NEVER use `parseInt(folderKey)` to convert between them.** They are completely different identifiers. Orchestrator services use numeric `folderId`. Maestro services use string `folderKey`. See "Bridging folderKey ↔ folderId" in `../create-app/references/orchestrator.md`.
- **NEVER use a process name as a `processKey`.** When the user provides a process name, first call `MaestroProcesses.getAll()`, find the matching process by `name`, then use its `processKey`.
- **NEVER use `packageId` as a `processKey` when calling `Processes.start()`.** `processKey` is the Orchestrator release key; `packageId` is the NuGet package identifier. They are different fields.
- **Prefer `../create-app/references/` over `node_modules`** — always check the reference files first. Only fall back to inspecting `node_modules` type definitions if the reference files do not cover the specific method or type you need.
- **NEVER render `getVariables()` arrays directly in polled components.** Accumulate into a `Map`, sort by name, use `lastDataRef` to prevent DOM teardown. See `../create-app/references/patterns.md`.
- **NEVER render a detail component without `key={selectedId}` in a master-detail layout.**
- **NEVER call `usePolling` without `deps` when the polled target can change.**
- **NEVER toggle loading/polling state on each fetch cycle.** `isLoading` must only transition once (true→false after first fetch).
- **NEVER widen task search when the `CreatorJobKey` filter returns no results.** Show a clear error. Do NOT fall back to "pick the first Maestro task".
- **NEVER compare `task.type` against string literals.** Always use the `TaskType` enum: `TaskType.Form`, `TaskType.App`, `TaskType.External`.
- **NEVER cast SDK response types to `Record<string, unknown>` or other generic types.** Construct a plain object with only the fields you need when passing `data` to `completeTask`.
- **NEVER use `<embed>`, `<object>`, or `<iframe src="...">` to display PDFs.** Action Center's sandboxed iframe blocks browser-native PDF plugins. Use `react-pdf` instead — see step 5.

---

## E. OAuth Scopes (only when SDK_NEEDED=true)

Scopes are deduced automatically in Q3c from the selected services and confirmed by the user. The reference file is the single source of truth.

**CRITICAL: Only use scopes from [oauth-scopes.md](../create-app/references/oauth-scopes.md).**

Rules:
- **Read `../create-app/references/oauth-scopes.md`** to look up scopes for every service selected in Q3b.
- **Only include scopes listed in that file.** Never guess or invent scopes. Do NOT add `offline_access`.
- **Only request scopes the app actually needs** based on which SDK methods it calls.
- **When the app uses Data Fabric `Entities`, ask whether they are tenant-scoped or folder-scoped.** Only add `OR.Users` if folder-scoped — it is not needed for tenant-scoped entities.

---

## F. Service Usage Pattern in Components

Action app services are module-level singletons in `src/uipath.ts`. Import and use them directly — no `useAuth()` hook:

```typescript
import uipath from '../uipath';

// Use directly in useEffect or event handlers:
const result = await uipath.bucketService.getAll({ folderId });
const entities = await uipath.entityService.getAll({ pageSize: 20 });

// Errors:
catch (err) { err instanceof UiPathError ? err.message : 'Failed' }

// Parallel:
const [a, b] = await Promise.all([uipath.assetsService.getAll(), uipath.queuesService.getAll()])
```

**Data fetching rules:**
1. **Show data as it arrives.** Use independent loading states per data source.
2. **Fetch in parallel.** Use `Promise.all()` for unrelated fetches.
3. **NEVER dump raw JSON in the UI.** Always parse and render structured UI — tables, key-value grids, collapsible cards.

---

## G. Pagination

Import pagination types from `@uipath/uipath-typescript/core`:

- `PaginationCursor`: `{ value: string }` — an **object**, not a plain string.
- `PaginationOptions`: `{ pageSize?, cursor?: PaginationCursor, jumpToPage? }`
- `PaginatedResponse<T>`: `{ items, hasNextPage, nextCursor?, previousCursor?, totalCount?, supportsPageJump }`
- `NonPaginatedResponse<T>`: `{ items, totalCount? }`

No pagination options → `NonPaginatedResponse<T>`. Any pagination option → `PaginatedResponse<T>`.

Use `'hasNextPage' in result` at runtime to discriminate between the two return types.

See `../create-app/references/pagination.md` for the full `usePagination` hook and `PaginationControls` component. **Every list view MUST have pagination controls.**

---

## H. Polling, BPMN Rendering & Process Data

**Read `../create-app/references/patterns.md`** when building components that need:
- Auto-refreshing data (polling hook)
- BPMN diagram rendering (`bpmn-js`)
- Displaying process instance variables (structured tables — never raw JSON)
- HITL detection via `getVariables()` + `getBpmn()`

---

## I. Conversational Agent Chat UI Rules

**Read `../create-app/references/conversational-agent.md`** for the full API. Key rules:

1. Add assistant placeholder message **immediately** in `sendMessage()` — before calling `startExchange()`.
2. Pre-register `exchangeId → assistantMessageId` mapping before `startExchange()`.
3. Show bouncing dots inside the assistant bubble when `isStreaming && !content`.
4. Use a single `isStreaming` state — set `true` in `sendMessage()`, `false` in `onExchangeEnd()`.
5. Use `echo: true` on `startSession()`.
6. Auto-scroll to latest message using a `useRef` on the container bottom.
7. Send messages via `exchange.startMessage()` → `message.sendContentPart()` → `message.sendMessageEnd()`.

---

## J. Error Handling

All SDK errors extend `UiPathError` (import from `@uipath/uipath-typescript/core`).

Specific types: `AuthorizationError`, `ValidationError`, `NotFoundError`, `RateLimitError`, `ServerError`, `NetworkError`.

```typescript
import { UiPathError, NotFoundError } from '@uipath/uipath-typescript/core';

try {
  const result = await uipath.bucketService.getAll({ folderId });
} catch (err) {
  if (err instanceof NotFoundError) {
    // Resource not found
  } else if (err instanceof UiPathError) {
    console.error(err.message);
  }
}
```

---

## K. Service Reference Files

**MANDATORY — read the reference file for each service your component uses** before writing any service code.

**When determining OAuth scopes (SDK_NEEDED=true):** MANDATORY — read [oauth-scopes.md](../create-app/references/oauth-scopes.md) first.

| Reference | Services | When to load |
|-----------|----------|--------------|
| [data-fabric.md](../create-app/references/data-fabric.md) | Entities, ChoiceSets | App reads/writes Data Service entities |
| [maestro.md](../create-app/references/maestro.md) | MaestroProcesses, ProcessInstances, ProcessIncidents, Cases, CaseInstances | App monitors or manages process/case instances |
| [orchestrator.md](../create-app/references/orchestrator.md) | Assets, Queues, Buckets, Processes | App uses Orchestrator resources or starts processes |
| [action-center.md](../create-app/references/action-center.md) | Tasks | App creates, assigns, or completes Action Center tasks |
| [patterns.md](../create-app/references/patterns.md) | usePolling, BPMN, HITL detection, process data rendering | App needs polling, diagrams, or process variable display |
| [oauth-scopes.md](../create-app/references/oauth-scopes.md) | All | **Always when SDK_NEEDED=true** — read before setting scopes |
| [conversational-agent.md](../create-app/references/conversational-agent.md) | ConversationalAgent, Exchanges, Messages | App uses real-time AI chat |
| [pagination.md](../create-app/references/pagination.md) | All paginated services | App has any list view with pagination |
| [oauth-client-setup.md](../create-app/references/oauth-client-setup.md) | Playwright browser automation | User doesn't have a client ID and needs one created via UiPath admin portal |
