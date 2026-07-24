# AI App Builders

You can build a UiPath coded web app in a third-party AI app builder and deploy it to UiPath using `@uipath/uipath-typescript` and the `uip` CLI.

!!! warning "Cloud only"
    Coded apps are **UiPath Automation Cloud** only. The deployed app is served at `https://<org>.uipath.host/<app>`.

---

## How integration works

Every builder follows the same model — only the builder-specific UI differs:

- You build the app in the builder using the **UiPath coded-apps skill**, so the generated app uses `@uipath/uipath-typescript` and the correct coded-app structure (static SPA, `uipath.json`, `getAppBase()` router base).
- The app uses a **public (non-confidential) OAuth client** for end-user sign-in (PKCE), baked into the build — it is safe to expose in the browser.
- You deploy with the `uip` CLI (**build → pack → publish → deploy**), authenticated by a **confidential OAuth app**.
- The confidential **client secret** lives in the builder's own secret store or terminal session — never in chat, never in committed code.
- The result is served at `https://<org>.uipath.host/<app>`.

---

## The two OAuth apps

Two external OAuth apps are always involved. Create both in UiPath Admin → **External Applications**.

- **Public (non-confidential) — for sign-in.** A `clientId` plus scopes, used for end-user **sign-in** inside the app via PKCE. It is baked into the build and safe to expose in the browser.
- **Confidential — for deploy.** A `clientId` plus `clientSecret`, used **only** at deploy time by `uip login`. Give it scopes `Apps`, `OR.Folders.Read`, `OR.Execution`, and **assign it to the Orchestrator folder** you deploy to (Admin → External Applications, and Folder → Manage Access → Assign external app).

!!! tip "Deploy credentials: confidential app or PAT"
    Deploy authenticates via `uip login` with the **confidential app**'s client id + secret (shown below). A **personal access token (PAT)** with the required scopes is also accepted — the platform exchanges the reference token server-side — so a PAT can be used as a simpler alternative to a confidential app. Whichever identity you use must be **assigned to the target Orchestrator folder**.

See [Coded Apps → Getting Started](../coded-apps/getting-started.md) for the full external-app and `uipath.json` setup.

---

## Choose your builder

| Builder | Load the skill | Deploy secret | Deploy runs in |
|---------|----------------|---------------|----------------|
| [Vercel (v0)](vercel.md) | Skill marketplace | Encrypted env vars | Built-in terminal |
| [Replit](replit.md) | Prompt link, npm, or zip import | Built-in Secrets (shell-readable) | Built-in shell |
| [Bolt](bolt.md) | Prompt link or npm | Terminal (`read -s`) or DB | Built-in terminal |
| [Lovable](lovable.md) | Prompt link or zip import | Lovable Cloud Secrets (sandbox-readable) | Build sandbox |

---

## The deploy flow

The CLI flow is identical across builders:

```bash
uip login --client-id <UIPATH_CLIENT_ID> --client-secret <UIPATH_CLIENT_SECRET> \
  --organization <org> --tenant <tenant> \
  --scope "Apps OR.Folders.Read OR.Execution"
npm run build
uip codedapp pack dist -n <app-name> --version 1.0.0
uip codedapp publish
uip codedapp deploy --folder-key <folder-key>
```

Your app is live at:

```text
https://<org>.uipath.host/<app-name>
```

---

## Related docs

- [Coded Apps → Getting Started](../coded-apps/getting-started.md)
- [Coded Apps → CLI Reference](../coded-apps/cli-reference.md)
- [CI/CD: GitHub Actions](../coded-apps/ci-cd-github-actions.md)
- [Authentication](../authentication.md)
