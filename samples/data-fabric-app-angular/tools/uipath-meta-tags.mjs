/**
 * Angular `indexHtmlTransformer` — the Angular-CLI equivalent of the
 * `uipathCodedApps()` Vite plugin used by the React sample.
 *
 * Reads `uipath.json` from the project root and injects the
 * `<meta name="uipath:*">` tags the UiPath TypeScript SDK reads when it is
 * constructed with no config (`new UiPath()`), so the same SDK init code
 * works in local dev and in production. At deploy time the UiPath platform
 * injects its own production values, so when `uipath.json` is absent this
 * transformer is a no-op.
 *
 * Wired up in angular.json → architect.build.options.indexHtmlTransformer.
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const configPath = path.join(projectRoot, 'uipath.json')

/** uipath.json key → meta tag name (matches the SDK's UiPathMetaTags enum). */
const META_TAG_NAMES = {
  clientId: 'uipath:client-id',
  scope: 'uipath:scope',
  orgName: 'uipath:org-name',
  tenantName: 'uipath:tenant-name',
  baseUrl: 'uipath:base-url',
  redirectUri: 'uipath:redirect-uri',
  folderKey: 'uipath:folder-key',
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export default function injectUiPathMetaTags(...args) {
  // Robust to transformer signature variants — find the HTML string arg.
  const indexHtml = args.find((a) => typeof a === 'string')
  if (!indexHtml) return args[0]

  if (!existsSync(configPath)) {
    console.warn(
      '[uipath-meta-tags] uipath.json not found — skipping meta tag injection. ' +
        'Copy uipath.json.example to uipath.json for local development.',
    )
    return indexHtml
  }

  const config = JSON.parse(readFileSync(configPath, 'utf-8'))
  const tags = Object.entries(META_TAG_NAMES)
    .filter(([key]) => config[key])
    .map(
      ([key, name]) =>
        `<meta name="${name}" content="${escapeAttribute(config[key])}" />`,
    )

  if (tags.length === 0) return indexHtml
  return indexHtml.replace('</head>', `    ${tags.join('\n    ')}\n  </head>`)
}
