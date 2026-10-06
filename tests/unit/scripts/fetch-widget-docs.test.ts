import { describe, it, expect } from 'vitest';
// The widget-docs transform. Imported directly (the script only runs its CLI
// when executed as main), so we exercise the pure passes here without fetching.
import {
  fenceMask,
  referencedPages,
  rewriteHeading,
  stripIgnored,
  transform,
} from '../../../scripts/fetch-widget-docs.mjs';

const noop = () => {};
const thrower = (message: string): never => {
  throw new Error(message);
};

/** Runs the full pipeline the way the fetcher does, collecting warnings. */
const render = (
  markdown: string,
  { slug = 'pdf-viewer', title = 'PDF Viewer' } = {},
): { out: string; warnings: string[] } => {
  const warnings: string[] = [];
  const out = transform(markdown, {
    slug,
    title,
    warn: (m: string) => warnings.push(m),
    fail: thrower,
  });
  return { out, warnings };
};

const lines = (markdown: string): string[] => markdown.split('\n');

describe('fenceMask', () => {
  it('marks fenced lines and leaves prose unmarked', () => {
    const mask = fenceMask(lines('a\n```js\nb\n```\nc'));
    expect(mask).toEqual([false, true, true, true, false]);
  });

  it('ignores a fence of the other character inside an open fence', () => {
    const mask = fenceMask(lines('```\n~~~\n```\nafter'));
    expect(mask).toEqual([true, true, true, false]);
  });

  it('tracks a fence that has been indented into a tab body', () => {
    const mask = fenceMask(lines('    ```bash\n    npm i\n    ```\nafter'));
    expect(mask).toEqual([true, true, true, false]);
  });
});

describe('markers inside fenced code blocks', () => {
  // A README that documents this very syntax puts the markers in a fence as an
  // example. Rewriting those mangles the example and unbalances the fence.
  it('leaves an admonition blockquote inside a fence alone', () => {
    const { out } = render('# @uipath/ui-widgets-pdf-viewer\n\n```markdown\n> **Note:** an example\n```\n');
    expect(out).toContain('> **Note:** an example');
    expect(out).not.toContain('!!! note');
  });

  it('leaves tab and details markers inside a fence alone', () => {
    const { out } = render(
      '# @uipath/ui-widgets-pdf-viewer\n\n```markdown\n<!-- tabs -->\n<!-- tab: npm -->\n<!-- /tabs -->\n```\n',
    );
    expect(out).toContain('<!-- tab: npm -->');
    expect(out).not.toContain('=== "npm"');
  });

  it('does not treat a comment inside a fence as the H1', () => {
    const { out } = render('```bash\n# Install the widget\nnpm i\n```\n\n# @uipath/ui-widgets-pdf-viewer\n');
    expect(out).toContain('# Install the widget');
    expect(out.indexOf('# PDF Viewer')).toBeGreaterThan(out.indexOf('npm i'));
  });

  it('leaves a docs:ignore marker inside a fence alone', () => {
    const { out } = render('# @uipath/ui-widgets-pdf-viewer\n\n```markdown\n<!-- docs:ignore -->\nkept\n```\n');
    expect(out).toContain('<!-- docs:ignore -->');
    expect(out).toContain('kept');
  });
});

