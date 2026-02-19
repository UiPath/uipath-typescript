# UiPath Coded Apps – Claude Code Plugin

## Installation

### 1. Clone the repository

```bash
git clone -b coded-apps-skills https://github.com/UiPath/uipath-typescript.git
cd uipath-typescript
```

### 2. Register the marketplace

```bash
claude plugin marketplace add ./
```

This registers the local directory as a plugin marketplace in your Claude Code configuration. It is stored globally at `~/.claude/plugins/`, so you only need to do this once, it will be available across all terminals and projects.

### 3. Install the plugin

```bash
claude plugin install uipath-coded-apps@uipath-marketplace
```

That's it. The skills are now available in any Claude Code session on your machine.

## Available Skills

Once installed, you can invoke any of these skills from within Claude Code using slash commands:

### `/uipath-coded-apps:create-app` — Create a new Coded App

Scaffolds a full UiPath web application from scratch. Covers:

- Project setup with Vite + React + TypeScript
- OAuth authentication configuration
- UiPath SDK service integration (Entities, Tasks, Processes, Assets, Queues, Buckets, Maestro)
- Tailwind CSS styling
- Pagination, polling, and BPMN rendering patterns

**When to use:** You want to create a new UiPath web app, build a React dashboard with UiPath data, or add UiPath SDK services to an existing React project.

### `/uipath-coded-apps:debug-app` — Debug Authentication & Configuration Issues

Diagnoses and fixes authentication and configuration issues in coded apps, including:

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

Plugin files are cached locally on install, so pulling new changes requires a reinstall:

```bash
cd uipath-typescript
git pull origin coded-apps-skills
claude plugin install uipath-coded-apps@uipath-marketplace
```

## Uninstalling

```bash
claude plugin uninstall uipath-coded-apps
claude plugin marketplace remove uipath-marketplace
```
