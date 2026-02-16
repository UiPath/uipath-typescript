/**
 * Post-build script for docs generation.
 *
 * Copies TypeDoc-generated interface pages into their mkdocs section
 * directories as index.md, rewrites relative links so they resolve
 * from the new location, and prepends a header (heading or frontmatter).
 *
 * Run automatically via: npm run docs:api
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');

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

for (const { source, dest, header, removeSource } of sections) {
  const sourcePath = path.join(DOCS_DIR, source);

  if (!fs.existsSync(sourcePath)) {
    console.warn(`  skip  ${source} (not found)`);
    continue;
  }

  const sourceDir = path.dirname(source);
  const destDir = path.dirname(dest);

  let content = fs.readFileSync(sourcePath, 'utf8');

  // Rewrite relative markdown links so they resolve from the new location
  content = content.replace(
    /\]\(([^)]+\.md(?:#[^)]*)?)\)/g,
    (_match, link) => {
      if (link.startsWith('/') || link.startsWith('http')) return _match;

      const [linkPath, anchor] = link.split('#');
      const resolved = path.join(sourceDir, linkPath);
      const rewritten = path.relative(destDir, resolved);

      return `](${anchor ? `${rewritten}#${anchor}` : rewritten})`;
    },
  );

  content = `${header}${content}`;

  const destPath = path.join(DOCS_DIR, dest);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, content);

  if (removeSource) {
    fs.unlinkSync(sourcePath);
    console.log(`  ${dest} ← ${source} (moved)`);
  } else {
    console.log(`  ${dest} ← ${source}`);
  }
}
