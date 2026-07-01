# Action Center Manager — UiPath Coded Web App sample

A minimal React + TypeScript [UiPath Coded Web App](https://docs.uipath.com/)
demonstrating the `@uipath/uipath-typescript` SDK's **Tasks (Action Center)**
service. It's an operational dashboard for triaging human tasks: list and
filter them across your folders, view detail, assign / reassign / unassign,
complete (approve / reject), and create external tasks. **Document Validation
tasks** open the
[`@uipath/ui-widgets-validation-station`](https://github.com/UiPath/uipath-ui-widgets/pkgs/npm/ui-widgets-validation-station)
widget so a reviewer can validate the extracted document data inline.

Built on UiPath's [Apollo Vertex](https://apollo-vertex.vercel.app/) design
system via [`@uipath/apollo-wind`](https://www.npmjs.com/package/@uipath/apollo-wind).

## What it demonstrates

Every method on [`TaskServiceModel`](https://uipath.github.io/uipath-typescript/api/interfaces/TaskServiceModel/):

| SDK call | Where |
|----------|-------|
| `Tasks.getAll({ folderId, pageSize, jumpToPage, filter, orderby, asTaskAdmin })` | `hooks/useTasks.ts` (`useTasks`) — paginated, filterable list |
| `Tasks.getById(id, {}, folderId)` | `hooks/useTasks.ts` (`useTask`) — full detail |
| `Tasks.getUsers(folderId)` | `hooks/useTasks.ts` (`useTaskUsers`) — assignee picker (cursor-looped) |
| `Tasks.create({ title, priority }, folderId)` | `components/TaskList.tsx` (create form) |
| `task.assign` / `task.reassign` / `task.unassign` | `components/TaskDetail.tsx` |
| `task.complete(options)` | `components/TaskDetail.tsx` (+ `taskUtils.ts` builds the discriminated-union options) |
| `Tasks.getById(id, { taskType: TaskType.DocumentValidation }, folderId)` + `task.complete({ type: TaskType.DocumentValidation, … })` | `components/DocumentValidationDialog.tsx` — loads the validation payload and submits it |

By default the app lists tasks across **all folders** you can view/edit. The
toolbar's **Folder** dropdown (populated from `/odata/Folders`) lets you scope
the list to one folder; the choice is persisted to `localStorage`. Per-task
actions (assign, complete) use each task's own folder, propagated from the
row; creating a task picks the target folder from the same dropdown.

## Files

```
src/
  main.tsx            App.tsx            index.css
  taskUtils.ts        — badges, filter builder, complete-options builder, formatting
  hooks/useAuth.tsx   — OAuth/PKCE via the SDK (Coded Apps template)
  hooks/useTasks.ts   — useTasks + useTask + useTaskUsers
  components/Theme.tsx, TaskList.tsx, TaskDetail.tsx
  components/DocumentValidationDialog.tsx — validation-station host for Document Validation tasks
```

## Prerequisites

- Node.js 20+
- A UiPath OAuth External Application (client ID) with **`OR.Tasks`**,
  **`OR.Folders.Read`**, and **`OR.Buckets`** scopes. `OR.Folders.Read` powers
  the folder dropdown (the SDK doesn't expose a Folders service yet, so the app
  calls `/odata/Folders` directly with the SDK's access token); `OR.Buckets`
  lets the validation-station widget fetch the document binary referenced by a
  Document Validation task.
- An Orchestrator folder that contains Action Center tasks (only needed for
  testing — leaving the filter on "All folders" still works)

## Setup

```bash
npm install
cp uipath.json.example uipath.json   # then fill in your values
npm run dev                          # http://localhost:5173
```

`uipath.json` (git-ignored) configures local dev — the `@uipath/coded-apps-dev`
Vite plugin reads it and injects the `<meta name="uipath:*">` tags the SDK
needs. A deployed Coded App gets these from the platform, so the same code works
in both places.

## Build & deploy

```bash
npm run build      # tsc && vite build → dist/

uip codedapp pack dist -n action-center-app --version 1.0.0
uip codedapp publish
uip codedapp deploy -n action-center-app --folder-key <FOLDER_KEY>
```

## Notes

- **My Tasks vs Manage Tasks:** these map to `getAll`'s `asTaskAdmin` flag.
  - **My Tasks** — clicking a row opens a quick-complete dialog (Approve /
    Reject / custom action). An info icon in that dialog opens the full
    detail sheet on demand. The streamlined flow is the daily worker view.
    A **Document Validation** task instead opens the validation-station widget
    (see below).
  - **Manage Tasks** (`asTaskAdmin: true`) — clicking rows selects them
    (multi-select), and bulk **Assign** / **Unassign** appear in the
    toolbar. Surfaces `Tasks.assign(payload[])` and `Tasks.unassign(ids)`
    in their array forms. When status is filtered to *Pending*, an
    additional **Assigned to** filter (powered by `Tasks.getUsers`) lets
    an admin see who's overloaded.
- **Pagination:** the list uses server-side page navigation (`jumpToPage` +
  `totalCount`); the user picker loops the cursor. No list call assumes one
  response holds every row.
- **Creation** through the API only supports **external** tasks — form and
  app tasks are created by the system through workflows.
- **Document Validation:** selecting a task of type `DocumentValidationTask`
  (from a My Tasks row, or via **Validate document** in the detail sheet) opens
  a near-fullscreen dialog hosting `@uipath/ui-widgets-validation-station`. The
  widget renders the source document next to the extracted fields; **Save**
  validates and keeps the task open, **Submit** validates then completes it via
  `task.complete({ type: TaskType.DocumentValidation, action: 'Completed' })`.
  `vite.config.ts` copies the widget's `du-assets` (PDF renderer + translations)
  into the production bundle so document rendering works after deploy.
