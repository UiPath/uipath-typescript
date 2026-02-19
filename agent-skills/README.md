# UiPath Coded Apps – Agent Skills

AI-powered skills for creating, debugging, and deploying UiPath coded apps. Works with any agentic IDE that supports the agent skills convention.

## Available Skills

| Skill | Description |
|-------|-------------|
| **create-app** | Scaffold a full UiPath web app (Vite + React + TypeScript, OAuth, SDK services, Tailwind) |
| **debug-app** | Diagnose auth & config issues (redirect URIs, scopes, CORS, tokens, External App setup) |
| **deploy-app** | Deploy your coded app to UiPath Cloud via the `@uipath/uipath-ts-cli` |

## Installation

### 1. Clone the repo

```bash
git clone -b feat/codedapps-skills https://github.com/UiPath/uipath-typescript.git
cd uipath-typescript/agent-skills
```

### 2. Install for your IDE

<details>
<summary><b>Claude Code</b></summary>

**Option A — Install via plugin marketplace (recommended):**

```bash
# Register the marketplace (one-time, stored globally at ~/.claude/plugins/)
claude plugin marketplace add ./

# Install the plugin
claude plugin install uipath-coded-apps@uipath-marketplace
```

Skills are available as namespaced slash commands: `/uipath-coded-apps:create-app`, `/uipath-coded-apps:debug-app`, `/uipath-coded-apps:deploy-app`.

**Option B — Copy skills directly:**

```bash
mkdir -p /path/to/your-project/.claude/skills
cp -r skills/* /path/to/your-project/.claude/skills/
```

Skills are auto-discovered and available as `/create-app`, `/debug-app`, `/deploy-app`. You can also install them globally at `~/.claude/skills/`.

[Claude Code Skills Docs](https://code.claude.com/docs/en/skills) · [Claude Code Plugins Docs](https://code.claude.com/docs/en/plugins)

</details>

<details>
<summary><b>Cursor</b></summary>

```bash
mkdir -p /path/to/your-project/.cursor/skills
cp -r skills/* /path/to/your-project/.cursor/skills/
```

Cursor auto-detects skills from `.cursor/skills/` and makes them available in Agent mode.

[Cursor Skills Docs](https://cursor.com/docs/context/skills)

</details>

<details>
<summary><b>Windsurf</b></summary>

```bash
mkdir -p /path/to/your-project/.windsurf/skills
cp -r skills/* /path/to/your-project/.windsurf/skills/
```

Windsurf auto-detects skills from `.windsurf/skills/`. Global skills can go in `~/.codeium/windsurf/skills/`.

[Windsurf Skills Docs](https://docs.windsurf.com/windsurf/cascade/skills)

</details>

<details>
<summary><b>OpenAI Codex</b></summary>

```bash
mkdir -p /path/to/your-project/.agents/skills
cp -r skills/* /path/to/your-project/.agents/skills/
```

Codex scans `.agents/skills/` from the current directory up to the repo root. Global skills can go in `~/.agents/skills/`.

[Codex Skills Docs](https://developers.openai.com/codex/skills/)

</details>

<details>
<summary><b>Google Antigravity</b></summary>

```bash
mkdir -p /path/to/your-project/.agent/skills
cp -r skills/* /path/to/your-project/.agent/skills/
```

Antigravity auto-detects skills from `.agent/skills/` in the workspace root. Global skills can go in `~/.gemini/antigravity/skills/`.

[Antigravity Skills Codelab](https://codelabs.developers.google.com/getting-started-with-antigravity-skills)

</details>

<details>
<summary><b>Other IDEs</b></summary>

Copy the skill folders from `skills/` into whatever directory your IDE expects for agent skills.

</details>

## Skill Details

### `/uipath-coded-apps:create-app` — Create a Coded App

Scaffolds a full UiPath web application from scratch:

- Project setup with Vite + React + TypeScript
- OAuth authentication configuration
- UiPath SDK service integration (Entities, Tasks, Processes, Assets, Queues, Buckets, Maestro)
- Tailwind CSS styling
- Pagination, polling, and BPMN rendering patterns

**When to use:** You want to create a new UiPath web app, build a React dashboard with UiPath data, or add UiPath SDK services to an existing React project.

### `/uipath-coded-apps:debug-app` — Debug Authentication & Configuration Issues

Diagnoses and fixes authentication and configuration issues in coded apps:

- Redirect URI mismatches
- OAuth scope errors
- Stale token / browser state problems
- CORS and base URL misconfiguration
- UiPath External Application setup (scopes, redirect URLs)
- Dev server and .env configuration issues

Uses Playwright for automated browser-based debugging.

**When to use:** Your app's login flow is failing, returning errors, or API calls are failing after login.

### `/uipath-coded-apps:deploy-app` — Deploy to UiPath Cloud

Guides you through deploying your coded app to the UiPath platform using the `@uipath/uipath-ts-cli`.

**When to use:** Your app is ready and you want to publish it to UiPath Cloud.

## Updating

Pull the latest changes and reinstall:

```bash
cd uipath-typescript
git pull origin feat/codedapps-skills
```

**Claude Code (marketplace):** `claude plugin install uipath-coded-apps@uipath-marketplace`

**All other IDEs:** Re-run the `cp` command for your IDE from the installation steps above.

## Uninstalling

**Claude Code (marketplace):**

```bash
claude plugin uninstall uipath-coded-apps
claude plugin marketplace remove uipath-marketplace
```

**All other IDEs** — remove the skill directories from your project:

```bash
# Cursor
rm -rf /path/to/your-project/.cursor/skills/{create-app,debug-app,deploy-app}

# Windsurf
rm -rf /path/to/your-project/.windsurf/skills/{create-app,debug-app,deploy-app}

# Codex
rm -rf /path/to/your-project/.agents/skills/{create-app,debug-app,deploy-app}

# Antigravity
rm -rf /path/to/your-project/.agent/skills/{create-app,debug-app,deploy-app}

# Claude Code (if using Option B)
rm -rf /path/to/your-project/.claude/skills/{create-app,debug-app,deploy-app}
```

## Directory Structure

```
agent-skills/
├── skills/ → .claude-plugin/plugins/uipath-coded-apps/skills/   # symlink
├── .claude-plugin/
│   ├── marketplace.json                          # Claude Code marketplace definition
│   └── plugins/
│       └── uipath-coded-apps/
│           ├── .claude-plugin/
│           │   └── plugin.json                   # Plugin metadata
│           └── skills/                           # Skill files (single source of truth)
│               ├── create-app/
│               │   ├── SKILL.md
│               │   ├── references/
│               │   └── scripts/
│               ├── debug-app/
│               │   ├── SKILL.md
│               │   └── references/
│               └── deploy-app/
│                   ├── SKILL.md
│                   └── scripts/
└── README.md
```
