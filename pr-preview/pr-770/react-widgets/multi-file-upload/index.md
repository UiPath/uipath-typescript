# Multi File Upload

A React widget for uploading multiple files simultaneously to an [Orchestrator Storage Bucket](../../api/interfaces/BucketServiceModel/).

Package: `@uipath/ui-widgets-multi-file-upload`

## Features

- Upload multiple files simultaneously
- Drag and drop support
- File type validation via the `accept` attribute
- File size validation
- Error handling
- Built on the Apollo Wind `FileUpload` component

## Installation

```
npm install @uipath/ui-widgets-multi-file-upload
```

### Requirements

- React 19.2.0+ and React DOM 19.2.0+
- `@uipath/uipath-typescript` ^1.3.10
- `@uipath/apollo-wind`

## Usage

Theming

Add either a `light` or `dark` class to your HTML `<body>` element to enable proper theming.

```
import { MultiFileUpload } from "@uipath/ui-widgets-multi-file-upload";
import "@uipath/ui-widgets-multi-file-upload/MultiFileUpload.css";
import { UiPath } from "@uipath/uipath-typescript/core";

function App() {
  const sdk = new UiPath({
    // SDK configuration
  });

  const handleUploadError = (error: Error) => {
    console.error("Upload failed:", error);
  };

  const handleUploadSuccess = (uploadedFiles: File[]) => {
    console.log(
      "Successfully uploaded:",
      uploadedFiles.map((f) => f.name),
    );
  };

  return (
    <MultiFileUpload
      sdk={sdk}
      bucketId={123}
      folderId={456}
      path="uploads/"
      onUploadError={handleUploadError}
      onUploadSuccess={handleUploadSuccess}
      maxFileSizeInMb={10}
      accept=".pdf,.jpg,.png"
    />
  );
}
```

Finding the bucket and folder IDs

List the buckets you can reach with `sdk.buckets.getAll()` — the response carries both the bucket `id` and its `folderId`. See the [Bucket service reference](../../api/interfaces/BucketServiceModel/).

## Props

| Prop              | Type                              | Required | Description                                                                                                                                                                |
| ----------------- | --------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk`             | `UiPath`                          | Yes      | UiPath SDK instance                                                                                                                                                        |
| `bucketId`        | `number`                          | Yes      | The ID of the Orchestrator Storage Bucket to upload files to                                                                                                               |
| `folderId`        | `number`                          | Yes      | The ID of the folder containing the Storage Bucket                                                                                                                         |
| `path`            | `string`                          | No       | Path prefix for uploaded files (e.g. `"uploads/"`)                                                                                                                         |
| `onUploadError`   | `(error: Error) => void`          | No       | Called when an upload fails                                                                                                                                                |
| `onUploadSuccess` | `(uploadedFiles: File[]) => void` | No       | Called when files are successfully uploaded                                                                                                                                |
| `maxFileSizeInMb` | `number`                          | No       | Maximum file size in megabytes                                                                                                                                             |
| `accept`          | `string`                          | No       | Accepted file types (comma-separated MIME types or extensions). See the [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/accept) |

## Example with options

```
<MultiFileUpload
  sdk={sdk}
  bucketId={123}
  folderId={456}
  path="documents/"
  onUploadError={(error) => console.error("Upload failed:", error)}
  onUploadSuccess={(files) => console.log("Uploaded:", files.length, "files")}
  maxFileSizeInMb={5}
  accept=".pdf,.docx,.xlsx"
/>
```
