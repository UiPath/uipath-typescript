# Asset getByName Demo

Minimal React + Vite app that demonstrates `assets.getByName()` from the UiPath TypeScript SDK.

After OAuth login, the app:

1. Lists all assets visible to the user across folders (via `assets.getAll()`).
2. Lets the user click a row to prefill the form below.
3. Resolves a single asset by **name + folderPath** via `assets.getByName()` and renders the raw JSON response.

## Setup

1. Register a **Non-Confidential External Application** in UiPath Admin with scopes `OR.Assets OR.Folders offline_access` and redirect URI `http://localhost:5173`.
2. Copy `.env.example` to `.env.local` and fill in your Client ID / org / tenant.
3. Install and run:

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## What this demonstrates

```typescript
import { Assets } from '@uipath/uipath-typescript/assets';

const assets = new Assets(sdk);

// Folder path is sent as X-UIPATH-FolderPath header; server resolves the folder.
const asset = await assets.getByName('ApiKey', { folderPath: 'Shared/Finance' });
```
