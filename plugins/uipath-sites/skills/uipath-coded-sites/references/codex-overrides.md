# Codex Override Rules for `uipath-coded-apps`

Use these rules only to adapt the upstream `uipath-coded-apps` skill to Codex. Outside these overrides, follow `uipath-coded-apps` exactly.

## Mandatory initial input gate

- The initial setup gate is mandatory for every matched UiPath Sites request, including both `@UiPath Sites` and `@Sites` with UiPath coded-app intent.
- The first assistant response after activating this flow must ask for missing setup inputs, or state which setup inputs were already provided and ask only for the missing ones.
- Collect all required setup inputs at the start of the coded-app workflow, before writing files, building, or launching the local app.
- Do not defer required setup questions until just before local verification or deployment.
- Do not write files, install dependencies, run build commands, launch a local server, package, publish, or deploy until the user answers the initial setup gate.
- Collect, at minimum:
  - app type: Coded Web App or Coded Action App
  - UiPath environment: cloud, staging, or alpha
  - app name
  - external application/client ID
  - organization name
  - tenant name
  - deployment folder key, or folder name to resolve, when publish/deploy is in scope
- If the user already supplied any of these values in the prompt, do not ask again for those values; ask only for the missing ones.
- When asking for the client ID, include the redirect URI and OAuth scope requirements from `uipath-coded-apps` in the same prompt.
- If the upstream skill says to use `AskUserQuestion` or any Claude-specific question tool, ask the user directly in normal Codex chat instead.
- If Codex exposes a structured input tool such as `request_user_input`, prefer that for the initial setup questions.
- If a structured input tool is not available in the current runtime, ask the same questions directly in normal Codex chat and wait for the user's reply before proceeding.
- Do not skip required questions for app type, environment, app name, client ID, org, tenant, folder, or any other input the upstream skill requires.

## Local run

- When the local dev server is run for verification, use `http://localhost:5173`.
- Do not prefer `127.0.0.1` for local verification, because that can cause IPv6 or redirect issues in this flow.

## Login and cloud preflight

- Always run `uip login status --output json` before any cloud command if the upstream skill requires auth.
- If login is missing or invalid, stop and complete the login flow before continuing.
- If the current CLI session is logged into a different environment, organization, or tenant than the app target the user provided, treat it as a login mismatch and re-run `uip login` against the app target before continuing.
- When re-logging for a mismatch, always use the app configuration target the user provided as input:
  - environment (`cloud`, `staging`, `alpha`)
  - organization
  - tenant
- Do not continue with a publish or deploy path while the CLI session still points at a different org, tenant, or environment than the requested app target.

## Deploy command behavior

- For normal deploys, do not add `--version` to `uip codedapp deploy`.
- Only pass `--version` if the user explicitly wants to deploy a specific published version.

## Sites and UiPath Sites behavior

- `@UiPath Sites` and matched `@Sites` prompts are user-facing invocation and product brief context only in this flow.
- Do not use Sites starters, vinext templates, Cloudflare Worker output, `.openai/hosting.json`, D1, R2, SIWC, OpenAI workspace auth headers, or Sites deployment for matched UiPath coded-app requests.
- Never fall back to normal Sites hosting for matched UiPath coded-app requests unless the user explicitly asks for dual deployment.

## Skill boundary

- For matched UiPath Sites coded-app requests, do not load or invoke any other skill unless the user explicitly asks to leave the coded-app flow.
- This includes other UiPath domain skills such as `uipath-platform`, `uipath-solution`, `uipath-rpa`, `uipath-maestro-flow`, `uipath-maestro-bpmn`, `uipath-api-workflow`, `uipath-admin`, or `uipath-tasks`.
- This also includes external or installed UI/design skills such as `interface-design`, `ui-ux-pro-max`, `frontend-design`, or similar design-system/UI-review skills.
- Use only the bundled `frontend-design-overrides.md` file for UI design guidance in this plugin flow.
- Treat UiPath product terms inside an app request as data/source targets for the generated coded app, not as reasons to switch skills.
- For Orchestrator, Storage Buckets, queues, assets, jobs, processes, Action Center, Data Fabric, Maestro, or Integration Service usage inside the app, use the installed `uipath-coded-apps` skill and its SDK references.
- Invoke another UiPath skill only when the user explicitly asks to leave the coded-app flow and create or operate on a non-coded-app artifact.
