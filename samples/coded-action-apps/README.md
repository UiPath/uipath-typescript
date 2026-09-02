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
| [`action-app-with-document-validation`](./action-app-with-document-validation) | A **Document Understanding** workflow raises a validation action | Embedding the **Validation Station** widget as the whole app — field correction, table editing, submit, save-as-draft, and report-as-exception | `OR.Buckets`, `OR.Tasks` |
| [`action-app-with-document-validation-subcomponents`](./action-app-with-document-validation-subcomponents) | You need a **custom layout** for that validation UI — rearranging, hiding, or embedding individual panels | Composing the Validation Station from its five subcomponents, linked by a shared `instanceId` | `OR.Buckets`, `OR.Tasks` |

## Common prerequisites

All samples share the same baseline:

- **Node.js** 20.x or later and **npm** 8.x or later
- A **UiPath Automation Cloud** tenant
- The [uip](https://github.com/UiPath/cli#installation) CLI: `npm i -g @uipath/cli`

The five samples that call a UiPath service (file attachment, storage bucket, data fabric, and the two document validation apps) additionally require a non-confidential **External Application** (OAuth client) with the scopes listed above. See the individual sample README for the exact registration steps.

## Getting started

```bash
cd <sample-folder>
npm install
```

Then follow the **Setup** section in that sample's README to build and deploy with the UiPath CLI.
