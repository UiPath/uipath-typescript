/**
 * Materializes the React Widgets pages into docs/react-widgets/ so MkDocs
 * renders them as part of this site. Each page is authored once, as the
 * package README in UiPath/uipath-ui-widgets, so npm, GitHub and this site all
 * show the same text and none of them can drift.
 *
 * Same contract as the typedoc-generated directories (docs/api/,
 * docs/coded-action-app-sdk/) and the fetched JS Functions section: the output
 * is gitignored, rebuilt on every docs build, never committed. The one
 * exception is docs/react-widgets/index.md -- the section overview is written
 * here, because it documents the collection rather than any one package.
 *
 * Run before `mkdocs build`, via: npm run docs:api
 *
 * Environment:
 *   WIDGET_DOCS_REF      Branch, tag or SHA to fetch. Defaults to the source
 *                        repo's default branch. Resolved to a commit SHA once,
 *                        so every page in a build comes from one snapshot.
 *   WIDGET_DOCS_TOKEN    Optional. The source repo is public, so this is only
 *                        needed to lift the unauthenticated rate limit on busy
 *                        runners.
 *   WIDGET_DOCS_OFFLINE  Set to 1 to skip the fetch and write placeholder
 *                        pages. For working on the rest of the site without
 *                        network access -- never in CI.
 *
 * ## Authoring contract
 *
 * A README has to render on npm, on GitHub and here. MkDocs-only syntax
 * (`!!!`, `???`, `=== "tab"`) shows up as literal punctuation on the first two,
 * so it is spelled in a portable form upstream and translated on the way in:
 *
 *   > **Note:** body                      ->  !!! note
 *   > **Warning: A title**                ->  !!! warning "A title"
 *   > continued body
 *
 *   <!-- tabs -->                         ->  === "First"
 *   <!-- tab: First -->
 *   body
 *   <!-- tab: Second -->
 *   <!-- /tabs -->
 *
 *   <!-- details warning: A title -->     ->  ??? warning "A title"
 *   body
 *   <!-- /details -->
 *
 * Blockquotes and HTML comments both degrade cleanly: npm and GitHub render the
 * first as a quote and drop the second entirely.
 *
 * Cross-page links must be absolute (https://uipath.github.io/uipath-typescript/...)
 * so they work from an npm page too. They are left as written -- which means a
 * PR preview links to the published site for those, and a relative .md link
 * upstream is a broken link here, so this script warns about them.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

const REPO = 'UiPath/uipath-ui-widgets';
const TARGET = join(process.cwd(), 'docs', 'react-widgets');
const CONFIG = join(process.cwd(), 'mkdocs.yml');
const SITE_URL = 'https://uipath.github.io/uipath-typescript/';

// Written here rather than fetched: it introduces the collection and the setup
// every widget shares, which is this site's concern, not any one package's.
const LOCAL_PAGES = new Set(['index.md']);

// The admonition types mkdocs.yml declares, plus the aliases a README author
// reaches for. An unknown word leaves the blockquote alone -- better a plain
// quote on the site than a silently dropped warning.
const ADMONITION_TYPES = new Map(
  [
    'note',
    'attention',
    'caution',
    'danger',
    'error',
    'tip',
    'hint',
    'warning',
    'info',
    'check',
  ]
    .map((type) => [type, type])
    .concat([
      ['important', 'info'],
      ['success', 'check'],
    ]),
);

/**
 * Every react-widgets page this site expects, as `slug -> nav title`, read from
 * the nav in mkdocs.yml so the page list and the page titles have exactly one
 * source of truth. The slug doubles as the upstream package directory name.
 */
function referencedPages(config) {
  const pages = new Map();
  for (const line of config.split('\n')) {
    const match = line.match(/^\s*-\s*(.+?):\s*react-widgets\/([A-Za-z0-9._-]+)\.md\s*$/);
    if (!match) continue;
    const [, title, slug] = match;
    if (LOCAL_PAGES.has(`${slug}.md`)) continue;
    // Only the site nav matches: the llmstxt block writes the same pages the
    // other way round (`path: description`), so those lines fall through.
    pages.set(slug, title.trim());
  }
  return pages;
}

async function gh(url, { token, accept = 'application/vnd.github+json' } = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: accept,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'uipath-typescript-docs-build',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(`GET ${url} -> ${response.status} ${response.statusText}`);
  }
  return response;
}

/**
 * Indents a block for nesting under a tab or collapsible marker. Blank lines
 * stay empty rather than becoming trailing whitespace.
 */
function indent(lines) {
  return lines.map((line) => (line.trim() === '' ? '' : `    ${line}`));
}