describe('nesting', () => {
  it('converts a collapsible inside a tab and keeps it indented in the tab', () => {
    const { out } = render(
      [
        '# @uipath/ui-widgets-pdf-viewer',
        '',
        '<!-- tabs -->',
        '<!-- tab: First -->',
        'Intro.',
        '',
        '<!-- details warning: Careful -->',
        'Hidden body',
        '<!-- /details -->',
        '',
        'Tail of tab one.',
        '<!-- /tabs -->',
        '',
      ].join('\n'),
    );
    // The collapsible must sit inside the tab, not break out of it at col 0.
    expect(out).toContain('    ??? warning "Careful"');
    expect(out).not.toMatch(/^\?\?\? warning/m);
    expect(out).toContain('    Tail of tab one.');
  });

  it('converts an admonition nested inside a tab', () => {
    const { out } = render(
      [
        '# @uipath/ui-widgets-pdf-viewer',
        '',
        '<!-- tabs -->',
        '<!-- tab: First -->',
        'Some text.',
        '',
        '> **Note:** nested body',
        '> second line',
        '<!-- /tabs -->',
        '',
      ].join('\n'),
    );
    expect(out).toContain('    !!! note');
    expect(out).toContain('        nested body');
    expect(out).toContain('        second line');
    expect(out).not.toContain('> **Note:**');
  });

  it('converts an admonition nested inside a collapsible', () => {
    const { out } = render(
      [
        '# @uipath/ui-widgets-pdf-viewer',
        '',
        '<!-- details note: Title -->',
        '> **Warning:** careful',
        '<!-- /details -->',
        '',
      ].join('\n'),
    );
    expect(out).toContain('??? note "Title"');
    expect(out).toContain('    !!! warning');
    expect(out).toContain('        careful');
  });
});

describe('admonitions', () => {
  it('keeps two adjacent admonitions separate', () => {
    const { out } = render('# @uipath/ui-widgets-pdf-viewer\n\n> **Note:** first\n> **Warning:** second\n');
    expect(out).toContain('!!! note');
    expect(out).toContain('!!! warning');
    expect(out).not.toContain('**Warning:** second');
  });

  it('reads a title from the label', () => {
    const { out } = render('# @uipath/ui-widgets-pdf-viewer\n\n> **Warning: A title**\n> body\n');
    expect(out).toContain('!!! warning "A title"');
    expect(out).toContain('    body');
  });

  it('maps an alias onto a type mkdocs.yml declares', () => {
    const { out } = render('# @uipath/ui-widgets-pdf-viewer\n\n> **Success:** done\n');
    expect(out).toContain('!!! check');
  });

  it('leaves an unknown label as a blockquote and warns', () => {
    const { out, warnings } = render('# @uipath/ui-widgets-pdf-viewer\n\n> **Bogus:** text\n');
    expect(out).toContain('> **Bogus:** text');
    expect(warnings.join()).toMatch(/unknown admonition type "Bogus"/);
  });
});

describe('stripIgnored', () => {
  it('drops the block and keeps the rest', () => {
    const out = stripIgnored(
      lines('before\n\n<!-- docs:ignore -->\n## Development\nnpm test\n<!-- /docs:ignore -->\n\nafter'),
      noop,
      thrower,
    );
    expect(out.join('\n')).not.toContain('Development');
    expect(out.join('\n')).toContain('before');
    expect(out.join('\n')).toContain('after');
  });

  it('fails on an unclosed block rather than silently truncating the page', () => {
    expect(() => stripIgnored(lines('a\n<!-- docs:ignore -->\nb\nc'), noop, thrower)).toThrow(
      /unclosed <!-- docs:ignore -->/,
    );
  });
});

describe('rewriteHeading', () => {
  it('swaps the package H1 for the nav title and states the package', () => {
    const out = rewriteHeading(lines('# @uipath/ui-widgets-pdf-viewer\n\nIntro.'), {
      slug: 'pdf-viewer',
      title: 'PDF Viewer',
      warn: noop,
    });
    expect(out.slice(0, 4)).toEqual(['# PDF Viewer', '', 'Package: `@uipath/ui-widgets-pdf-viewer`', '']);
  });

  it('keeps the package note in its own paragraph when no blank line follows the H1', () => {
    const out = rewriteHeading(lines('# @uipath/ui-widgets-pdf-viewer\nIntro.'), {
      slug: 'pdf-viewer',
      title: 'PDF Viewer',
      warn: noop,
    });
    expect(out).toEqual(['# PDF Viewer', '', 'Package: `@uipath/ui-widgets-pdf-viewer`', '', 'Intro.']);
  });

  it('warns when the H1 is not the package name', () => {
    const warnings: string[] = [];
    rewriteHeading(lines('# Some Widget\n'), {
      slug: 'pdf-viewer',
      title: 'PDF Viewer',
      warn: (m: string) => warnings.push(m),
    });
    expect(warnings.join()).toMatch(/expected the package name/);
  });
});

