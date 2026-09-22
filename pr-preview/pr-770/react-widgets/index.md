# React Widgets

**UiPath UI Widgets** is a collection of ready-made React components that sit on top of the UiPath TypeScript SDK. Each widget is published as its own npm package, so you install only what you use.

They are designed for browser apps that talk to UiPath — [Coded Apps](../coded-apps/getting-started/), [Coded Action Apps](../coded-action-apps/getting-started/), or any React application that already holds a `UiPath` SDK instance.

Source: [github.com/UiPath/uipath-ui-widgets](https://github.com/UiPath/uipath-ui-widgets)

## Available widgets

| Widget                                                  | Package                                        | What it does                                                                                     |
| ------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [Validation Station](validation-station/)               | `@uipath/ui-widgets-validation-station`        | React wrapper for the Document Understanding Validation Station                                  |
| [Conversational Agent Chat](conversational-agent-chat/) | `@uipath/ui-widgets-conversational-agent-chat` | Streaming chat UI for UiPath Conversational Agents, with tool-call visualization                 |
| [DataTable](datatable/)                                 | `@uipath/ui-widgets-datatable`                 | Full CRUD grid over a Data Fabric entity — inline editing, master-detail, filtering, diff review |
| [Multi File Upload](multi-file-upload/)                 | `@uipath/ui-widgets-multi-file-upload`         | Drag-and-drop upload of multiple files to an Orchestrator Storage Bucket                         |
| [PDF Viewer](pdf-viewer/)                               | `@uipath/ui-widgets-pdf-viewer`                | Renders PDFs from Storage Buckets, Data Fabric attachments, URLs, or bytes                       |
| [External Auth](external-auth/)                         | `@uipath/ui-widgets-external-auth`             | Provider-agnostic sign-in buttons that start login at an external IdP                            |

## Common setup

### Requirements

- **React** 19.2.0 or higher (and `react-dom`)
- **@uipath/uipath-typescript** — the version each widget pins as a peer dependency
- **@uipath/apollo-wind** — the design system the widgets render with

### Install

Each widget is installed independently:

```
npm install @uipath/ui-widgets-datatable
```

### Pass an initialized SDK instance

Most widgets take a `sdk` prop — an initialized `UiPath` instance. Create it once and share it across widgets:

```
import { UiPath } from "@uipath/uipath-typescript/core";
import { useEffect, useState } from "react";

function App() {
  const [sdk, setSdk] = useState<UiPath | null>(null);

  useEffect(() => {
    const init = async () => {
      const uipath = new UiPath({
        baseUrl: "https://cloud.uipath.com",
        orgName: "your-org",
        tenantName: "your-tenant",
        secret: "your-secret",
      });
      await uipath.initialize();
      setSdk(uipath);
    };
    init();
  }, []);

  if (!sdk) return <div>Loading...</div>;

  return /* ... widgets ... */;
}
```

See [Authentication](../authentication/) for the available credential types, and [Coded Apps](../coded-apps/getting-started/) if the app is deployed to UiPath — there, `new UiPath()` picks up configuration automatically.

External Auth needs no SDK

[External Auth](external-auth/) is the one widget that takes no `sdk` prop — it starts a login at a third-party identity provider and never calls UiPath.

### Enable theming

Add either a `light` or a `dark` class to your `<body>` element. Without it, Apollo design tokens do not resolve and the widget renders unstyled:

```
<body class="light">
```

### Import the stylesheet

Every widget ships a stylesheet that you import once, alongside the component:

```
import { DataTable } from "@uipath/ui-widgets-datatable";
import "@uipath/ui-widgets-datatable/DataTable.css";
```

### TypeScript

All packages are written in TypeScript and ship their own type definitions — prop types are exported for use in your own component signatures:

```
import type { DataTableProps } from "@uipath/ui-widgets-datatable";
```
