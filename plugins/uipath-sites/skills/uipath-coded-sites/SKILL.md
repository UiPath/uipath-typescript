---
name: uipath-coded-sites
description: Use when a Sites or UiPath Sites request should produce a UiPath coded app for Orchestrator, Storage Buckets, queues, assets, jobs, processes, Maestro, Action Center, Data Fabric, Integration Service, uipath-typescript, uipath.json, or uip codedapp deployment. This flow owns UI guidance through its bundled frontend-design-overrides; do not combine with interface-design, ui-ux-pro-max, frontend-design, Sites hosting, or other UiPath domain skills unless the user explicitly asks to leave the coded-app flow.
---

# UiPath Coded Sites

Use this skill when the user wants a UiPath coded app through either entry point:

- `@UiPath Sites`
- `@Sites` with UiPath or coded-app intent

This skill is the router/orchestrator only. Keep the detailed behavior in the reference files and the installed `uipath-coded-apps` skill.

When this skill matches, use it as the only app-generation routing skill. Do not pair it with external design skills such as `interface-design`, `ui-ux-pro-max`, or `frontend-design`; load this skill's [references/frontend-design-overrides.md](references/frontend-design-overrides.md) instead.

## Ownership Matrix

- This `uipath-coded-sites` skill owns routing, reference orchestration, and skill boundaries only.
- [references/codex-overrides.md](references/codex-overrides.md) owns Codex behavior: mandatory initial input collection, Claude-specific question-tool translation, localhost usage, login mismatch handling, deploy command override, and skill boundary reinforcement.
- [references/uipath-typescript.md](references/uipath-typescript.md) owns Sites-to-coded-app compatibility: static Vite/React shape, relative assets, `base: './'`, `getAppBase()`, and no Sites hosting output.
- The installed `uipath-coded-apps` skill owns all coded-app functional behavior: app type, project structure, SDK usage, auth/config, OAuth scopes, service-specific references, runtime data handling, functional UI correctness, local validation, build, pack, publish, and deploy.
- [references/frontend-design-overrides.md](references/frontend-design-overrides.md) owns visual presentation only: professional app shell, typography, palette, spacing, hierarchy, interaction polish, responsive styling, and accessibility styling.

## Required Reference Order

For every matched request, load and apply these sources in order before generating files or running commands:

1. [references/codex-overrides.md](references/codex-overrides.md) for Codex behavior, mandatory initial input collection, local-run rules, login mismatch handling, deploy command behavior, and skill boundaries.
2. The installed `uipath-coded-apps` skill and all relevant `uipath-coded-apps/references/*` files for app type, service APIs, functional UI behavior, SDK patterns, local validation, and deploy flow.
3. [references/uipath-typescript.md](references/uipath-typescript.md) for Sites-to-UiPath-coded-app compatibility rules.
4. [references/frontend-design-overrides.md](references/frontend-design-overrides.md) for visual presentation guidance only.

For any functional UI concern, use the relevant `uipath-coded-apps` reference instead of inventing behavior inside this plugin. Examples include tables, pagination, text overflow, polling, master-detail, SDK-backed data rendering, validation, action handling, and loading/error behavior; this list is not exhaustive.

If these sources conflict, use this ownership rule:

- `uipath-coded-apps` wins for coded-app technical and functional behavior.
- `codex-overrides.md` wins for Codex-specific interaction and command adaptation.
- `uipath-typescript.md` wins for Sites-to-coded-app compatibility.
- `frontend-design-overrides.md` may style the UI, but must not replace functional patterns from `uipath-coded-apps`.

## Routing Rules

Apply this skill when any of these are true:

- the user invokes `@UiPath Sites`
- the user says `@Sites` and mentions `UiPath`
- the user says `@Sites` and mentions `coded app`
- the user says `@Sites` and mentions `Orchestrator`
- the user asks for a UiPath app over platform resources, including Storage Buckets, queues, assets, jobs, processes, robots, folders, libraries, triggers, Action Center tasks, Data Fabric, Integration Service, Maestro, or Apps/Coded Apps
- the user asks to browse, manage, display, upload, download, preview, search, filter, or operate on UiPath data or resources in an app UI
- the user mentions `uip codedapp`
- the user mentions `@uipath/uipath-typescript` or `uipath-typescript`
- the project already contains `uipath.json`

Do not use this skill for generic Sites requests like landing pages or normal Cloudflare-hosted internal tools unless the user explicitly wants UiPath coded-app output.

## Flow Boundary

For matched requests:

- Treat UiPath Sites as a coded-app flow, not normal Sites hosting.
- Use the reference files listed above; do not duplicate or reinterpret their rules.
- Do not use Sites starters, templates, Worker build output, storage, authentication, hosting, versioning, or deployment.
- Do not use `sites-hosting`.
- Do not invoke other UiPath domain skills unless the user explicitly asks to leave the coded-app flow.
- Do not invoke external or installed UI/design skills such as `interface-design`, `ui-ux-pro-max`, `frontend-design`, or similar skills.
- Treat UiPath product terms inside an app request as app data/source targets, not reasons to switch skills.

## First-Run Bootstrap

This plugin expects its `SessionStart` hook to ensure `@uipath/cli` is installed globally and to install UiPath Codex skills with:

```bash
uip skills install --agent codex
```

Do not treat skill installation as part of the coded-app workflow once the session has started; rely on the hook to prepare it up front.