describe('links', () => {
  it('warns about a path that only resolves from the package directory', () => {
    const { warnings } = render('# @uipath/ui-widgets-pdf-viewer\n\nSee [docs](./docs/extra.md).\n');
    expect(warnings.join()).toMatch(/does not resolve on the docs site/);
  });

  it('warns about a relative image, not just a markdown link', () => {
    const { warnings } = render('# @uipath/ui-widgets-pdf-viewer\n\n![shot](./screenshots/preview.gif)\n');
    expect(warnings.join()).toMatch(/screenshots\/preview\.gif/);
  });

  it('does not warn about a sibling page in this same directory', () => {
    const { warnings } = render('# @uipath/ui-widgets-pdf-viewer\n\nSee [overview](index.md).\n');
    expect(warnings).toEqual([]);
  });

  it('rewrites an absolute site link to the source page so previews stay local', () => {
    const { out } = render(
      '# @uipath/ui-widgets-pdf-viewer\n\nSee [Auth](https://uipath.github.io/uipath-typescript/authentication/).\n',
    );
    expect(out).toContain('](../authentication.md)');
  });

  it('keeps the anchor when rewriting', () => {
    const { out } = render(
      '# @uipath/ui-widgets-pdf-viewer\n\n[Scopes](https://uipath.github.io/uipath-typescript/oauth-scopes/#conversational-agent)\n',
    );
    expect(out).toContain('](../oauth-scopes.md#conversational-agent)');
  });

  it('leaves an absolute link alone when no page matches, and warns', () => {
    const { out, warnings } = render(
      '# @uipath/ui-widgets-pdf-viewer\n\n[Gone](https://uipath.github.io/uipath-typescript/no/such/page/).\n',
    );
    expect(out).toContain('https://uipath.github.io/uipath-typescript/no/such/page/');
    expect(warnings.join()).toMatch(/matches no page under docs\//);
  });
});

describe('referencedPages', () => {
  const config = `
plugins:
  - llmstxt:
      sections:
        React Widgets:
          - react-widgets/index.md: React widgets overview
          - react-widgets/datatable.md: DataTable widget
nav:
  - React Widgets:
      - Overview: react-widgets/index.md
      - DataTable: react-widgets/datatable.md
`;

  it('maps each slug to its nav title and skips the locally authored index', () => {
    const pages = referencedPages(config);
    expect([...pages]).toEqual([['datatable', 'DataTable']]);
  });

  it('fetches a page named only in the llmstxt block, which would otherwise KeyError the build', () => {
    const pages = referencedPages(`${config}          - react-widgets/pdf-viewer.md: PDF Viewer widget\n`);
    expect(pages.has('pdf-viewer')).toBe(true);
  });

  it('rejects a nested slug, which is neither a package nor a safe path segment', () => {
    expect(() => referencedPages('      - Nested: react-widgets/group/child.md')).toThrow(
      /Widget pages are flat/,
    );
  });
});

describe('transform', () => {
  it('rejects an empty README rather than publishing a blank page', () => {
    expect(() => render('   \n\n')).toThrow(/README is empty/);
  });

  it('fails on an unclosed tabs block rather than swallowing the rest of the page', () => {
    expect(() =>
      render('# @uipath/ui-widgets-pdf-viewer\n\n<!-- tabs -->\n<!-- tab: One -->\nbody\n\n## Later section\n'),
    ).toThrow(/unclosed <!-- tabs -->/);
  });
});
