# UiPath Buckets Sample App

A React + TypeScript Coded App that lists the **Orchestrator storage buckets** in one folder, browses their files, and previews file contents in the browser (images, PDFs, video/audio, JSON, and text-like formats such as CSV, XML, and logs).

## SDK usage

```typescript
import { UiPath } from '@uipath/uipath-typescript/core';
import { Buckets } from '@uipath/uipath-typescript/buckets';

const sdk = new UiPath();
await sdk.initialize();
const buckets = new Buckets(sdk);

// Buckets in a folder (walk the cursor; one call returns one page)
let page = await buckets.getAll({ folderId: <folderId>, pageSize: 100 });

// One page of files, filtered by name
const files = await buckets.getFiles({ id: <bucketId> }, {
  folderId: <folderId>, pageSize: 25, jumpToPage: 1, fileNameRegex: '.*invoice.*',
});

// File contents: get a short-lived read URL, then fetch it
const access = await buckets.getReadUri({ id: <bucketId> }, '<path>', { folderId: <folderId> });
const blob = await (await fetch(access.uri, { headers: access.headers })).blob();
```

## Setup

1. Create an external OAuth app (non-confidential) with scope `OR.Buckets.Read` and redirect URI `http://localhost:5173`.
2. `cp uipath.json.example uipath.json` and fill in `clientId`, `orgName`, `tenantName`, and `baseUrl`.
3. `cp .env.example .env` and set `VITE_UIPATH_FOLDER_ID` to the numeric folder ID.
4. `npm install && npm run dev`

Previews download the file from the bucket's storage provider in the browser, so external buckets (Azure, S3) need CORS to allow the app's origin.
