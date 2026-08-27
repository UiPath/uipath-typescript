# Release Notes — Data Fabric App (Angular)

## Entity attachment API — breaking change (DS-8835, by-name addressing)

The UiPath TypeScript SDK now lets you address a Data Fabric entity by **id or name**. As part of this, the entity **attachment** methods take an `EntityRef` as their first argument instead of a bare entity-id string.

An `EntityRef` is either:

- `{ id: "<entityId>" }`
- `{ name: "<entityName>" }`

### Affected methods

`uploadAttachment`, `downloadAttachment`, `deleteAttachment`.

### Migration

```ts
// Before
await entityService.uploadAttachment(entityId, recordId, fieldName, file);
await entityService.downloadAttachment(entityId, recordId, fieldName);
await entityService.deleteAttachment(entityId, recordId, fieldName);

// After
await entityService.uploadAttachment({ id: entityId }, recordId, fieldName, file);
await entityService.downloadAttachment({ id: entityId }, recordId, fieldName);
await entityService.deleteAttachment({ id: entityId }, recordId, fieldName);
```

This sample has been updated to the new signatures.

Record CRUD methods are **not** affected — the previous by-id methods (`insertRecordById`, `updateRecordById`, `deleteRecordsById`, `queryRecordsById`, `importRecordsById`, etc.) remain available as deprecated delegators alongside the new ref-based `insertRecord` / `updateRecord` / `deleteRecords` / `queryRecords` / `importRecords`.
