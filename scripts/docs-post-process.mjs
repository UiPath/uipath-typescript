/**
 * Post-build script for docs generation.
 *
 * Copies TypeDoc-generated interface pages into their mkdocs section
 * directories as index.md, rewrites relative links so they resolve
 * from the new location, and prepends a header (heading or frontmatter).
 *
 * Run automatically via: npm run docs:api
 */

import { mkdirSync, readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join, dirname, relative } from 'path';

const DOCS_DIR = join(process.cwd(), 'docs');

/**
 * Each entry moves/copies a source file to a target path, prepending a header.
 * To add a new post-processing step, just add another entry here.
 */
const sections = [
  {
    source: 'api/interfaces/EntityServiceModel.md',
    dest: 'api/interfaces/entity/index.md',
    header: '---\ntitle: Entities\n---\n',
    removeSource: true,
  },
  {
    source: 'api/interfaces/ConversationalAgentServiceModel.md',
    dest: 'conversational-agent/index.md',
    header: '# Conversational Agent\n\n',
  },
  {
    source: 'api/interfaces/ConversationServiceModel.md',
    dest: 'conversations/index.md',
    header: '# Conversations\n\n',
  },
];

let processed = 0;

for (const { source, dest, header, removeSource } of sections) {
  const sourcePath = join(DOCS_DIR, source);

  if (!existsSync(sourcePath)) {
    console.warn(`  skip  ${source} (not found)`);
    continue;
  }

  const sourceDir = dirname(source);
  const destDir = dirname(dest);

  let content = readFileSync(sourcePath, 'utf-8');

  // Rewrite relative markdown links so they resolve from the new location
  content = content.replace(
    /\]\(([^)]+\.md(?:#[^)]*)?)\)/g,
    (_match, link) => {
      if (link.startsWith('/') || link.startsWith('http')) return _match;

      const [linkPath, anchor] = link.split('#');
      const resolved = join(sourceDir, linkPath);
      const rewritten = relative(destDir, resolved);

      return `](${anchor ? `${rewritten}#${anchor}` : rewritten})`;
    },
  );

  content = `${header}${content}`;

  const destPath = join(DOCS_DIR, dest);
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, content, 'utf-8');

  if (removeSource) {
    unlinkSync(sourcePath);
    console.log(`  ${dest} ← ${source} (moved)`);
  } else {
    console.log(`  ${dest} ← ${source}`);
  }

  processed++;
}

console.log(`docs:post-process complete (${processed}/${sections.length} transforms applied)`);
