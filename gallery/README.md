# UiPath TypeScript SDK — Sample Gallery

A zero-dependency, config-driven gallery that previews every app under
[`samples/`](../samples), with category tabs, framework + tag filters, and search.
Each card shows the app's demo GIF (apps without a GIF get a generated poster tile)
and links to the sample's folder on GitHub.

- **No build step, no framework** — a single `index.html` + a JSON manifest.
- **Configurable** — everything the gallery shows comes from `gallery.config.json`.
- **GitHub-hostable** — deploys to GitHub Pages via the included workflow.

## Repo layout

Drop these into the repository root:

```
gallery/
  index.html            # the gallery (self-contained; embeds a fallback config)
  gallery.config.json   # the manifest — edit this to curate the gallery
  scripts/
    generate-config.mjs # rescans samples/ and rebuilds the manifest
.github/workflows/
  gallery-pages.yml     # GitHub Pages deploy
```

## Preview locally

```bash
cd gallery
python3 -m http.server 8000      # or: npx serve .
# open http://localhost:8000
```

Opening `index.html` directly with `file://` also works — it falls back to the
config embedded in the page when it can't `fetch()` the JSON.

## Configuring it

`gallery.config.json` is the single source of truth:

| Field            | Purpose                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `title` / `tagline` / `repo` | Header text and the "View repository" link.              |
| `assetsBaseUrl`  | Prefix for GIF paths. Defaults to `raw.githubusercontent.com/.../main/` so previews load on **any** host without copying assets. |
| `categories[]`   | `id`, `label`, and a two-stop `accent` gradient (used for tabs, swatches, and poster tiles). |
| `apps[]`         | `id`, `title`, `description`, `category`, `framework`, `tags[]`, `path`, and `preview` (repo-relative GIF path, or `null` for a poster). |

Add an app by appending an object to `apps[]`. Add a filter dimension by adding a
tag — the filter bar is generated from whatever tags exist.

### Keeping it in sync automatically

```bash
node gallery/scripts/generate-config.mjs
```

Rescans `samples/`, pulls each app's title/description from its `README.md`, detects
the framework from `package.json`, and finds `screenshots/*.gif`. **Curated fields
(tags, category accents, description overrides) are preserved** by `id`, so a rescan
never clobbers your edits. Review the diff before committing.

## Hosting on GitHub Pages

1. Copy `gallery-pages.yml` to `.github/workflows/`.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Push to `main`. The gallery publishes at
   `https://<org>.github.io/<repo>/` (e.g. `https://uipath.github.io/uipath-typescript/`).

Because GIFs load over `raw.githubusercontent.com`, the Pages artifact only contains
the `gallery/` folder — the multi-MB sample sources and GIFs are **not** duplicated
into the deploy. If you'd rather self-host the assets, set `assetsBaseUrl` to `"../"`
and switch the Pages source to serve the repo root.

## Use a template

Every card has a **Clone** button that copies a scoped [`degit`](https://github.com/Rich-Harris/degit)
command — it pulls just that one sample out of the monorepo (no git history, no other samples):

```bash
npx degit UiPath/uipath-typescript/samples/data-fabric-app data-fabric-app
```

Each card also links to **GitHub** (the folder), **github.dev** (the in-browser VS Code editor,
scoped to that sample), and **Codespaces**. The `degit` command works the same when pasted into
Claude Code or a terminal. All three deep links are derived from `repo` in the config, so they
follow automatically if the gallery is pointed at a fork.

## Notes

- Light/dark aware, with a manual toggle (persisted to `localStorage`).
- GIFs are lazy-loaded and fade in over the poster, so the page stays responsive
  even with a dozen animated previews.
- Fully static and CSP-friendly — no external scripts or fonts.