/** `> **Warning: Title**` / `> **Note:** body` -> an admonition block. */
function convertAdmonitions(lines, warn) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const opener = lines[i].match(/^>\s*\*\*([A-Za-z]+)(?::\s*(.*?))?\*\*:?\s*(.*)$/);
    if (!opener) {
      out.push(lines[i]);
      continue;
    }

    const [, word, titleFromLabel, rest] = opener;
    const type = ADMONITION_TYPES.get(word.toLowerCase());
    if (!type) {
      warn(`unknown admonition type "${word}" -- left as a blockquote`);
      out.push(lines[i]);
      continue;
    }

    const body = [];
    if (rest.trim()) body.push(rest.trim());
    while (i + 1 < lines.length && lines[i + 1].startsWith('>')) {
      body.push(lines[++i].replace(/^>\s?/, ''));
    }

    const title = titleFromLabel?.trim();
    out.push(title ? `!!! ${type} "${title}"` : `!!! ${type}`);
    out.push(...indent(body));
  }
  return out;
}

/** `<!-- tabs -->` / `<!-- tab: Title -->` groups -> `=== "Title"` blocks. */
function convertTabs(lines, warn) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^<!--\s*tabs\s*-->$/.test(lines[i].trim())) {
      out.push(lines[i]);
      continue;
    }

    const group = [];
    let current = null;
    let closed = false;
    while (++i < lines.length) {
      const line = lines[i];
      const tab = line.trim().match(/^<!--\s*tab:\s*(.+?)\s*-->$/);
      if (tab) {
        if (current) group.push(current);
        current = { title: tab[1], body: [] };
        continue;
      }
      if (/^<!--\s*\/tabs\s*-->$/.test(line.trim())) {
        closed = true;
        break;
      }
      if (!current) {
        if (line.trim() !== '') warn(`content between <!-- tabs --> and the first tab was dropped`);
        continue;
      }
      current.body.push(line);
    }
    if (current) group.push(current);
    if (!closed) warn('unclosed <!-- tabs --> block');

    for (const { title, body } of group) {
      out.push(`=== "${title}"`, '', ...indent(trimBlankEdges(body)), '');
    }
    // The source's own blank line after the closing marker still follows.
    if (lines[i + 1]?.trim() === '') i++;
  }
  return out;
}

/** `<!-- details warning: Title -->` -> `??? warning "Title"`. */
function convertDetails(lines, warn) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const opener = lines[i].trim().match(/^<!--\s*details(?:\s+([A-Za-z]+))?:\s*(.+?)\s*-->$/);
    if (!opener) {
      out.push(lines[i]);
      continue;
    }

    const [, rawType, title] = opener;
    const type = ADMONITION_TYPES.get((rawType ?? 'note').toLowerCase());
    if (!type) {
      warn(`unknown collapsible type "${rawType}" -- rendered as a note`);
    }

    const body = [];
    let closed = false;
    while (++i < lines.length) {
      if (/^<!--\s*\/details\s*-->$/.test(lines[i].trim())) {
        closed = true;
        break;
      }
      body.push(lines[i]);
    }
    if (!closed) warn(`unclosed <!-- details: ${title} --> block`);

    out.push(`??? ${type ?? 'note'} "${title}"`, '', ...indent(trimBlankEdges(body)), '');
    if (lines[i + 1]?.trim() === '') i++;
  }
  return out;
}

function trimBlankEdges(lines) {
  const copy = [...lines];
  while (copy.length && copy[0].trim() === '') copy.shift();
  while (copy.length && copy[copy.length - 1].trim() === '') copy.pop();
  return copy;
}

/**
 * Rewrites the package-name H1 into the site's nav title and states the package
 * underneath it, so a reader who lands on the page from search still sees what
 * to install.
 */
function rewriteHeading(lines, { slug, title, warn }) {
  const index = lines.findIndex((line) => line.startsWith('# '));
  if (index === -1) {
    warn('no H1 found -- page rendered without a title heading');
    return lines;
  }

  const heading = lines[index].slice(2).trim();
  const pkg = heading.startsWith('@uipath/') ? heading : `@uipath/ui-widgets-${slug}`;
  if (!heading.startsWith('@uipath/')) {
    warn(`H1 is "${heading}", expected the package name -- assuming ${pkg}`);
  }

  return [
    ...lines.slice(0, index),
    `# ${title}`,
    '',
    `Package: \`${pkg}\``,
    ...lines.slice(index + 1),
  ];
}

