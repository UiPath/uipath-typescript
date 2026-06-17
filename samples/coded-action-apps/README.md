# Coded Action App Samples

A collection of UiPath **Coded Action App** samples, built with the `@uipath/coded-action-app` and `@uipath/uipath-typescript` SDKs. Every sample implements the same **Loan Application Review** action — a reviewer assesses an applicant and completes the task with an **Approve** or **Reject** decision — and each one demonstrates a different way of bringing the supporting document or data into the app.

Pick the sample that matches how your document/data is delivered, then open its folder and follow that README to set up and deploy.

## Choose a sample

| Sample | Use it when… | Demonstrates | OAuth scopes |
|--------|--------------|--------------|--------------------|
| [`action-app-with-document`](./action-app-with-document) | The document ships **with the app** as a bundled asset | Rendering a bundled PDF alongside the review form | _None_ |
| [`action-app-with-image`](./action-app-with-image) | You need to show a **bundled image** instead of a PDF | Rendering a bundled image alongside the review form | _None_ |
| [`action-app-with-file-attachment-document`](./action-app-with-file-attachment-document) | The document arrives as a **direct file attachment** on the task | Previewing and downloading a task file attachment via `Attachments` | `OR.Folders.Read` |
| [`action-app-with-storage-bucket-document`](./action-app-with-storage-bucket-document) | The document lives in an Orchestrator **Storage Bucket** | Looking up a bucket by name and fetching a file by path via `Buckets` | `OR.Buckets.Read` |
| [`action-app-with-data-fabric-entity`](./action-app-with-data-fabric-entity) | Applicant data is stored in a **Data Fabric** entity | Reading an entity record, viewing its file attachment, and writing the decision back via `Entities` | `DataFabric.Schema.Read`, `DataFabric.Data.Read`, `DataFabric.Data.Write` |

## Common prerequisites

All samples share the same baseline:

- **Node.js** 20.x or later and **npm** 8.x or later
- A **UiPath Automation Cloud** tenant
- The [uip](https://github.com/UiPath/cli#installation) CLI: `npm i -g @uipath/cli`

The three data-backed samples (file attachment, storage bucket, data fabric) additionally require a non-confidential **External Application** (OAuth client) with the scopes listed above. See the individual sample README for the exact registration steps.

## Getting started

```bash
cd <sample-folder>
npm install
```

Then follow the **Setup** section in that sample's README to build and deploy with the UiPath CLI.
