import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const docsApiDir = join(process.cwd(), 'docs', 'api');

/**
 * Each entry moves a source file to a target path, prepending frontmatter.
 * To add a new post-processing step, just add another entry here.
 */
const transforms = [
  {
    source: join(docsApiDir, 'interfaces', 'EntityServiceModel.md'),
    target: join(docsApiDir, 'interfaces', 'entity', 'index.md'),
    frontmatter: { title: 'Entities' },
  },
];

let processed = 0;

for (const { source, target, frontmatter } of transforms) {
  if (!existsSync(source)) {
    console.warn(`Skipping: source not found – ${source}`);
    continue;
  }

  mkdirSync(dirname(target), { recursive: true });

  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  const content = `---\n${yaml}\n---\n\n` + readFileSync(source, 'utf-8');

  writeFileSync(target, content, 'utf-8');
  rmSync(source);
  processed++;
}

console.log(`docs:post-process complete (${processed}/${transforms.length} transforms applied)`);
