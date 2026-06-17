# Action App With Data Fabric Entity

A UiPath Coded Action App template for **Loan Application Review** backed by a **Data Fabric** entity. Reviewers can fetch an applicant's record by name, assess the applicant's details, view the bundled Loan Document attachment, and complete the task with an Approve or Reject decision — writing the risk factor, reviewer comments, and approval back to the Data Fabric entity.

This template demonstrates how to read from and write to a Data Fabric entity and how to view entity file attachments in coded action apps.

---

## Pre-requisites

- **Node.js** 20.x or later
- **npm** 8.x or later
- A **UiPath Automation Cloud** tenant with:
  - A non-confidential **External Application** (OAuth client) registered with the following:
    - Scopes:
        - `DataFabric.Schema.Read` (to read the entity schema)
        - `DataFabric.Data.Read` (to read entity records)
        - `DataFabric.Data.Write` (to update entity records)
    - Redirect URI `https://cloud.uipath.com/<orgId>/<tenantId>/actions_` (It is added automatically the first time any coded action app using this external application is deployed)
- Install [UiPath CLI](https://github.com/UiPath/cli#installation)
  
  ```bash
  npm i -g @uipath/cli
  ```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the Data Fabric entity

This template expects a Data Fabric entity with the fields described in [`df-entity-schema.json`](./df-entity-schema.json). Create the entity in **Data Fabric** (or import the schema) before deploying the app. The entity exposes the following fields:

| Field | Type | Description |
|---|---|---|
| `ApplicantName` | string | Full name of the loan applicant |
| `LoanAmount` | string | Requested loan amount |
| `CreditScore` | string | Applicant's credit score |
| `RiskFactor` | string | Reviewer-assigned risk score (0–10) |
| `ReviewerComments` | string | Free-text notes from the reviewer |
| `Approved` | boolean | Approval decision written back on completion |
| `LoanDocument` | file | File attachment containing the loan document |

### 3. Configure `uipath.json`

Open `uipath.json` and update the clientId:

```json
{
  "scope": "DataFabric.Schema.Read DataFabric.Data.Read DataFabric.Data.Write",
  "clientId": "<external-application-clientId>"
}
```

- **`clientId`** — the App ID of your registered External Application in UiPath Cloud
- **`scope`** - the scopes required by the app. This must be a subset of the scopes granted to the external client above.

### 4. Deploy to UiPath Cloud

Build and deploy using the [`UiPath CLI`](https://uipath.github.io/uipath-typescript/coded-apps/getting-started/#deploy):

```bash
uip login
npm run build
uip codedapp pack dist -n <appName> --version 1.0.0
uip codedapp publish --type Action
uip codedapp deploy
```

---

## Action Schema

The action schema that drives this app expects the following inputs and produces the following outputs (defined in `action-schema.json`).

### Inputs

| Field | Type | Required | Description |
|---|---|---|---|
| `applicantName` | string | Yes | Full name of the loan applicant used to look up the Data Fabric record |

### Outputs

| Field | Type | Required | Description |
|---|---|---|---|
| `riskFactor` | integer | Yes | Reviewer-assigned risk score (0–10) |
| `reviewerComments` | string | No | Free-text notes from the reviewer |

### Outcomes

| Outcome | Triggered by |
|---|---|
| `Approve` | Clicking the **Approve** button |
| `Reject` | Clicking the **Reject** button |

---

## Viewing the coded action app in Action Center

1. Import the [Template With Data Fabric Entity.uis](./Template%20With%20Data%20Fabric%20Entity.uis) solution in **Studio Web**.

   <img width="3836" height="1977" alt="Screenshot 2026-03-10 174451" src="https://github.com/user-attachments/assets/36046521-a49c-49f6-b103-01164828d6fb" />

2. In the **Properties** panel of the User Task node, update the **Action App** field to point to your deployed coded action app.

   <img width="3832" height="1943" alt="Screenshot 2026-06-16 030652" src="https://github.com/user-attachments/assets/29bc562b-ba91-481c-9ef4-7d93a1178d4c" />

3. Click **Debug** and enter the input arguments to run the process — this will create an Action Center task backed by your app.
4. Open Action Center and complete the task to verify the full flow end-to-end.

--- OR ---

Create the task using an RPA workflow in **Studio Desktop** that uses the **Create App Task** activity, pointing to your deployed coded action app and passing the required inputs.

<img width="3838" height="1875" alt="Screenshot 2026-03-10 182414" src="https://github.com/user-attachments/assets/5c72d051-bb7c-4cb4-a23a-2751ffda3e69" />

---

## Expected Results

When the app loads inside Action Center:

1. **Review Form tab** — Fetches the Data Fabric record for the provided applicant name and displays the applicant name, loan amount, and credit score (read-only). The reviewer fills in the **Risk Factor** (integer 0–10, required) and optional **Reviewer Comments**.

2. **Auto-save to the entity** — Risk Factor and Reviewer Comments are saved to the Data Fabric record when the field **loses focus**, and only when its value actually changed. The task data itself is never modified — only the applicant name it was created with is retained; all reviewer edits go to the entity record. While an entity record save is in flight:
   - The field shows a spinner with **`Auto-Saving…`** beside its label, and the whole form (both inputs plus the Approve / Reject buttons) is locked until the write completes.
   - On success, a green **`✓ Entity record updated`** appears beside the label; on failure, a red **`✗ Failed to update entity record`**. Either indicator clears after a couple of seconds or as soon as the field is focused again.

3. **Completing the task** — Clicking **Approve** or **Reject** writes the Risk Factor, Reviewer Comments, and the approval decision back to the Data Fabric record, then completes the Action Center task with the applicant name, risk factor, and reviewer comments as outputs.

4. **Document tab** — Retrieves and renders the Loan Document attached to the entity record for reference.

5. **Theme** — The app initializes in light or dark mode based on the Action Center theme preference and supports toggling via the button in the top-right corner.

6. **Read-only mode** — If the task is already completed or the current user does not have edit access, all input fields are disabled and the Approve / Reject buttons are greyed out.




https://github.com/user-attachments/assets/970a5d03-8989-4c0e-9bd3-70e61e114f0a


