# React Widgets

**UiPath UI Widgets** is a collection of ready-made React components that sit on top of the UiPath TypeScript SDK. Each widget is published as its own npm package, so you install only what you use.

They are designed for browser apps that talk to UiPath — [Coded Apps](../coded-apps/getting-started.md), [Coded Action Apps](../coded-action-apps/getting-started.md), or any React application that already holds a `UiPath` SDK instance.

Source: [github.com/UiPath/uipath-ui-widgets](https://github.com/UiPath/uipath-ui-widgets)

---

## Available widgets

| Widget | Package | What it does |
| ------ | ------- | ------------ |
| [Validation Station](validation-station.md) | `@uipath/ui-widgets-validation-station` | React wrapper for the Document Understanding Validation Station |
| [Conversational Agent Chat](conversational-agent-chat.md) | `@uipath/ui-widgets-conversational-agent-chat` | Streaming chat UI for UiPath Conversational Agents, with tool-call visualization |
| [DataTable](datatable.md) | `@uipath/ui-widgets-datatable` | Full CRUD grid over a Data Fabric entity — inline editing, master-detail, filtering, diff review |
| [Multi File Upload](multi-file-upload.md) | `@uipath/ui-widgets-multi-file-upload` | Drag-and-drop upload of multiple files to an Orchestrator Storage Bucket |
| [PDF Viewer](pdf-viewer.md) | `@uipath/ui-widgets-pdf-viewer` <br>*beta — not yet on npm* | Renders PDFs from Storage Buckets, Data Fabric attachments, URLs, or bytes |
| [External Auth](external-auth.md) | `@uipath/ui-widgets-external-auth` <br>*beta — not yet on npm* | Provider-agnostic sign-in buttons that start login at an external IdP |

---

## Common setup

### Requirements

- **React** `^19.2.0` — 19.2.0 or later in the 19.x line (and a matching `react-dom`)
- **@uipath/uipath-typescript** — a peer dependency, so you install it yourself. Each widget pins its own minimum; the per-widget pages give the exact range

The widgets render with the UiPath Apollo design system, but they depend on it directly — `@uipath/apollo-wind` installs with the widget and is nothing you add yourself.

### Install

Each widget is installed independently:

```bash
npm install @uipath/ui-widgets-datatable
```

!!! warning "PDF Viewer and External Auth are not on npm yet"
    Both are at `1.0.0-beta.1` and are not yet published to the public registry, so `npm install` for them fails today. Their pages document the current API so you can evaluate and plan against it.

### Pass an initialized SDK instance

Most widgets take an `sdk` prop — an initialized `UiPath` instance. Create it once and share it across widgets.

A browser app is a public client, so authenticate it with OAuth:

```tsx
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
        clientId: "your-client-id",
        redirectUri: "http://localhost:3000/callback",
        scope: "<scopes the widgets you use need>",
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

!!! danger "Never ship a tenant secret to the browser"
    The SDK's secret-based mode is for backend services, where the credential stays on the server. Anything handed to a browser bundle is readable by every user of the page, so a frontend app uses OAuth — the flow above — and never `secret`.

The scopes you need depend on which SDK services the widgets call — [OAuth Scopes](../oauth-scopes.md) lists them per method. In a [Coded App](../coded-apps/getting-started.md) deployed to UiPath, `new UiPath()` picks the configuration up on its own and there is nothing to pass at all. See [Authentication](../authentication.md) for the full set of credential types and when each applies.

!!! info "External Auth needs no SDK"
    [External Auth](external-auth.md) is the one widget that takes no `sdk` prop — it starts a login at a third-party identity provider and never calls UiPath.

### Enable theming

Add either a `light` or a `dark` class to your `<body>` element. Without it, Apollo design tokens do not resolve and the widget renders unstyled:

```html
<body class="light">
```

### Import the stylesheet

Most widgets ship a stylesheet that you import once, alongside the component:

```tsx
import { DataTable } from "@uipath/ui-widgets-datatable";
import "@uipath/ui-widgets-datatable/DataTable.css";
```

[Validation Station](validation-station.md) is the exception — it exports no stylesheet. Its styles arrive with the web component bundle and are adopted into the shadow root.

### One widget needs an extra step

[Validation Station](validation-station.md) additionally requires a `configureValidationStationWc()` call before render, plus the Document Understanding web component hosted as static files. Miss either and nothing renders — see [Hosting the web component](validation-station.md#hosting-the-web-component).

### TypeScript

All packages are written in TypeScript and ship their own type definitions — prop types are exported for use in your own component signatures:

```tsx
import type { DataTableProps } from "@uipath/ui-widgets-datatable";
```
