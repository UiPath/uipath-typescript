# UiPath Document Validation App

A sample React + TypeScript + Vite application that demonstrates building a human-in-the-loop document validation inbox on top of UiPath Action Center. It lists pending Document Validation tasks from Orchestrator, renders the document and extracted fields in UiPath's validation station web component, and lets a reviewer save or submit the task back to Action Center.

## What this sample demonstrates

- OAuth 2.0 authorization code + PKCE login against UiPath Cloud using the `@uipath/uipath-typescript` SDK
- Listing pending Document Validation tasks (`Tasks.getAll` with an OData filter)
- Loading a single task with full validation data (`Tasks.getById` with `TaskType.DocumentValidation`)
- Embedding `@uipath/ui-widgets-validation-station` to render the document, fields, and validation actions
- Saving in-progress edits and submitting the completed task

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
4. Save and copy the generated **Application ID** — this is the `VITE_UIPATH_CLIENT_ID` value below.

> Add a separate Redirect URI entry for any other environment (e.g., a staging URL). Do not use wildcards.

## Populate `.env`

Copy the template and fill in the values:

```bash
cp .env.example .env
```

| Variable | Where to find it | Example |
|----------|------------------|---------|
| `VITE_UIPATH_CLIENT_ID` | Application ID from the External Application you just created | `12345678-aaaa-bbbb-cccc-1234567890ab` |
| `VITE_UIPATH_ORG_NAME` | The organization slug in your UiPath Cloud URL (`cloud.uipath.com/<org>/<tenant>/...`) | `acme` |
| `VITE_UIPATH_TENANT_NAME` | The tenant slug, in the same URL | `DefaultTenant` |
| `VITE_UIPATH_BASE_URL` | UiPath Cloud API host. Leave as the default unless you use a regional endpoint | `https://cloud.uipath.com` |
| `VITE_UIPATH_REDIRECT_URI` | Must match the Redirect URI registered on the External Application **exactly** | `http://localhost:5173/` |
| `VITE_UIPATH_SCOPE` | Space-separated scopes — must be a subset of the scopes granted to the External Application | `OR.Tasks OR.Buckets OR.Folders` |

Never commit `.env`. The client ID is not a secret, but the file is gitignored to keep environment-specific values out of source control.

## Install, run, and build

```bash
npm install      # install dependencies
npm run dev      # start Vite dev server at http://localhost:5173
npm run build    # type-check and produce a production bundle in dist/
npm run preview  # serve the built bundle locally for verification
```

On first load the app shows a **Sign in with UiPath** button. Clicking it kicks off the OAuth redirect; after returning from UiPath Cloud the inbox shows any pending Document Validation tasks the signed-in user can access. Selecting a task loads the document into the validation station, where you can edit fields and save or submit.

## Project layout

```
src/
├── components/
│   ├── TaskList.tsx          # Left-pane list of pending tasks
│   ├── ValidationInbox.tsx   # Inbox shell: fetches tasks, owns selection
│   └── ValidationPanel.tsx   # Right-pane validation station host
├── hooks/
│   └── useAuth.tsx           # AuthProvider wrapping the UiPath SDK + OAuth flow
├── App.tsx                   # Top-level layout, sign-in / sign-out
└── main.tsx                  # Entry point
```

`vite.config.ts` includes a build-only plugin that copies `du-assets` from `@uipath/du-validation-station-wc` into the production bundle. In dev these assets are served directly from `node_modules`.

## Troubleshooting

- **Callback fails with `redirect_uri_mismatch`** — the value in `VITE_UIPATH_REDIRECT_URI` and the URL you opened in the browser must both match the External Application's Redirect URI character-for-character (scheme, host, port, path, trailing slash).
- **`insufficient_scope` when loading tasks** — the External Application is missing one of `OR.Tasks`, `OR.Buckets`, or `OR.Folders`. Update the app, then sign out and sign back in to get a new token.
- **Inbox is empty** — the signed-in user has no pending Document Validation tasks, or no access to the folder the tasks live in. Verify in Action Center first.
- **Validation station shows a blank panel in production but works in dev** — the `du-assets` copy step in `vite.config.ts` did not run. Confirm the plugin is registered and rebuild.

## Further reading

- [UiPath TypeScript SDK docs](https://uipath.github.io/uipath-typescript/)
- [OAuth scopes reference](https://uipath.github.io/uipath-typescript/oauth-scopes/)
- [Action Center Tasks](https://docs.uipath.com/action-center/)
