# UiPath Document Validation App

A sample React + TypeScript + Vite application that demonstrates building a human-in-the-loop document validation inbox on top of UiPath Action Center. It lists Document Validation tasks from Orchestrator, grouped into **Pending**, **Unassigned**, and **Completed** tabs, renders the document and extracted fields in UiPath's validation station web component, and lets a reviewer save, submit, or report an exception on a task back to Action Center.

## Preview

![Reviewing a document validation task: task list, extracted fields, and the document text view](./screenshots/preview.gif)

## What this sample demonstrates

- OAuth 2.0 authorization code + PKCE login against UiPath Cloud using the `@uipath/uipath-typescript` SDK
- Listing Document Validation tasks by status (`Tasks.getAll` with an OData filter) across Pending / Unassigned / Completed tabs
- Loading a single task with full validation data (`Tasks.getById` with `TaskType.DocumentValidation`)
- Embedding `@uipath/ui-widgets-validation-station` to render the document, fields, and validation actions
- Saving in-progress edits (save as draft) and submitting the completed task (`Task.complete`)
- Reporting a document as an exception via `OrchestratorDuModule.submitExceptionReport`
- Opening Unassigned and Completed tasks in read-only mode

## Prerequisites

- Node.js 20+ and npm
- A UiPath Cloud organization and tenant with Action Center enabled
- At least one pending Document Validation task in the tenant (produced by a Document Understanding process)
- An OAuth External Application registered in the UiPath Admin Center (see below)

## Configure the OAuth External Application

1. In UiPath Cloud: **Admin → External Applications → Add Application**.
2. Choose **Non Confidential Application** (this is a browser SPA — no client secret is used or stored).
3. Set:
   - **Name**: e.g., `Document Validation Sample`
   - **Redirect URI**: the exact URL the app runs on, including scheme, host, port, and path. For local development this is `http://localhost:5173/`. The redirect URI is matched **exactly** by UiPath — a trailing-slash or port mismatch will fail the callback.
   - **Scopes** (least-privilege set used by this sample):
     - `OR.Tasks` — list and complete validation tasks
     - `OR.Buckets` — fetch the document binary referenced by the task
     - `OR.Folders` — resolve the folder the task belongs to
4. Save and copy the generated **Application ID** — this is the `clientId` value below.

> Add a separate Redirect URI entry for any other environment (e.g., a staging URL). Do not use wildcards.

## Configure `uipath.json`

Copy the template and fill in the values:

```bash
cp uipath.example.json uipath.json
```

| Field | Where to find it | Example |
|-------|------------------|---------|
| `clientId` | Application ID from the External Application you just created | `12345678-aaaa-bbbb-cccc-1234567890ab` |
| `orgName` | The organization slug in your UiPath Cloud URL (`cloud.uipath.com/<org>/<tenant>/...`) | `acme` |
| `tenantName` | The tenant slug, in the same URL | `DefaultTenant` |
| `baseUrl` | UiPath Cloud API host. Leave as the default unless you use a regional endpoint | `https://api.uipath.com` |
| `redirectUri` | Must match the Redirect URI registered on the External Application **exactly** | `http://localhost:5173/` |
| `scope` | Space-separated scopes — must be a subset of the scopes granted to the External Application | `OR.Tasks OR.Buckets OR.Folders` |

Never commit `uipath.json`. The client ID is not a secret, but the file is gitignored to keep environment-specific values out of source control. The `@uipath/coded-apps-dev` Vite plugin reads `uipath.json` and injects the values as `<meta>` tags during local dev; in production, the UiPath platform injects them at deploy time.

## Install, run, and build

```bash
npm install      # install dependencies
npm run dev      # start Vite dev server at http://localhost:5173
npm run build    # type-check and produce a production bundle in dist/
npm run preview  # serve the built bundle locally for verification
```

On first load the app shows a **Sign in with UiPath** button. Clicking it kicks off the OAuth redirect; after returning from UiPath Cloud the inbox shows Document Validation tasks the signed-in user can access, split across the **Pending**, **Unassigned**, and **Completed** tabs. Selecting a Pending task loads the document into the validation station, where you can edit fields and **Save**, **Submit**, or **Report exception**. Tasks in the Unassigned and Completed tabs open read-only.

## Project layout

```
src/
├── components/
│   ├── TaskList.tsx          # Left-pane task list for the active tab
│   ├── ValidationInbox.tsx   # Inbox shell: tabs, fetches tasks, owns selection
│   └── ValidationPanel.tsx   # Right-pane validation station host + task actions
├── hooks/
│   └── useAuth.tsx           # AuthProvider wrapping the UiPath SDK + OAuth flow
├── App.tsx                   # Top-level layout, sign-in / sign-out
└── main.tsx                  # Entry point
```

### Validation station runtime assets

The validation station ships as a **separate web-component bundle** — `main.js`, `polyfills.js`, their chunks, `styles.css`, `fonts.css` and the PDF and font assets — that is loaded at runtime rather than imported.

- **Staging** — `scripts/stage-du-wc.mjs` copies that bundle out of `node_modules/@uipath/du-validation-station-wc` into `public/du-vs-wc`. It runs automatically via the `predev` and `prebuild` hooks, so `npm run dev` and `npm run build` both take care of it. Vite serves `public/` verbatim in dev and copies it to `dist/` on build, which keeps these prebuilt Angular bundles out of Vite's module graph.
- **Loading** — `src/main.tsx` calls `configureValidationStationWc({ includeFonts: true })`, which loads the component from `<app base>/du-vs-wc` and registers its custom elements. Without this call the elements are never defined and the widgets render nothing. `includeFonts` pulls in `fonts.css`, which carries the Apollo and Material Icons faces — omit it and the icons render blank.

After `npm run build`, `dist/du-vs-wc/` should contain `main.js`, `polyfills.js`, `styles.css` and `du-assets/`.

## Troubleshooting

- **Callback fails with `redirect_uri_mismatch`** — the `redirectUri` in `uipath.json` and the URL you opened in the browser must both match the External Application's Redirect URI character-for-character (scheme, host, port, path, trailing slash).
- **`insufficient_scope` when loading tasks** — the External Application is missing one of `OR.Tasks`, `OR.Buckets`, or `OR.Folders`. Update the app, then sign out and sign back in to get a new token.
- **A tab is empty** — the signed-in user has no tasks in that status (Pending / Unassigned / Completed), or no access to the folder the tasks live in. Verify in Action Center first.
- **Validation station renders nothing** — the web component bundle did not load. Check the console for a `configureValidationStationWc` error and the network tab for 404s under `/du-vs-wc/`; `npm run stage-du-wc` re-stages it.
- **Icons render as empty boxes** — `fonts.css` is missing or `includeFonts` is not set on the `configureValidationStationWc()` call in `src/main.tsx`.

## Further reading

- [UiPath TypeScript SDK docs](https://uipath.github.io/uipath-typescript/)
- [OAuth scopes reference](https://uipath.github.io/uipath-typescript/oauth-scopes/)
- [Action Center Tasks](https://docs.uipath.com/action-center/)
