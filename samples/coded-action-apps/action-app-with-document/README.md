# Action App With Document

A UiPath Coded Action App template for **Loan Application Review**. Reviewers can assess an applicant's details and view a bundled sample PDF document, then complete the task with an Approve or Reject decision.

---

## Pre-requisites

- **Node.js** 20.x or later
- **npm** 8.x or later
- A **UiPath Automation Cloud** tenant
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

### 2. Deploy to UiPath Cloud

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

The action schema that drives this app expects the following inputs and produces the following outputs (defined in `action-schema.json`):

### Inputs

| Field | Type | Required | Description |
|---|---|---|---|
| `applicantName` | string | Yes | Full name of the loan applicant |
| `loanAmount` | number | No | Requested loan amount |
| `creditScore` | number | No | Applicant's credit score |

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

1. Import the [Template With Image and Doc.uis](./Template%20With%20Image%20and%20Doc.uis) solution in **Studio Web**.
   
   <img width="3836" height="1977" alt="Screenshot 2026-03-10 174451" src="https://github.com/user-attachments/assets/ffdb38cf-2122-4e84-aeeb-49de0b718c2d" />

2. In the **Properties** panel of the User Task node, update the **Action App** field to point to your deployed coded action app.
   
   <img width="3832" height="1943" alt="Screenshot 2026-06-16 030652" src="https://github.com/user-attachments/assets/29bc562b-ba91-481c-9ef4-7d93a1178d4c" />


3. Click **Debug** to run the process — this will create an Action Center task backed by your app.
4. Open Action Center and complete the task to verify the full flow end-to-end.

--- OR ---

Create the task using an RPA workflow in **Studio Desktop** that uses the **Create App Task** activity, pointing to your deployed coded action app and passing the required inputs.

<img width="3838" height="1875" alt="Screenshot 2026-03-10 182414" src="https://github.com/user-attachments/assets/17f30481-1b4f-49b1-8c06-74e0fff04b3f" />


---

## Expected Results

When the app loads inside Action Center:

1. **Review Form tab** — Displays the applicant name, loan amount, and credit score from the task inputs (read-only). The reviewer fills in the **Risk Factor** (integer 0–10, required) and optional **Reviewer Comments**, then clicks **Approve** or **Reject** to complete the task.

2. **Document tab** — Renders a bundled sample PDF inline with:
   - Page navigation (previous / next)
   - Zoom controls
   - A **Download** button

3. **Theme** — The app initializes in light or dark mode based on the Action Center theme preference and supports toggling via the button in the top-right corner.

4. **Read-only mode** — If the task is already completed or the current user does not have edit access, all input fields are disabled and the Approve / Reject buttons are greyed out.




https://github.com/user-attachments/assets/afbfdbfe-d049-4309-bd21-3ae71a4c59e5



