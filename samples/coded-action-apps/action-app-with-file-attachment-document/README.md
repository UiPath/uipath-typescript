# Action App With File Attachment Document

A UiPath Coded Action App template for **Loan Application Review** with direct file attachments. Reviewers can assess an applicant's details, preview and download a directly attached PDF document, and complete the task with an Approve or Reject decision.

This template demonstrates how to handle direct file attachments in coded action apps, as opposed to referencing files from Storage Buckets.

---

## Pre-requisites

- **Node.js** 20.x or later
- **npm** 8.x or later
- A **UiPath Automation Cloud** tenant with:
  - A non-confidential **External Application** (OAuth client) registered with the following:
    - Scopes:
        - `OR.Folders.Read` (for file attachments)
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

### 2. Configure `uipath.json`

Open `uipath.json` and update the clientId:

```json
{
  "scope": "OR.Folders.Read",
  "clientId": "<external-application-clientId>"
}
```
- **`clientId`** — the App ID of your registered External Application in UiPath Cloud
- **`scope`** - the scopes required by the app. This must be a subset of the scopes granted to the external client above.

### 3. Deploy to UiPath Cloud

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
| `applicantName` | string | Yes | Full name of the loan applicant |
| `loanAmount` | number | No | Requested loan amount |
| `creditScore` | number | No | Applicant's credit score |
| `loanDocument` | file | No | Direct file attachment containing the loan document (PDF) |

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

## Key Differences from Storage Bucket Template

This template differs from the `templateWithStorageBucket` in the following ways:

1. **File Input Method**: Uses direct file attachment (`file` type) instead of Storage Bucket name and file path (string inputs)
2. **Direct File Access**: Uses `uipath.attachmentService.getById()` instead of Storage Bucket APIs

---

## Viewing the coded action app in Action Center

1. Import the [Template With File Attachment.uis](./Template%20With%20File%20Attachment.uis) solution in **Studio Web**.
   
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

1. **Review Form tab** — Displays the applicant name, loan amount, and credit score from the task inputs (read-only). The reviewer fills in the **Risk Factor** (integer 0–10, required) and optional **Reviewer Comments**, then clicks **Approve** or **Reject** to complete the task.

2. **Document tab** — On first visit, retrieves the attached file using the attachment service, fetches a signed download URI for the PDF, and renders it inline with:
   - Page navigation (previous / next)
   - Zoom controls
   - A **Download** button
   - An inline error message if the file cannot be found or accessed

3. **Theme** — The app initializes in light or dark mode based on the Action Center theme preference and supports toggling via the button in the top-right corner.

4. **Read-only mode** — If the task is already completed or the current user does not have edit access, all input fields are disabled and the Approve / Reject buttons are greyed out.




https://github.com/user-attachments/assets/72cf662b-426e-4cf2-97e8-73245b6d5523
