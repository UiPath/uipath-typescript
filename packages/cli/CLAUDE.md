# UiPath CLI (`@uipath/uipath-ts-cli`)

CLI tool for authenticating, packaging, publishing, and deploying UiPath web/action apps. Built on oclif.

## Quick reference

```bash
# from packages/cli/
npm run build        # tsc + copy assets → dist/
npm test             # jest
npm run test:watch   # jest watch
npm run lint         # eslint src/**/*.ts
```

To run CLI locally during development:

```bash
node dist/cli.js auth
node dist/cli.js register app
node dist/cli.js pack <dist-path>
node dist/cli.js publish <nupkg-path>
node dist/cli.js deploy
node dist/cli.js push
```

## Package context

This is a workspace package inside the root `uipath-typescript` monorepo. It has its own `package.json`, `tsconfig.json`, and test setup (Jest, not Vitest like the root SDK). Binary entry point: `dist/cli.js`, exposed as `uipath` in `bin`.

## Commands

Each command is a file in `src/commands/`:

| Command | File | What it does |
|---------|------|-------------|
| `auth` | `commands/auth.ts` | OAuth browser flow or client-credentials auth |
| `register app` | `commands/register/app.ts` | Register web/action app, saves config to `.uipath/app.config.json` |
| `pack` | `commands/pack.ts` | Package built app as `.nupkg` (NuGet) |
| `publish` | `commands/publish.ts` | Upload `.nupkg` to Orchestrator |
| `deploy` | `commands/deploy.ts` | Deploy/upgrade app, returns app URL |
| `push` | `commands/push.ts` | Sync local build to Studio Web project (atomic file sync with lock management) |

## Conventions

- Commands extend oclif `Command` base class. Topic separator is space (e.g. `uipath register app`, not `uipath register:app`).
- Interactive prompts use `inquirer`. Non-interactive mode supported via flags on all commands.
- Progress indicators use `ora`. Colored output uses `chalk`.
- Auth tokens/config stored via the `src/auth/` module. OAuth uses a local Express server for the redirect callback.
- Validation uses `zod` schemas.
- Assets (templates, etc.) live in `src/assets/` and are copied to `dist/assets/` at build time (`npm run copy-assets`).

## Adding a new command

1. Create `src/commands/<name>.ts` (or `src/commands/<topic>/<name>.ts` for sub-commands).
2. Export a class extending oclif `Command`. Define `static flags`, `static args`, and `async run()`.
3. Build with `npm run build` — oclif discovers commands from `dist/commands/`.
4. Node >= 18 required (`engines` in package.json).
