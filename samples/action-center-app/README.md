# Action Center Manager — UiPath Coded Web App sample

A minimal React + TypeScript [UiPath Coded Web App](https://docs.uipath.com/)
demonstrating the `@uipath/uipath-typescript` SDK's **Tasks (Action Center)**
service. It's an operational dashboard for triaging human tasks in a folder:
list and filter them, view detail, assign / reassign / unassign, complete
(approve / reject), and create external tasks.

Built with plain Tailwind (no component library) to keep the file count small.

## What it demonstrates

Every method on [`TaskServiceModel`](https://uipath.github.io/uipath-typescript/api/interfaces/TaskServiceModel/):

| SDK call | Where |
|----------|-------|
| `Tasks.getAll({ folderId, pageSize, jumpToPage, filter, orderby })` | `hooks/useTasks.ts` (`useTasks`) — paginated, filterable list |
| `Tasks.getById(id, {}, folderId)` | `hooks/useTasks.ts` (`useTask`) — full detail |
| `Tasks.getUsers(folderId)` | `hooks/useTasks.ts` (`useTaskUsers`) — assignee picker (cursor-looped) |
| `Tasks.create({ title, priority }, folderId)` | `components/TaskList.tsx` (create form) |
| `task.assign` / `task.reassign` / `task.unassign` | `components/TaskDetail.tsx` |
| `task.complete(options)` | `components/TaskDetail.tsx` (+ `taskUtils.ts` builds the discriminated-union options) |

By default the app lists tasks across **all folders** you can view/edit. The
header's **Folder ID** field is an optional filter — leave it blank for all
folders, or set it to scope the list (persisted to `localStorage`). Per-task
actions (detail, assign, complete) use each task's own folder; creating a task
asks for a target folder.

## Files

```
src/
  main.tsx            App.tsx            index.css
  taskUtils.ts        — badges, filter builder, complete-options builder, formatting
  hooks/useAuth.tsx   — OAuth/PKCE via the SDK (Coded Apps template)
  hooks/useTasks.ts   — useTasks + useTask + useTaskUsers
  components/Modal.tsx, TaskList.tsx, TaskDetail.tsx
```

## Prerequisites

- Node.js 20+
- A UiPath OAuth External Application (client ID) with the **`OR.Tasks`** scope
- An Orchestrator folder ID that contains Action Center tasks

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

- **My Tasks / Manage Tasks tabs:** these map to `getAll`'s `asTaskAdmin` flag,
  mirroring Action Center. "Manage Tasks" (`asTaskAdmin: true`) lists tasks
  across folders where you can assign them — the context where assigning to a
  **group** applies. (The SDK doesn't expose a strict "assigned only to me"
  view or a task `delete`, so those parts of the product aren't replicated.)
- **Pagination:** the list uses server-side page navigation (`jumpToPage` +
  `totalCount`); the user picker loops the cursor. No list call assumes one
  response holds every row.
- **Creation** through the API only supports **external** tasks — form and app
  tasks are created by the system through workflows.
