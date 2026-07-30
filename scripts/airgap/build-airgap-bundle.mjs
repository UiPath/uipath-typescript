#!/usr/bin/env node

/**
 * Build an air-gapped bundle: the exact published npm tarballs for
 * @uipath/uipath-typescript and @uipath/coded-action-app plus every
 * transitive runtime dependency, with a manifest and offline-install README.
 *
 * npm resolves the dependency closure itself (throwaway install + lockfile
 * walk), so nothing is hand-listed, and every tarball is fetched from the
 * public registry via `npm pack`, so the bundle contains the published bits.
 *
 * Env: OUT_DIR (required), SDK_VERSION, CAA_VERSION (both default: latest)
 */

import { execFileSync } from "node:child_process";
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const REGISTRY = "https://registry.npmjs.org/";
// Exact semver (prerelease allowed) or "latest" — validated before reaching
// any npm command line.
const SAFE_VERSION = /^(latest|\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?)$/;
const NM = "node_modules/";
const ROOTS = [
    { name: "@uipath/uipath-typescript", version: process.env.SDK_VERSION || "latest" },
    { name: "@uipath/coded-action-app", version: process.env.CAA_VERSION || "latest" },
];

if (!process.env.OUT_DIR) throw new Error("OUT_DIR env var is required");
// npm pack runs from a temp cwd, so OUT_DIR must be absolute for fs calls and
// --pack-destination to agree on where the bundle lives.
const OUT_DIR = resolve(process.env.OUT_DIR);
for (const { name, version } of ROOTS) {
    if (!SAFE_VERSION.test(version)) {
        throw new Error(`Invalid version for ${name}: "${version}"`);
    }
}

const log = (m) => console.log(`[airgap-bundle] ${m}`);

// Temp cwd keeps the repo .npmrc out of play; the scoped override beats any
// user-level @uipath:registry mapping that would reroute the @uipath tarballs.
const npm = (args, cwd) =>
    execFileSync(
        "npm",
        [...args, `--registry=${REGISTRY}`, `--@uipath:registry=${REGISTRY}`],
        { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "inherit"] },
    ).trim();

// Wipe OUT_DIR only when it is clearly ours: missing, empty, or a previous
// bundle (has manifest.json).
if (existsSync(OUT_DIR)) {
    const entries = readdirSync(OUT_DIR);
    if (entries.length > 0 && !entries.includes("manifest.json")) {
        throw new Error(`OUT_DIR ${OUT_DIR} is not a previous bundle — refusing to wipe it`);
    }
    rmSync(OUT_DIR, { recursive: true, force: true });
}
mkdirSync(OUT_DIR, { recursive: true });

const workDir = mkdtempSync(join(tmpdir(), "airgap-bundle-"));
try {
    const specs = ROOTS.map((r) => `${r.name}@${r.version}`);
    log(`resolving dependency closure of: ${specs.join(", ")}`);
    writeFileSync(join(workDir, "package.json"), '{"name":"airgap-resolve","private":true}\n');
    npm(["install", ...specs, "--ignore-scripts", "--no-audit", "--no-fund"], workDir);

    const lock = JSON.parse(readFileSync(join(workDir, "package-lock.json"), "utf-8"));
    const closure = new Map();
    for (const [path, entry] of Object.entries(lock.packages)) {
        if (path === "") continue; // the throwaway root project
        // Name = segment after the last node_modules/ (covers nested dedup
        // copies); entry.name (set for npm-aliased deps) wins over the alias.
        const name = entry.name ?? path.slice(path.lastIndexOf(NM) + NM.length);
        closure.set(`${name}@${entry.version}`, { name, version: entry.version });
    }
    log(`closure resolved: ${closure.size} packages`);

    const packages = [...closure.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((pkg) => {
            // npm pack prints the generated filename as its last stdout line.
            // --ignore-scripts is a no-op for registry specs, kept so the
            // no-code-execution invariant stays explicit.
            const tarball = npm(
                ["pack", `${pkg.name}@${pkg.version}`, "--pack-destination", OUT_DIR, "--ignore-scripts"],
                workDir,
            )
                .split("\n")
                .pop()
                .trim();
            log(`  packed ${pkg.name}@${pkg.version} -> ${tarball}`);
            return { ...pkg, tarball };
        });

    const roots = ROOTS.map(({ name }) => ({
        name,
        version: packages.find((pkg) => pkg.name === name).version,
    }));
    writeFileSync(
        join(OUT_DIR, "manifest.json"),
        `${JSON.stringify(
            { generatedAt: new Date().toISOString(), registry: REGISTRY, roots, packages },
            null,
            2,
        )}\n`,
    );
    writeFileSync(
        join(OUT_DIR, "README.md"),
        `# UiPath TypeScript SDK — air-gapped bundle

Published npm tarballs for:

${roots.map((r) => `- \`${r.name}@${r.version}\``).join("\n")}

plus every transitive runtime dependency (${packages.length} tarballs total — see
\`manifest.json\`). All tarballs are the exact bits published to registry.npmjs.org.

## Installing without registry access

**Option A (recommended): publish into your internal npm registry**
(Artifactory, Nexus, Verdaccio, ...), then install normally. Make sure your
\`.npmrc\` routes the \`@uipath\` scope to that registry:

\`\`\`bash
for t in *.tgz; do npm publish "./$t" --registry=https://<your-internal-registry>/; done
\`\`\`

**Option B: install the tarballs directly, fully offline** — seed npm's cache,
then install every tarball in one command with \`--offline\` so npm never
queries a registry (without \`--offline\` npm still fetches dependency metadata
and hangs when the registry is blocked):

\`\`\`bash
for t in *.tgz; do npm cache add "./$t"; done
npm install ./*.tgz --offline
\`\`\`

> Third-party toolchain packages (vite, react, tailwind, ...) are not included —
> those come from your internal registry mirror.
`,
    );
    log(`bundle written to ${OUT_DIR} (${packages.length} tarballs)`);
} finally {
    rmSync(workDir, { recursive: true, force: true });
}
