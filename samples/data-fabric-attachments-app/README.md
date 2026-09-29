# Data Fabric Attachments App

A sample UiPath Coded App (React + Vite) built on **`@uipath/uipath-typescript` 1.3.2**. It shows the full round trip for a Data Fabric file attachment:

1. **Create a record**: `entities.insertRecordById()`. You can also reuse an existing record ID.
2. **Upload the attachment** to the record's File field: `entities.uploadAttachment()`
3. **Query the record back** with `entities.queryRecordsById()`, which calls `POST /datafabric_/api/EntityService/entity/{id}/query` with an `Id = <recordId>` filter.
4. **Download the attachment** from the queried record: `entities.downloadAttachment()`. Images, PDFs and text files are previewed in the page, and a **Save file** button saves the download.

## SDK usage

```typescript
import { UiPath } from '@uipath/uipath-typescript/core';
import { Entities, QueryFilterOperator } from '@uipath/uipath-typescript/entities';

const sdk = new UiPath(); // config comes from <meta name="uipath:*"> tags (uipath.json locally)
await sdk.initialize();

const entities = new Entities(sdk);

// 1. Create a record
const { Id: recordId } = await entities.insertRecordById(entityId, { Name: 'Invoice 42' });

// 2. Upload a file into its File field
await entities.uploadAttachment(entityId, recordId, 'Document', file);

// 3. Query the record back
const { items } = await entities.queryRecordsById(entityId, {
  filterGroup: {
    queryFilters: [{ fieldName: 'Id', operator: QueryFilterOperator.Equals, value: recordId }],
  },
});

// 4. Download the attachment from the queried record
const blob = await entities.downloadAttachment(entityId, items[0].Id, 'Document');
```

## Prerequisites

- Node.js 20+
- A UiPath Cloud tenant with Data Fabric enabled
- A Data Fabric entity with at least one **File** field. The app lists only entities that have one.
- An OAuth External Application (non-confidential) in Admin Center with these scopes:
  `DataFabric.Schema.Read DataFabric.Data.Read DataFabric.Data.Write`, and redirect URI `http://localhost:5173`

## Run locally

```bash
cp uipath.json.example uipath.json   # fill in clientId, orgName, tenantName
npm install
npm run dev
```

Open http://localhost:5173 and sign in. Then pick an entity, a File field and a file, and click **Upload, query & download**. If the entity has required fields, enter them in the *New record data (JSON)* box, for example `{ "Name": "Test" }`.

## Deploy as a Coded App

```bash
npm run build
```

`@uipath/coded-apps-dev` injects the runtime config at deploy time, so the same `new UiPath()` call works locally and in production.
