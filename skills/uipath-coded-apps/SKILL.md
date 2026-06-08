---
name: uipath-coded-apps
description: >
  Use this skill to create, build, preview, and publish a UiPath Coded App
  end-to-end and return its live URL. Trigger when the user wants to "create a
  UiPath app", "build a coded app", "make an app on UiPath", "deploy a coded
  app", "publish my app to UiPath/Orchestrator", or starts from an existing
  project that contains a uipath.json. Handles UiPath sign-in, app generation,
  a local preview, and pack/publish/deploy without the user running any command.
metadata:
  version: "0.1.0"
---

# UiPath Coded Apps

End-to-end builder for UiPath Coded Apps. Take the user from an idea to a live,
deployed app URL — guiding them through sign-in, generating the app, showing a
preview, and deploying — all without asking them to run a single command.

The UiPath CLI is installed automatically by the plugin at session start. Do
not ask the user to install anything.

## Golden rules

- **Never expose mechanics.** Do not show or mention script paths, shell
  commands, npm, or CLI flags to the user. Speak in plain language: "Signing
  you in", "Building your app", "Publishing it now".
- **Run everything yourself.** The user types nothing into a terminal. The only
  things they do are: sign in through the browser when it opens, and say
  whether the previewed app looks good.
- **Stop at exactly two points:** (1) the browser sign-in, and (2) the single
  preview confirmation before deploying. Everything else is automatic.
- All scripts live under `${CLAUDE_PLUGIN_ROOT}/scripts/`. Run them with
  `bash "${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh" ...`.

## Step 1 — Make sure the toolset is ready

Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/resolve-uip.sh"`. If it prints a path,
the CLI is ready. If it fails, run
`bash "${CLAUDE_PLUGIN_ROOT}/scripts/bootstrap-uipath-env.sh"` once and continue.
Tell the user only "Getting things ready…" if there is any wait.

## Step 2 — Sign in (and reuse an existing session)

Run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/session-info.sh"` and read the JSON.

- **If `loggedIn` is `true`:** tell the user they're already signed in and show
  the organization, tenant, and environment in plain words. Ask whether to
  continue with that account or switch. If they continue, skip to Step 3.
- **If `loggedIn` is `false` (or they want to switch):** ask which environment
  to use — **Cloud** (default, for most users), **Staging**, or **Alpha**. Then
  run `bash "${CLAUDE_PLUGIN_ROOT}/scripts/login-uipath.sh" <cloud|staging|alpha>`.
  This opens the browser. Tell the user to complete sign-in there.
- After sign-in, run `session-info.sh` again to confirm. If it still reports not
  signed in, tell the user sign-in didn't complete and offer to retry. Do not
  proceed to deploy without a confirmed session.

This one sign-in is reused automatically for build, publish, and deploy.

## Step 3 — Understand and create the app

Ask the user, in plain language, what the app should do (purpose, the data or
actions it works with, and roughly what screens it needs). Keep it short — one
or two questions.

Pick a starter template from their intent:

- **form** — data entry / submit-a-request style apps (default when unsure)
- **dashboard** — view/monitor data, charts, lists
- **inline-automation** — apps that kick off or interact with automations

Scaffold a baseline into a new folder named after the app (kebab-case). This
creates a correct `uipath.json` and a stub `dist/`:

```
bash -c 'cd "<parent-dir>" && "$(bash "${CLAUDE_PLUGIN_ROOT}/scripts/resolve-uip.sh")" codedapp init "./<app-folder>" --template <template>'
```

Then build the real app into the project. Read
[references/coded-app-rules.md](references/coded-app-rules.md) and choose:

- **Simple static app:** write the app directly into `dist/` (self-contained
  HTML/CSS/JS, relative paths). Best when the app doesn't need live UiPath data.
- **Rich app that uses UiPath data/actions:** scaffold a Vite + React project
  (`base: './'`, builds to `dist/`) using `@uipath/uipath-typescript`, keeping
  the generated `uipath.json` at the root.

Keep `uipath.json` at the root and leave its client/org/tenant fields empty —
the deploy step fills them from the signed-in session. Optionally enrich your
codegen with first-party UiPath skills for this project (best-effort, ignore
failure):
`"$(bash "${CLAUDE_PLUGIN_ROOT}/scripts/resolve-uip.sh")" skills install --agent claude --local`.

## Step 4 — Preview, then confirm

From the project root, start a local preview:

```
bash -c 'cd "<app-folder>" && bash "${CLAUDE_PLUGIN_ROOT}/scripts/start-local-app.sh"'
```

It prints a local URL on stdout. Share that URL with the user and ask them to
open it and confirm the app looks right. **Wait for an explicit "looks good"
before deploying.** If they want changes, make them and refresh the preview.
Do not ask whether to run a preview — always run it.

When done, you may stop the preview with
`bash "${CLAUDE_PLUGIN_ROOT}/scripts/stop-local-app.sh"`.

## Step 5 — Publish and deploy, then return the URL

Ask for a friendly **app name** (suggest one from the project). The deploy
script converts it to a stable id (lowercase with hyphens), so reuse the same
name on redeploys. Use version `1.0.0` for a first deploy; bump the patch
version (`1.0.1`, …) on redeploys of the same app. From the project root:

```
bash -c 'cd "<app-folder>" && bash "${CLAUDE_PLUGIN_ROOT}/scripts/pack-publish-deploy.sh" "<App Name>" "<version>"'
```

This builds, packs, publishes, and deploys in one pass using the existing
sign-in. The script prints a final line `APP_URL=<url>`. Present that URL to the
user as the live app and offer to open it. If `APP_URL=` is empty, tell the user
the deploy succeeded but the link couldn't be auto-resolved, and point them to
their UiPath Apps area; share the raw deploy response shown on stderr if helpful.

If the app belongs in a specific Orchestrator folder, pass the folder key as the
4th argument to the deploy script.

## Failure handling

- **Setup failed** (no Node.js/npm): tell the user the environment needs
  Node.js 20+; stop.
- **Not signed in** before publish/deploy: stop and complete Step 2 first.
- **Build fails:** read the error, fix the project, rebuild. Never publish a
  broken build.
- **Preview won't start:** check `/tmp/uipath-coded-apps-dev.log`, fix, retry.
- **Pack/publish/deploy fails:** report the stage that failed in plain language
  and the underlying message; do not silently continue.
