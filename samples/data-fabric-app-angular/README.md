# UiPath Data Fabric Sample App (Angular)

A sample Angular + TypeScript application for browsing and managing **UiPath Data Fabric** entities, records, and choice sets via the UiPath TypeScript SDK. Deploys as a UiPath Coded App.

This is the Angular counterpart of the React sample in [`../data-fabric-app`](../data-fabric-app). The SDK usage is identical — only the UI framework differs. Because the `@uipath/ui-widgets-datatable` records grid is React-only, this app renders its own grid and calls the SDK's record CRUD methods (`insertRecordById`, `updateRecordById`, `deleteRecordsById`) directly, so it exercises a wider slice of the `Entities` service than the React sample does.

## SDK Usage

### Importing the SDK

```typescript
// Core SDK for authentication
import { UiPath, UiPathError } from '@uipath/uipath-typescript/core'

// Entities + ChoiceSets services
import { Entities, ChoiceSets } from '@uipath/uipath-typescript/entities'
import type {
  EntityGetResponse,
  EntityRecord,
  ChoiceSetGetResponse,
} from '@uipath/uipath-typescript/entities'
```

### Initializing the SDK

```typescript
// Create SDK instance — no config needed for Coded Apps;
// the SDK reads from <meta name="uipath:*"> tags injected by the platform
// (or by tools/uipath-meta-tags.mjs during local dev).
const sdk = new UiPath()
await sdk.initialize()

// Create service instances
const entities = new Entities(sdk)
const choiceSets = new ChoiceSets(sdk)

// Use services
const allEntities = await entities.getAll()
const entitySchema = await entities.getById(entityId)
const records = await entities.getAllRecords(entityId, { pageSize: 100 })
const allChoiceSets = await choiceSets.getAll()
const choiceValues = await choiceSets.getById(choiceSetId)
```

### SDK methods exercised by this sample

| Service | Method | Where it's used |
| ------- | ------ | --------------- |
| `Entities` | `getAll` | Sidebar entity list (`EntitiesListComponent`) |
| `Entities` | `getById` | Schema panel + page header (`EntityDetailComponent`) |
| `Entities` | `getAllRecords` | Records grid + CSV export (cursor-looped to fetch every page) |
| `Entities` | `getRecordById` | Row Inspector modal (`RowInspectorComponent`) |
| `Entities` | `insertRecordById` | "Add data" modal (`RecordEditorComponent`) |
| `Entities` | `updateRecordById` | Per-row Edit action (`RecordEditorComponent` in edit mode) |
| `Entities` | `deleteRecordsById` | Batch delete of selected rows (`EntityDetailComponent`) |
| `Entities` | `uploadAttachment` / `downloadAttachment` / `deleteAttachment` | File-type fields in `RecordEditorComponent` + Row Inspector |
| `ChoiceSets` | `getAll` | Sidebar "Choice sets" section + choice set header metadata |
| `ChoiceSets` | `getById` | Choice set values table + choice-set field pickers |

## Installation

```bash
npm install
```

## Setup Instructions

### 1. Prerequisites

