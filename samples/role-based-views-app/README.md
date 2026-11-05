# Role-Based Views

A minimal coded app showing that one build can serve different people differently. Everyone signs in to the
same app; members of the organization's built-in **Administrators** group get an organization overview, and
everyone else gets a view of their own profile and groups. It uses the UiPath TypeScript SDK platform services
(`@uipath/uipath-typescript/users`, `/groups`, `/directory`).

## The two views

| View | Who sees it | What it shows | SDK methods |
|---|---|---|---|
| Organization | Members of the Administrators group | User count, every user with status and last sign-in, every local group | `users.getAll()` (paginated), `groups.getAll()` |
| Member | Everyone else, and admins through the *Member view* tab | The signed-in user's profile and the local groups they belong to | `groups.getAll()`, `directory.getGroupMembership()` |

`groups.getAll()` returns the organization's local groups, built-in ones included. Groups synced from an
external directory are not listed, so the member view does not show membership in them.

## How the view is chosen

On sign-in, the app loads the organization's groups once with `groups.getAll()`, and `src/lib/views.ts` asks
`directory.getGroupMembership()` whether the signed-in user belongs to the built-in Administrators group. The
user's id comes from the access token (`sub` claim), so identifying them needs no API call. If the lookup
fails, the app falls back to the member view.

The view only decides what the UI renders. Every API call is authorized by the platform against the caller's
own permissions, so forcing the admin view in the browser does not let a member read data their account cannot
access.

## Run it locally

Requires [Node.js 20+](https://uipath.github.io/uipath-typescript/getting-started/#prerequisites).

1. Create an **external application** (non-confidential, user-mode) in UiPath Admin with redirect URI
   `http://localhost:5173` and scopes `PM.User.Read PM.Group PM.Directory`. The SDK requests `offline_access`
   (refresh tokens) automatically, so it does not need to be configured.
2. Copy `uipath.json.example` to `uipath.json` and fill in your `clientId`, `baseUrl`, `orgName` and
   `tenantName`.
3. Install and start:

   ```bash
   npm install
   npm run dev
   ```

4. Sign in as a member of the Administrators group, then use **Sign out** and sign in as a regular member to see
   the other view. Sign out ends the UiPath session too, so the second sign-in asks for credentials.

## Deploying as a Coded App

```bash
# One-time: install the codedapp tool plugin for the uip CLI.
uip tools install codedapp

npm run build
uip login --interactive
uip codedapp pack ./dist --name role-based-views-app --version <version>
uip codedapp publish --name role-based-views-app --version <version> --type Web
uip codedapp deploy --name role-based-views-app --folder-key <folderKey>
```

See the [Coded Apps CLI reference](https://uipath.github.io/uipath-typescript/coded-apps/cli-reference/) for
all options.
