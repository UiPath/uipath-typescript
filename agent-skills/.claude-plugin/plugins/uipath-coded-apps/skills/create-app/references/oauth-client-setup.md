# OAuth Client Setup via Playwright MCP

This reference describes how to create a UiPath External Application (OAuth client) using **Playwright MCP** (`mcp__playwright__*`) browser automation.

**IMPORTANT: Only use `mcp__playwright__*` tools for all browser interactions. Do NOT use `mcp__claude-in-chrome__*` tools.**

## Prerequisites

- Playwright MCP must be available (see Step 1.5 in the main skill)
- You need: `orgName`, `environment` (cloud/staging/alpha), app name, redirect URI, and required OAuth scopes
- The user must be logged into UiPath Cloud (or be ready to log in)

## Cloud Host URLs

| Environment | Cloud Host |
|---|---|
| cloud | `https://cloud.uipath.com` |
| staging | `https://staging.uipath.com` |
| alpha | `https://alpha.uipath.com` |

## Step 1: Navigate to External Applications

```
Use mcp__playwright__browser_navigate to go to:
https://{cloud-host}/{orgName}/portal_/admin/external-apps/oauth
```

Take a snapshot to see the current state:
```
Use mcp__playwright__browser_snapshot
```

## Step 2: Handle Login (if required)

If the snapshot shows a login page instead of the External Applications list:

1. Tell the user: **"Please enter your credentials in the browser window to log in to UiPath Cloud."**
   - **NEVER ask for or type passwords** — the user must enter credentials manually

2. **Poll for login completion** — Do NOT ask the user to tell you when they're done. Automatically detect it:
   ```
   Repeatedly (every 5-10 seconds, up to ~2 minutes):
   1. Use mcp__playwright__browser_snapshot
   2. Check if the page has changed from the login form
   3. If you see the External Applications page or UiPath admin portal → login is complete
   4. If still on the login page → wait and snapshot again
   ```

3. Once login is detected, navigate to the External Applications page:
   ```
   Use mcp__playwright__browser_navigate to go to:
   https://{cloud-host}/{orgName}/portal_/admin/external-apps/oauth
   ```

## Step 3: Click "Add application"

Take a snapshot to verify you see the External Applications list, then:

```
Use mcp__playwright__browser_click on the "Add application" button
```

Take a snapshot to see the "Add application" form.

## Step 4: Fill in Application Details

The form contains:
- **Application name** — text input
- **Application type** — radio buttons: "Confidential application" and "Non-Confidential application"
- **Resources** section — for adding OAuth scopes
- **Redirect URL** — input for the redirect URI
- **Add** and **Cancel** buttons

### 4a: Set Application Name

```
Use mcp__playwright__browser_click on the Application Name input field
Use mcp__playwright__browser_type to enter the app name (e.g., "my-uipath-app")
```

### 4b: Select Non-Confidential Application

Browser apps MUST use Non-Confidential applications (public clients for PKCE flow):

```
Use mcp__playwright__browser_click on the "Non-Confidential application" radio button
```

### 4c: Add OAuth Scopes

The scopes are organized by API/resource category. For each resource category needed:

1. Click the **"Add scopes"** button:
   ```
   Use mcp__playwright__browser_click on the "Add scopes" button
   ```

2. An **"Add resource"** dialog appears with a **Resource** dropdown. Click the dropdown:
   ```
   Use mcp__playwright__browser_click on the Resource dropdown
   Use mcp__playwright__browser_snapshot to see the list
   ```

3. Select the appropriate resource category:

   | SDK Scopes Needed | Select This Resource |
   |---|---|
   | `OR.Assets`, `OR.Administration`, `OR.Execution`, `OR.Jobs`, `OR.Queues`, `OR.Tasks` (any OR.* scopes) | **UiPath.Orchestrator** |
   | `DataFabric.Schema.Read`, `DataFabric.Data.Read`, `DataFabric.Data.Write` | **Data Fabric API** |
   | `PIMS` | **PIMS** |

   ```
   Use mcp__playwright__browser_click on the resource name (e.g., "UiPath.Orchestrator")
   ```

4. After selecting a resource, a scope selection panel appears. Check the specific scopes needed:
   ```
   Use mcp__playwright__browser_click on each required scope checkbox
   Use mcp__playwright__browser_snapshot to verify selections
   ```

5. Confirm/save the resource addition.

6. Repeat steps 1-5 for each resource category that needs to be added.

### 4d: Enter Redirect URL

The Redirect URL section has an input field with placeholder "Enter URL here":

```
Use mcp__playwright__browser_click on the redirect URL input field
Use mcp__playwright__browser_type to enter the redirect URI (e.g., "http://localhost:5173")
Use mcp__playwright__browser_press_key with "Enter" to confirm the URL
```

Take a snapshot to verify:
```
Use mcp__playwright__browser_snapshot
```

## Step 5: Save and Extract Client ID

1. Before clicking Add, take a final snapshot and confirm with the user:
   > **About to create an External Application with these settings:**
   > - Name: `<app name>`
   > - Type: Non-Confidential
   > - Scopes: `<list of scopes>`
   > - Redirect URL: `<redirect URI>`
   >
   > **Proceed?**

2. Wait for user confirmation, then click the **"Add"** button:
   ```
   Use mcp__playwright__browser_click on the "Add" button
   ```

3. Take a snapshot to verify the application was created:
   ```
   Use mcp__playwright__browser_snapshot
   ```

4. **Extract the Application ID (client ID)** — after creation, the app detail page or the list will show the generated Application ID (a UUID like `00aee0f6-37c7-4985-8d73-04d3cc36c409`). This is the client ID needed for the `.env` file.

5. If you can't find the client ID on the page, navigate to the app's edit page:
   ```
   Use mcp__playwright__browser_navigate to go to:
   https://{cloud-host}/{orgName}/portal_/admin/external-apps/oauth
   ```
   Find the newly created app in the list and click it to see its App ID.

## Step 6: Handling UI Navigation Issues

If you encounter unexpected UI states:

1. **Take a snapshot** and describe what you see to the user
2. **Ask for guidance**: "I see [description]. Can you help me navigate?"
3. **Try alternative navigation**:
   - External apps list: `{cloud-host}/{orgName}/portal_/admin/external-apps`
   - Admin page: `{cloud-host}/{orgName}/portal_/admin`
4. **Fall back to manual** if automated navigation fails after 2-3 attempts — provide the user with clear manual instructions:
   > **I wasn't able to automate the External Application creation. Please create it manually:**
   > 1. Go to `https://{cloud-host}/{orgName}/portal_/admin/external-apps/oauth`
   > 2. Click "Add application"
   > 3. Set name to `<app name>`, select "Non-Confidential application"
   > 4. Add scopes: `<list of scopes>`
   > 5. Set Redirect URL to `<redirect URI>`
   > 6. Click "Add" and copy the generated Application ID (client ID)
   > 7. Paste the client ID here
