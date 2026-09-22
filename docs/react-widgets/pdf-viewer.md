# PDF Viewer

A React PDF viewer for UiPath coded apps. Renders PDFs from **Orchestrator Storage Buckets**, **Data Fabric entity attachments**, or plain **URLs / Blobs** — with a prop-toggleable toolbar, selectable text, and built-in loading and error states.

Package: `@uipath/ui-widgets-pdf-viewer`

Built on [react-pdf](https://www.npmjs.com/package/react-pdf) (Mozilla pdf.js). The pdf.js worker **ships inside the package** — no CDN, no bundler configuration — so the widget works behind enterprise CSP and firewalls, including coded apps deployed on `*.uipath.host`. The packaged worker is byte-exact to the `pdfjs-dist` version the widget pins, so the pdf.js API and the worker can never mismatch regardless of what your dependency tree hoists.

## Installation

!!! warning "Beta — not yet published to npm"
    `@uipath/ui-widgets-pdf-viewer` is at `1.0.0-beta.1` and is not yet on the public registry, so the command below does not resolve today. This page documents the current API so you can evaluate and plan against it.

```bash
npm install @uipath/ui-widgets-pdf-viewer
```

### Peer dependencies

```bash
npm install react@^19.2.0 react-dom@^19.2.0 @uipath/uipath-typescript@^1.4.1
```

## Usage

```tsx
import { PdfViewer } from "@uipath/ui-widgets-pdf-viewer";
import "@uipath/ui-widgets-pdf-viewer/PdfViewer.css";
import { UiPath } from "@uipath/uipath-typescript/core";

function App() {
  const sdk = new UiPath({
    // SDK configuration (or `new UiPath()` inside a coded app).
    // Bucket sources need `OR.Buckets`; entity sources need
    // `DataFabric.Data.Read`. URL and byte sources need no scope.
  });

  return (
    <PdfViewer
      sdk={sdk}
      source={{
        bucketId: 123,
        folderKey: "<folder-guid>", // or folderId / folderPath
        path: "invoices/inv-0714.pdf",
      }}
    />
  );
}
```

!!! note "Theming"
    Add either a `light` or `dark` class to your HTML `<body>` element to enable proper theming.

## Sources

One `source` prop, four shapes. **The widget selects the adapter from the fields you pass** — `bucketId` → storage bucket, `entityId` → Data Fabric entity, `url` → direct URL, `data` → pre-fetched bytes.

```tsx
// Orchestrator storage bucket (requires `sdk`).
// Scope the folder with EXACTLY ONE of:
//   folderId   — numeric folder ID
//   folderKey  — folder GUID (what coded apps usually have)
//   folderPath — slash-delimited path, e.g. "Shared/Finance"
<PdfViewer sdk={sdk} source={{ bucketId, folderKey, path }} />
<PdfViewer sdk={sdk} source={{ bucketId, folderId, path }} />
<PdfViewer sdk={sdk} source={{ bucketId, folderPath: "Shared/Finance", path }} />

// Data Fabric entity file field (requires `sdk`)
<PdfViewer sdk={sdk} source={{ entityId, recordId, fieldName }} />

// Plain URL — same-origin or CORS-accessible (no sdk needed)
<PdfViewer source={{ url: signedUrl }} />

// Pre-fetched bytes from your own data store (no sdk needed)
<PdfViewer source={{ data: blobOrArrayBuffer }} />
```

## Props

| Prop | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| `source` | `PdfViewerSource` | Yes | Where the PDF lives (see [Sources](#sources)) |
| `sdk` | `UiPath` | No\* | Initialized UiPath SDK instance. \*Required for `bucket` and `entity` sources |
| `toolbar` | `PdfViewerToolbarOptions` | No | Per-feature toggles: `pagination`, `zoom`, `rotate`, `download` (all default `true`); disable all four to hide the toolbar |
| `fileName` | `string` | No | Name shown in the toolbar and used for downloads |
| `maxHeight` | `number \| string` | No | Max canvas height (default `640`); the canvas scrolls internally |
| `onLoadSuccess` | `(info: { numPages: number }) => void` | No | Called when the document loads |
| `onLoadError` | `(error: Error) => void` | No | Called when fetching or rendering fails |

## Features

- Page navigation (previous / next, plus direct page entry)
- Zoom 50%–300%, fit-to-width, 90° rotation
- Download the original file
- Selectable and copyable text (pdf.js text layer) and clickable in-PDF links
- Password-protected PDFs — an in-viewer password prompt with retry on a wrong password, replacing the browser-native `window.prompt`
- Loading, error (with **Retry**) and empty states built in
- Container-sized: fills its parent and scrolls internally — designed for embedding beside other content, such as an approval form in a coded action app
- Telemetry (`Widget.PdfViewer`) for document load success/failure and downloads

## Worker configuration (advanced)

No configuration is needed: the widget points pdf.js at the worker file shipped in the package (`new URL("./pdf.worker.min.mjs", import.meta.url)`), which production bundlers emit into the app build and dev servers serve straight from `node_modules`.

If your toolchain resolves neither — for example a dev server that pre-bundles dependencies and rewrites `import.meta.url` — override it once in your app after importing the widget:

```ts
import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();
```

## Limitations (v1)

!!! warning "Non-Latin / CJK PDFs may render blank glyphs"
    pdf.js needs cMap assets to render some non-Latin scripts (for example Chinese, Japanese and Korean), which v1 does not bundle.
