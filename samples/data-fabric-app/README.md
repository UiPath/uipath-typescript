# UiPath Data Fabric Sample App

A sample React + TypeScript application for browsing and managing **UiPath Data Fabric** entities, records, and choice sets via the UiPath TypeScript SDK. Deploys as a UiPath Coded App.

## SDK Usage

### Importing the SDK

```typescript
// Core SDK for authentication
import { UiPath, UiPathError } from '@uipath/uipath-typescript/core';

// Entities + ChoiceSets services
import { Entities, ChoiceSets } from '@uipath/uipath-typescript/entities';
import type {
  EntityGetResponse,
  EntityRecord,
  ChoiceSetGetResponse,
} from '@uipath/uipath-typescript/entities';
```

### Initializing the SDK

```typescript
// Create SDK instance — empty config is fine for Coded Apps;
// the SDK reads from <meta name="uipath:*"> tags injected by the platform
// (or by the @uipath/coded-apps-dev Vite plugin during local dev).
const sdk = new UiPath({});
await sdk.initialize();

// Create service instances
const entities = new Entities(sdk);
const choiceSets = new ChoiceSets(sdk);

// Use services
const allEntities = await entities.getAll();
const entitySchema = await entities.getById(entityId);
const records = await entities.getAllRecords(entityId);
const allChoiceSets = await choiceSets.getAll();
const choiceValues = await choiceSets.getById(choiceSetId);
```

### SDK methods exercised by this sample

All methods below are called directly from this app's code. The
data-table widget independently calls additional SDK methods internally
(batch insert/update/delete via instance methods on the Entity object)
when users interact with the grid — those aren't listed here.

| Service | Method | Where it's used |
| ------- | ------ | --------------- |
| `Entities` | `getAll` | Sidebar entity list (`useEntities`) |
| `Entities` | `getById` | Schema panel + page header (`useEntity`) |
| `Entities` | `getAllRecords` | CSV export + read-only records table (`useEntity.reloadRecords`) |
| `Entities` | `getRecordById` | Row Inspector modal (`RowInspector`) |
| `Entities` | `insertRecordById` | "Add data" modal (`RecordEditor`) |
| `Entities` | `uploadAttachment` / `downloadAttachment` / `deleteAttachment` | File-type fields in `RecordEditor` + Row Inspector |
| `ChoiceSets` | `getAll` | Sidebar "Choice sets" section (`useChoiceSets`) |
| `ChoiceSets` | `getById` | Choice set detail view (`useChoiceSet`) |

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
   - **Name**: e.g., "Data Fabric Sample App"
   - **Redirect URI**: `http://localhost:5173` (for development)
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
  "redirectUri": "http://localhost:5173"
}
```

> `uipath.json` is `.gitignore`d on purpose — it carries tenant-specific credentials. Only `uipath.json.example` is committed.

### 4. Run

```bash
npm run dev
```

Open `http://localhost:5173`.

### 5. Authentication Flow

1. Click **"Sign in with UiPath"**.
2. You'll be redirected to UiPath Cloud for OAuth.
3. After login you return to the app, which initializes the SDK from the `<meta>` tags emitted by `@uipath/coded-apps-dev`.

## Application Structure

```
src/
├── components/
│   ├── ChoiceSetDetail.tsx   # Right pane when a choice set is selected
│   ├── ChoiceSetView.tsx     # Values table for one choice set
│   ├── EntitiesList.tsx      # Left sidebar (Entities + Choice Sets sections)
│   ├── EntityDetail.tsx      # Right pane when an entity is selected
│   ├── Header.tsx            # App header + Sign out
│   ├── LoginScreen.tsx       # OAuth login screen
│   ├── RecordEditor.tsx      # Modal form for create + edit
│   ├── RowInspector.tsx      # Read-only modal showing all fields incl. system
│   ├── ThemeProvider.tsx     # Light/dark mode wiring (next-themes)
│   ├── ThemeToggle.tsx       # Sun/moon toggle button
│   └── ui/                   # shadcn primitives (Button, Dialog, ...)
├── hooks/
│   ├── useAuth.tsx           # SDK init + auth context
│   ├── useChoiceSet.ts       # ChoiceSets.getById
│   ├── useChoiceSets.ts      # ChoiceSets.getAll
│   ├── useEntities.ts        # Entities.getAll
│   ├── useEntity.ts          # Entities.getById + record fetcher
│   └── useWidgetToolbar.ts   # Hides widget actions we've replaced in our UI
├── lib/
│   ├── csvExport.ts          # Records → CSV download
│   ├── download.ts           # Blob → file helper
│   ├── entityTypes.ts        # VDO / Case / ChoiceSet detection
│   ├── utils.ts              # shadcn `cn` helper
│   └── widgetCompat.ts       # Widget/SDK telemetry shim
├── App.tsx                   # Routes between EntityDetail / ChoiceSetDetail
├── index.css                 # Apollo Vertex tokens, AG Grid overrides
└── main.tsx                  # Entry point
```

