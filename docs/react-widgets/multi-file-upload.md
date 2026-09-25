# Multi File Upload

A React widget for uploading multiple files simultaneously to an [Orchestrator Storage Bucket](../api/interfaces/BucketServiceModel.md).

Package: `@uipath/ui-widgets-multi-file-upload`

## Features

- Upload multiple files simultaneously
- Drag and drop support
- File type validation via the `accept` attribute
- File size validation
- Error handling
- Built on the Apollo Wind `FileUpload` component

## Installation

```bash
npm install @uipath/ui-widgets-multi-file-upload
```

### Peer dependencies

```bash
npm install react@^19.2.0 react-dom@^19.2.0 @uipath/uipath-typescript@^1.4.1
```

!!! warning "The published 1.0.0 pins an older SDK"
    `@uipath/ui-widgets-multi-file-upload@1.0.0` — currently the only published version — declares an exact peer of `@uipath/uipath-typescript@1.1.1`, which the range above does not satisfy, so npm reports an unmet peer dependency. The `^1.4.1` above is what the widget is built against today and what the next release will carry.

## Usage

!!! note "Theming"
    Add either a `light` or `dark` class to your HTML `<body>` element to enable proper theming.

```tsx
import { MultiFileUpload } from "@uipath/ui-widgets-multi-file-upload";
import "@uipath/ui-widgets-multi-file-upload/MultiFileUpload.css";
import { UiPath } from "@uipath/uipath-typescript/core";

function App() {
  const sdk = new UiPath({
    // SDK configuration — uploading needs the full `OR.Buckets` scope
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

!!! tip "Finding the bucket and folder IDs"
    List the buckets you can reach with the Buckets service — the cross-folder `getAll()` response carries the bucket `id` alongside its `folderId`. See the [Bucket service reference](../api/interfaces/BucketServiceModel.md):

    ```ts
    import { Buckets } from "@uipath/uipath-typescript/buckets";

    const buckets = await new Buckets(sdk).getAll();
    ```

## Props

| Prop | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| `sdk` | `UiPath` | Yes | UiPath SDK instance |
| `bucketId` | `number` | Yes | The ID of the Orchestrator Storage Bucket to upload files to |
| `folderId` | `number` | Yes | The ID of the folder containing the Storage Bucket |
| `path` | `string` | No | Path prefix for uploaded files (e.g. `"uploads/"`) |
| `onUploadError` | `(error: Error) => void` | No | Called when an upload fails |
| `onUploadSuccess` | `(uploadedFiles: File[]) => void` | No | Called when files are successfully uploaded |
| `maxFileSizeInMb` | `number` | No | Maximum file size in megabytes |
| `accept` | `string` | No | Accepted file types (comma-separated MIME types or extensions). See the [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/accept) |

## Example with options

```tsx
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
