# Codex

**UiPath Sites** is the single Codex plugin entry point for creating and deploying UiPath coded apps from natural language prompts.

Install the plugin once, then start building with `@uipath-sites` or with an `@Sites` prompt that clearly asks for a UiPath coded app. Users do not need to separately install the UiPath CLI, Codex skills, or coded-app setup instructions.

!!! info "Uses Codex Sites internally"
    UiPath Sites composes with the Codex Sites plugin for app-building behavior, then applies UiPath coded-app rules so the generated app targets UiPath.

---

## Get started

1. Add [`UiPath/uipath-typescript`](https://github.com/UiPath/uipath-typescript) as a Codex plugin marketplace source.
2. Enable **UiPath Sites** from Codex plugin settings.
3. Start building with the plugin mention:

```text
@uipath-sites Build a business-user-friendly case app with an Outlook inbox-style UI for browsing, reviewing, and approving cases.
```

You can also start directly from `@Sites` when the target is a UiPath coded app:

```text
@Sites Build a UiPath coded app with an Outlook inbox-style UI for browsing, reviewing, and approving cases.
```

More example prompts:

```text
@uipath-sites Build a data table interface for Data Fabric entities with search, browse, and CRUD capabilities.
```

```text
@uipath-sites Build an Action Center task inbox for filtering work, reviewing task details, and completing assigned actions.
```

## What UiPath Sites handles

- Installs or updates the UiPath CLI through the plugin session-start hook.
- Installs the UiPath Codex skills used for coded-app generation.
- Prompts the user for required UiPath inputs through input gates before generation or deployment.
- Sets up the app as a UiPath coded app with `@uipath/uipath-typescript` and `uipath.json`.
- Guides the coding agent through local validation, package, publish, and deploy with `uip codedapp`.
- Returns the deployed coded-app URL after a successful deployment.

## Related docs

For coded-app platform and SDK details, see:

- [Coded Apps](../coded-apps/getting-started.md)
- [Coded Apps CLI Reference](../coded-apps/cli-reference.md)
- [Coded Action Apps](../coded-action-apps/getting-started.md)
- [Coded Action App SDK](../coded-action-app-sdk/getting-started.md)
