# UiPath Coded Apps

Create, preview, publish, and deploy a **UiPath Coded App** end-to-end — from an
idea to a live app URL — without typing a single command. Built for business
users.

Just invoke the plugin and say what you want to build. It guides you through a
quick UiPath sign-in, generates the app, shows you a live preview, and (once you
approve) publishes and deploys it — then hands back the app URL.

## What it does

1. **Sets up automatically.** A private, pinned UiPath CLI is installed the
   first time a session starts after you enable the plugin — before you do
   anything. No first-use wait, no install command.
2. **Signs you in.** Opens the UiPath browser sign-in for Cloud, Staging, or
   Alpha. If you're already signed in, it reuses that session. The same sign-in
   is reused for publishing and deploying.
3. **Builds your app.** Scaffolds a Coded App starter (form, dashboard, or
   inline-automation) and tailors it to your request.
4. **Previews it.** Runs the app locally and gives you a URL to eyeball before
   anything is published.
5. **Publishes & deploys.** On your OK, it builds, packs, publishes, and deploys
   to UiPath, then returns the **live app URL**.

## Components

| Component | Purpose |
|-----------|---------|
| Skill `uipath-coded-apps` | Orchestrates sign-in → create → preview → deploy |
| `SessionStart` hook | Installs the pinned UiPath CLI once, automatically |
| Scripts | Bootstrap, sign-in, session check, local preview, pack/publish/deploy |

## Requirements

- **Node.js 20+** on the machine (the only prerequisite). The plugin installs
  everything else itself.
- A UiPath account with permission to publish Coded Apps.

## How to use

Enable the plugin, then say something like:

- "Create a UiPath app to submit expense requests."
- "Build a dashboard coded app for my queue items and deploy it."
- "Make an app on UiPath and give me the link."

The plugin takes it from there. You only ever (1) sign in through the browser
and (2) confirm the preview looks good.

## Notes

- The bundled UiPath CLI is pinned to a known-good version (`@uipath/cli@1.1.1`)
  and lives privately under `~/.uipath-coded-apps/runtime/` — it does not touch
  any system-wide `uip` install.
- The CLI is always installed from the public npm registry, so a scoped
  `.npmrc` (e.g. one pointing `@uipath` at a private registry) won't break setup.
