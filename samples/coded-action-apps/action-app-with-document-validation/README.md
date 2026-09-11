# Action App With Document Validation

A UiPath Coded Action App whose entire UI is the **Document Understanding Validation Station** widget. When a Document Understanding workflow raises a validation action, the reviewer corrects the extracted fields, edits line-item tables, and submits.

Unlike the other samples here, the review UI is supplied by UiPath rather than written by hand: the app reads the task, hands the payload to the widget, and completes the action once the widget reports it is done. There is no task list or portal chrome — Action Center routes the reviewer to a single action.

## Preview

![Document Understanding validation inside Action Center: correct extracted fields, edit line-item tables, then submit](./screenshots/preview.gif)

---

## Pre-requisites

- **Node.js** 20.x or later
- **npm** 8.x or later
- A **UiPath Automation Cloud** tenant with:
  - **Document Understanding**, and a workflow that raises validation actions (so there is a task to open)
  - A non-confidential **External Application** (OAuth client) registered with the following:
    - Scopes:
        - `OR.Buckets` (to read the document and its extraction artifacts from the storage bucket, and write the validated result back)
        - `OR.Tasks` (to read the action and complete it)
    - Redirect URI `https://<host>/<orgId>/<tenantId>/actions_`, where `<host>` is the environment you sign in to (`cloud.uipath.com`, `alpha.uipath.com`, …) and `<orgId>`/`<tenantId>` are the **GUIDs — not the org and tenant names shown in the browser address bar**. This is normally added the first time a coded action app using this external application is deployed, but confirm it is there: a missing or name-based entry fails with `invalid_request` / `Invalid redirect_uri`. To read the exact value your app sends, open it and copy `redirect_uri` from the `/identity_/connect/authorize` request in the browser's network tab.
- Install [UiPath CLI](https://github.com/UiPath/cli#installation)
  
  ```bash
  npm i -g @uipath/cli
  ```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure `uipath.json`

Copy the committed template and fill in your values:

```bash
cp uipath.json.example uipath.json
```

```json
{
  "scope": "OR.Tasks OR.Buckets",
  "clientId": "<external-application-clientId>"
}
```

- **`clientId`** — the App ID of your registered External Application in UiPath Cloud
- **`scope`** - the scopes required by the app. This must be a subset of the scopes granted to the external client above.

### 3. Deploy to UiPath Cloud

Build and deploy using the [`UiPath CLI`](https://uipath.github.io/uipath-typescript/coded-apps/getting-started/#deploy):

```bash
uip login
npm run build
uip codedapp pack dist -n <appName> --version 1.0.0
uip codedapp publish --type Action
uip codedapp deploy
```

> The Validation Station ships as a **separate web-component bundle**, loaded at runtime from `<app base>/du-vs-wc` by the `configureValidationStationWc()` call in `src/main.tsx`. `scripts/stage-du-wc.mjs` copies that bundle out of `node_modules` into `public/du-vs-wc` — it runs automatically via the `predev` and `prebuild` hooks, so `npm run dev` and `npm run build` both take care of it. Vite serves `public/` verbatim in dev and copies it to `dist/` on build, so after `npm run build` you should see `dist/du-vs-wc/` with `main.js`, `polyfills.js`, `styles.css` and `du-assets/`.

---

## Action Schema

The action schema that drives this app expects the following input (defined in `action-schema.json`):

### Inputs

| Field | Type | Required | Description |
|---|---|---|---|
| `contentValidationData` | ContentValidationData | Yes | Document Understanding payload locating the document, its taxonomy and its extraction results in the storage bucket |

`ContentValidationData` is a dedicated action-schema field type — not an `object` with the members spelled out.

### Outputs

_None._ Everything the reviewer changes travels back through the storage bucket, because the widget writes the validated result there itself.

### Outcomes

| Outcome | Triggered by |
|---|---|
| `Submit` | A successful **Submit** in the Validation Station |

### Report as exception

The widget's **Report as exception** button is hidden in this sample (`options.hideReportAsExceptionButton`). It cannot work in a Coded Action App: the widget persists nothing for that flow, and the only API that records an exception report — `OrchestratorDuModule.submitExceptionReport` — is addressed by the id of a *Document Understanding validation task*, while the action this app renders is an *app task*. The call has no task to act on and fails every time.

If you want the button anyway, `src/components/Validation.tsx` carries a commented-out handler that shows the reviewer a message and completes the action, along with a note on how to keep the action open instead.

---

## Viewing the coded action app in Action Center

1. Import the [Template With Document Validation.uis](./Template%20With%20Document%20Validation.uis) solution in **Studio Web**.

   <img width="3836" height="1977" alt="Screenshot 2026-03-10 174451" src="https://github.com/user-attachments/assets/36046521-a49c-49f6-b103-01164828d6fb" />

2. In the **Properties** panel of the Create App Task activity, update the **Apps** field to point to your deployed coded action app.

   <img width="1725" height="796" alt="Screenshot 2026-09-10 at 2 19 57 AM" src="https://github.com/user-attachments/assets/d9ad5142-2597-4655-895b-3d6de58ad367" />


3. Click **Debug** to run the process — this will create an Action Center task backed by your app.
4. Open Action Center and complete the task to verify the full flow end-to-end.

--- OR ---

Create the task using an RPA workflow in **Studio Desktop** that uses the **Create App Task** activity, pointing to your deployed coded action app and passing the required inputs.

<img width="3838" height="1875" alt="Screenshot 2026-03-10 182414" src="https://github.com/user-attachments/assets/5c72d051-bb7c-4cb4-a23a-2751ffda3e69" />

---

## Expected Results

When the app loads inside Action Center:

1. **Document review** — The Validation Station fills the action pane: the document viewer on one side, the extracted fields on the other, with its own action bar. Selecting a field highlights its bounding box in the document, and vice versa. Paging, zoom, table editing and business-rule evaluation all come from the widget.

2. **Save as draft** — Uploads the in-progress data to the storage bucket and shows a confirmation. The action stays open and reopens with the reviewer's edits intact.

3. **Submit** — The widget validates and uploads the result, then the app completes the action with the `Submit` outcome and it leaves the reviewer's queue.

4. **Report as exception** — Not offered. The button is hidden, for the reason given under [Report as exception](#report-as-exception).

5. **Theme** — The app follows the Action Center theme preference, including the high-contrast variants. There is no in-app toggle.

6. **Read-only mode** — If the task is already completed or the current user does not have edit access, the widget renders the same view non-editable and its action bar is suppressed.