- [Node.js 20+](https://uipath.github.io/uipath-typescript/getting-started/#prerequisites)
- UiPath Cloud tenant access
- An OAuth External Application configured in UiPath Admin Center (Data Fabric scopes)

### 2. Configure OAuth Application

1. In UiPath Cloud: **Admin → External Applications**
2. Click **Add Application → Non Confidential Application**
3. Configure:
   - **Name**: e.g., "Data Fabric Sample App (Angular)"
   - **Redirect URI**: `http://localhost:4200` (for development)
   - **Scopes**: `DataFabric.Schema.Read`, `DataFabric.Data.Read`, `DataFabric.Data.Write`
4. Save and copy the **Client ID**

### 3. Local Configuration

Copy the template and fill in your tenant values:

```bash
cp uipath.json.example uipath.json
```

Edit `uipath.json`:

```json
{
  "clientId": "<your-oauth-external-app-client-id>",
  "scope": "DataFabric.Schema.Read DataFabric.Data.Read DataFabric.Data.Write",
  "orgName": "<your-org-name>",
  "tenantName": "<your-tenant-name>",
  "baseUrl": "https://api.uipath.com",
  "redirectUri": "http://localhost:4200"
}
```

> `uipath.json` is `.gitignore`d on purpose — it carries tenant-specific credentials. Only `uipath.json.example` is committed.

### 4. Run

```bash
npm run dev
```

Open `http://localhost:4200`.

### 5. Authentication Flow

1. Click **"Sign in with UiPath"**.
2. You'll be redirected to UiPath Cloud for OAuth.
3. After login you return to the app, which initializes the SDK from the `<meta name="uipath:*">` tags in `index.html`.

## How the meta-tag injection works

The React sample uses the `@uipath/coded-apps-dev` Vite plugin to inject `<meta name="uipath:*">` tags into `index.html` during local dev. Angular CLI doesn't run Vite plugins, so this app uses the equivalent Angular mechanism: an [`indexHtmlTransformer`](https://angular.dev/reference/configs/workspace-config) (see `tools/uipath-meta-tags.mjs`, wired up in `angular.json`). It reads `uipath.json` and injects the same tags at serve/build time. When `uipath.json` is absent (e.g. building for deployment without local config), it's a no-op — at deploy time the UiPath platform injects production values, so the same `new UiPath()` init code works in both places.

## Application Structure

```
tools/
└── uipath-meta-tags.mjs          # Angular indexHtmlTransformer — injects
                                  # <meta name="uipath:*"> tags from uipath.json
src/
├── app/
│   ├── components/
│   │   ├── choice-set-detail.component.ts  # Right pane when a choice set is selected
│   │   ├── choice-set-view.component.ts    # Values table for one choice set
│   │   ├── entities-list.component.ts      # Left sidebar (Entities + Choice Sets sections)
│   │   ├── entity-detail.component.ts      # Right pane when an entity is selected
│   │   ├── header.component.ts             # App header + theme toggle + Sign out
│   │   ├── icons.ts                        # Inline SVG icon components (Lucide paths)
│   │   ├── login-screen.component.ts       # OAuth login screen
│   │   ├── record-editor.component.ts      # Modal form for create + edit (+ attachments)
│   │   ├── records-table.component.ts      # Records grid: sort, paginate, select, edit
│   │   ├── row-inspector.component.ts      # Read-only modal showing all fields incl. system
│   │   └── toast-container.component.ts    # Toast feedback UI
│   ├── core/
│   │   ├── auth.service.ts                 # SDK init + auth state (signals)
│   │   ├── theme.service.ts                # Light/dark mode persistence
│   │   └── toast.service.ts                # Toast queue
│   ├── lib/
│   │   ├── csv-export.ts                   # Records → CSV download
│   │   ├── download.ts                     # Blob → file helper
│   │   ├── entity-types.ts                 # Entity-type classification (VDO / ChoiceSet / read-only)
│   │   └── format.ts                       # Cell value formatting
│   └── app.component.ts                    # Shell: routes between EntityDetail / ChoiceSetDetail
├── index.html
├── main.ts                                 # Entry point
└── styles.css                              # Design tokens (light + dark) + shared primitives
```

## Key Features

### Catalog sidebar
- Two collapsible sections — **Entities** and **Choice Sets** — sourced from `Entities.getAll()` and `ChoiceSets.getAll()` respectively.
- Search filters both sections at once; entity-type badges (VDO / SystemEntity) help distinguish non-standard entities.
- Single refresh button reloads both lists in parallel.

### Entity detail
- Schema panel (collapsible) listing every field with type, required marker, and system flag.
- Records grid with client-side sorting, pagination, and multi-row selection. The full record set is fetched by looping `Entities.getAllRecords` cursors.
- "Add data" opens a modal form (`RecordEditorComponent`) with required-field validation, choice-set pickers, and attachment upload.
- Per-row **Edit** opens the same modal in edit mode, saving via `Entities.updateRecordById`. Existing attachments can be replaced or removed (`deleteAttachment`).
- Selecting rows reveals a **Delete (N)** button backed by `Entities.deleteRecordsById`, with partial-failure reporting.
- Click the `Id` cell to open a read-only **Row Inspector** that loads the full record via `Entities.getRecordById` (including system fields).
- "Export CSV" downloads the freshly-fetched records (RFC 4180 escaping, UTF-8 BOM).
- VDOs and InternalEntity are detected up-front and rendered with a friendly notice instead of a failing API call. SystemEntity renders in read-only mode.

### Choice set detail
- Header pulls metadata (description, last updated) from `ChoiceSets.getAll()`.
- Values table rendered from `ChoiceSets.getById()`, cursor-looped for the full set. Read-only (the SDK doesn't expose mutation methods for choice-set values in this app's scope).

### Theme & polish
- Semantic design tokens for light + dark mode (persisted, defaults to the OS preference).
- Inter (sans) + IBM Plex Mono (mono).
- Toast feedback, skeleton loaders, tooltips on truncated labels.

## Technologies Used

- **Angular 20** (standalone components, signals, built-in control flow) + **TypeScript**
- **@uipath/uipath-typescript** — the SDK under test
- **OAuth 2.0** (handled by the SDK) for authentication

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

uip codedapp pack ./dist --name data-fabric-app-angular --version 1.0.0
uip codedapp publish
uip codedapp deploy
```

See the [Coded Apps CLI reference](https://uipath.github.io/uipath-typescript/coded-apps/cli-reference/) for full options.

## Troubleshooting

### Common issues

1. **Authentication fails / "Invalid redirect URI"** — verify the redirect URI on the External App matches `http://localhost:4200` for dev, and your deployed URL for production.

2. **Login screen shows but sign-in does nothing** — the meta tags probably weren't injected. Confirm `uipath.json` exists at the project root and restart `npm run dev` (the transformer runs at serve time). View the page source and check for `<meta name="uipath:client-id" …>`.

3. **Records grid errors immediately** — usually means the SDK couldn't initialize or the OAuth app is missing a Data Fabric scope. Check the browser console for `UiPathError` messages and verify `uipath.json` has the right `orgName` / `tenantName`.

### Getting help

- [UiPath TypeScript SDK documentation](https://uipath.github.io/uipath-typescript/)
- [UiPath Data Fabric documentation](https://docs.uipath.com/data-service/automation-cloud/latest)
