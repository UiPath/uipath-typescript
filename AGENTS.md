# UiPath TypeScript SDK (Reference)

## Context
This is a cloned reference of the official [UiPath TypeScript SDK](https://github.com/UiPath/uipath-typescript). It provides a type-safe library for interacting with UiPath Platform services.

- **Primary Goal**: Maintain a clean, up-to-date reference implementation.
- **Language**: TypeScript (Node.js & Browser support).
- **Status**: Beta (see `package.json` version).

## Codebase Map

### 📂 Root Directory
- **`src/`**: The Core SDK logic.
    - **`uipath.ts`**: Main entry point and `UiPath` class definition.
    - **`services/`**: logic for individual services (Maestro, Orchestrator, etc.).
    - **`models/`**: TypeScript interfaces and types.
    - **`core/`**: Core utilities, HTTP client, and error handling.
    - **`utils/`**: Helper functions.
- **`packages/`**: Monorepo-style packages (extensions/tools).
    - **`cli/`**: Command Line Interface tools.
- **`docs/`**: Source files for the [documentation website](https://uipath.github.io/uipath-typescript/).
    - Uses MkDocs (see `mkdocs.yml`).
- **`samples/`**: Example applications (e.g., `process-app`).
- **`tests/`**: Unit and integration tests (using Vitest).

### 🛠 Configuration
- **`package.json`**:
    - **Scripts**: `build`, `test`, `docs:api`.
    - **Dependencies**: minimal runtime deps (`axios`, `@opentelemetry/sdk-logs`).
- **`rollup.config.js`**: Build configuration for bundling the SDK.
- **Sources**: `docs/` is the source of truth.
    - Uses MkDocs (see `mkdocs.yml`).

### 📚 Documentation Map (`docs/`)
The documentation supports the [GitHub Pages Site](https://uipath.github.io/uipath-typescript/). The structure in `mkdocs.yml` maps to:
- **Core Guides**:
    - `getting-started.md`: Installation & Quick Start.
    - `authentication.md`: Auth concepts (Secrets vs OAuth).
    - `oauth-scopes.md`: Required scopes for various services.
    - `pagination.md` & `error-handling.md`: Key API patterns.
- **API Reference** (`docs/api/interfaces/`):
    - *Note*: These are often generated or manually maintained definitions of the Service Models.
    - Key Files: `AssetServiceModel.md`, `ProcessServiceModel.md`, `TaskServiceModel.md`, etc.
- **Contributing**:
    - `CONTRIBUTING.md`: Rules for PRs.
    - `release-policy.md`: How versioning works.

## Navigation Guide

### finding_functionality
- **Authentication**: Look in `src/uipath.ts` (initialization) and `docs/authentication.md` (concepts).
- **Service Logic**: Check `src/services/[ServiceName]/` (e.g., `src/services/Tasks/`).
- **Data Types**: Check `src/models/`.
- **Docs Layout**: Check `mkdocs.yml` to see how pages are organized in the nav bar.

### common_workflows
- **Building**: `npm run build`
- **Testing**: `npm test` (uses Vitest)
- **Docs**: `npm run docs:api` (generates API docs) -> `mkdocs serve` (previews site).
- **Update Docs**: Modify `.md` files in `docs/` -> `mkdocs serve` to verify -> Push to trigger GH Action.

## Purpose & Maintenance
- **Purpose**: A comprehensive, type-safe TypeScript SDK for interacting with UiPath Platform services (Orchestrator, Maestro, Data Fabric, etc.).
- **Maintenance**:
    - **Official Repo**: maintained by UiPath.
    - **This Fork**: maintained by `JReames` for personal contributions/reference.
    - **Version**: Follows semantic versioning (currently Beta).

## Architecture Decisions
- **Enums vs String Literals**: 
    - The SDK typically uses String Literals (e.g., `'High' | 'Normal'`) instead of TypeScript Enums for API payloads.
    - **Reason**: Simplifies consumption for users (don't need to import Enums) and aligns with JSON-over-wire simplicity.
    - **Future Work**: Consider exporting Enums if type safety becomes a major pain point.

## Git Status
- **Origin**: `https://github.com/JReames/uipath-typescript.git` (Personal Fork)
- **Upstream**: `https://github.com/UiPath/uipath-typescript.git` (Official Repo)

## Contribution Workflow
**Standard PR Process**:
1.  **Sync**: `git fetch upstream` -> `git checkout main` -> `git merge upstream/main`.
2.  **Branch**: `git checkout -b feature/my-new-feature`.
3.  **Develop**: Make changes in `src/` or `docs/`.
4.  **Verify**:
    - Build: `npm run build` (Must pass without warnings).
    - Test: `npm test` (All tests must pass).
5.  **Commit**: Write clear, descriptive commit messages.
6.  **Push**: `git push origin feature/my-new-feature`.
7.  **PR**: Open a Pull Request on the upstream repo.

## Resources
- [Contribution Guidelines](docs/CONTRIBUTING.md)