## Key Features

### Catalog sidebar
- Two collapsible sections — **Entities** and **Choice Sets** — sourced from `Entities.getAll()` and `ChoiceSets.getAll()` respectively.
- Search filters both sections at once; entity-type badges (VDO / SystemEntity) help distinguish non-standard entities.
- Single refresh button reloads both lists in parallel.

### Entity detail
- Schema panel (collapsible) listing every field with type, required marker, and FK target.
- Records grid backed by [`@uipath/ui-widgets-datatable`](https://uipath.github.io/uipath-ui-widgets/?path=/docs/components-datatable--docs) — sorting, filtering, pagination, multi-line cells.
- "Add data" opens a modal form (`RecordEditor`) with required-field validation and attachment upload/delete.
- Inline cell edits follow the widget's native **Show Diff → Commit Changes** flow — the user previews the pending changes in a diff dialog before applying them, and can discard at any point.
- Click the `Id` cell to open a read-only **Row Inspector** that loads the full record via `Entities.getRecordById` (including system fields the grid hides).
- "Export CSV" downloads the current records using the freshly-fetched data.
- VDOs and InternalEntity are detected up-front and rendered with a friendly notice instead of a failing API call. SystemEntity renders in read-only mode.

### Choice set detail
- Header pulls metadata (description, last updated) from `ChoiceSets.getAll()`.
- Values table rendered from `ChoiceSets.getById()`. Read-only (the SDK doesn't expose mutation methods for choice-set values).

### Theme & polish
- Apollo Vertex design tokens (OKLCH) for light + dark mode.
- Inter (sans) + IBM Plex Mono (mono).
- Toast feedback (`sonner`), skeleton loaders, tooltips on every truncated label.

## Technologies Used

- **React 19** + **TypeScript** + **Vite**
- **@uipath/uipath-typescript** — the SDK under test
- **@uipath/ui-widgets-datatable** — UiPath's official records grid component
- **@uipath/coded-apps-dev** — Vite plugin emitting `<meta name="uipath:*">` tags during local dev
- **Tailwind CSS** + **shadcn/ui** primitives (Button, Dialog, Tooltip, Alert, Card, Badge, Skeleton, Sonner)
- **next-themes** for light/dark mode persistence
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

uip codedapp pack ./dist --name data-fabric-app --version 1.0.0
uip codedapp publish
uip codedapp deploy
```

See the [Coded Apps CLI reference](https://uipath.github.io/uipath-typescript/coded-apps/cli-reference/) for full options.

## Troubleshooting

### Common issues

1. **Authentication fails / "Invalid redirect URI"** — verify the redirect URI on the External App matches `http://localhost:5173` for dev, and your deployed URL for production.

2. **Build errors / TypeScript complaints about node modules** — ensure `npm install` completed cleanly. Some peer-dep warnings are expected (the data-table widget targets React 18 but works fine with 19).

3. **Records grid shows "Loading…" indefinitely** — usually means the SDK couldn't initialize. Check the browser console for `UiPathError` messages and verify `uipath.json` has the right `orgName` / `tenantName`.

### Getting help

- [UiPath TypeScript SDK documentation](https://uipath.github.io/uipath-typescript/)
- [UiPath Data Fabric documentation](https://docs.uipath.com/data-service/automation-cloud/latest)
- [UiPath UI Widgets Storybook](https://uipath.github.io/uipath-ui-widgets/)