/** Flags links that resolve upstream but not here. */
function checkLinks(lines, warn) {
  const relative = /\]\((?!https?:|#|mailto:)([^)]+\.md(?:#[^)]*)?)\)/g;
  for (const line of lines) {
    for (const [, href] of line.matchAll(relative)) {
      warn(`relative link "${href}" does not resolve on the docs site -- use an absolute ${SITE_URL} URL`);
    }
  }
}

function transform(markdown, { slug, title, warn }) {
  let lines = markdown.replace(/\r\n/g, '\n').split('\n');
  checkLinks(lines, warn);
  lines = rewriteHeading(lines, { slug, title, warn });
  lines = convertTabs(lines, warn);
  lines = convertDetails(lines, warn);
  lines = convertAdmonitions(lines, warn);
  return `${lines.join('\n').replace(/\n{3,}$/, '\n')}`;
}

function writePage(slug, body) {
  const dest = join(TARGET, `${slug}.md`);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, body.endsWith('\n') ? body : `${body}\n`);
}

function placeholder(slug, title) {
  return `# ${title}

This page is authored in [\`${REPO}\`](https://github.com/${REPO}) as
\`packages/${slug}/README.md\`, and is fetched at docs build time by
\`scripts/fetch-widget-docs.mjs\`.

The fetch was skipped because \`WIDGET_DOCS_OFFLINE\` was set.
`;
}

/** Clears the generated pages without touching the ones authored here. */
function clearGenerated(pages) {
  for (const slug of pages.keys()) {
    rmSync(join(TARGET, `${slug}.md`), { force: true });
  }
}

async function main() {
  if (!existsSync(CONFIG)) {
    throw new Error(`${CONFIG} not found -- run this from the repository root.`);
  }

  const pages = referencedPages(readFileSync(CONFIG, 'utf8'));
  if (pages.size === 0) {
    throw new Error(
      `mkdocs.yml references no react-widgets pages; expected the React Widgets nav entries. Refusing to touch ${TARGET}.`,
    );
  }

  for (const local of LOCAL_PAGES) {
    if (!existsSync(join(TARGET, local))) {
      throw new Error(`${join('docs/react-widgets', local)} is authored in this repo but missing.`);
    }
  }

  const warnings = [];
  const warn = (slug, message) => {
    warnings.push(`${slug}: ${message}`);
    console.warn(`::warning::${REPO} packages/${slug}/README.md -- ${message}`);
  };

  if (process.env.WIDGET_DOCS_OFFLINE === '1') {
    console.warn(
      '::warning::WIDGET_DOCS_OFFLINE=1 -- skipping the widget docs fetch. Writing placeholder pages; the React Widgets section will not show real content.',
    );
    clearGenerated(pages);
    for (const [slug, title] of pages) writePage(slug, placeholder(slug, title));
    return;
  }

  const token = process.env.WIDGET_DOCS_TOKEN;
  const ref = process.env.WIDGET_DOCS_REF;

  // Resolve to a SHA once so every page comes from the same commit, even if the
  // branch moves mid-build.
  const branch = ref ?? (await (await gh(`https://api.github.com/repos/${REPO}`, { token })).json()).default_branch;
  const commit = await (
    await gh(`https://api.github.com/repos/${REPO}/commits/${branch}`, { token })
  ).json();
  const sha = commit.sha;
  console.log(`Fetching ${REPO}@${branch} (${sha.slice(0, 7)}) widget docs...`);

  const fetched = await Promise.all(
    [...pages].map(async ([slug, title]) => {
      const url = `https://api.github.com/repos/${REPO}/contents/packages/${slug}/README.md?ref=${sha}`;
      let markdown;
      try {
        markdown = await (await gh(url, { token, accept: 'application/vnd.github.raw' })).text();
      } catch (error) {
        throw new Error(
          `${REPO}@${sha} has no packages/${slug}/README.md, which mkdocs.yml references as react-widgets/${slug}.md. ` +
            `Update the React Widgets nav entries in mkdocs.yml, or restore the package. (${error.message})`,
        );
      }
      return [slug, transform(markdown, { slug, title, warn: (m) => warn(slug, m) })];
    }),
  );

  clearGenerated(pages);
  for (const [slug, body] of fetched) writePage(slug, body);

  // Drift the other way: a package added upstream that nothing here references
  // is invisible on the site.
  const upstream = await (
    await gh(`https://api.github.com/repos/${REPO}/contents/packages?ref=${sha}`, { token })
  ).json();
  for (const entry of upstream) {
    if (entry.type === 'dir' && !pages.has(entry.name)) {
      console.warn(
        `::warning::${REPO}@${sha.slice(0, 7)} provides packages/${entry.name}, which mkdocs.yml does not reference. ` +
          `It is absent from the site -- add a React Widgets nav entry for react-widgets/${entry.name}.md.`,
      );
    }
  }

  console.log(
    `Fetched ${fetched.length} widget pages into docs/react-widgets/` +
      (warnings.length ? ` (${warnings.length} warning${warnings.length === 1 ? '' : 's'})` : ''),
  );
}

main().catch((error) => {
  console.error(`::error::${error.message}`);
  process.exit(1);
});
