#!/usr/bin/env node

/**
 * Build an air-gapped bundle of the UiPath TypeScript SDKs: the exact
 * published npm tarballs for @uipath/uipath-typescript and
 * @uipath/coded-action-app plus every transitive runtime dependency
 * (@uipath/core-telemetry, socket.io-client chain, ...), with a manifest and
 * an offline-install README.
 *
 * The dependency closure is resolved by npm itself — a throwaway project is
 * installed with both roots and the lockfile is walked — so nothing is
 * hand-listed and the bundle can never miss a newly added dependency.
 * Every tarball is then fetched from the public registry via `npm pack`,
 * so the bundle contains the published bits, not a local rebuild.
 *
 * Env:
 *   OUT_DIR      output directory for tarballs + manifest + README (required)
 *   SDK_VERSION  version of @uipath/uipath-typescript (default: latest)
 *   CAA_VERSION  version of @uipath/coded-action-app (default: latest)
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
import { homedir, tmpdir } from "node:os";
import { join, parse, resolve } from "node:path";

const REGISTRY = "https://registry.npmjs.org/";

// Resolved eagerly: npm commands below run from a temp cwd, so a relative
// OUT_DIR would otherwise mean different directories to fs calls and to
// `npm pack --pack-destination`.
const OUT_DIR = process.env.OUT_DIR ? resolve(process.env.OUT_DIR) : undefined;
if (!OUT_DIR) {
    throw new Error("OUT_DIR env var is required (the bundle output directory)");
}

// Exact semver (prerelease allowed) or the literal "latest". Validated before
// the value reaches any npm command line.
const SAFE_VERSION = /^(latest|\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?)$/;

const ROOTS = [
    {
        name: "@uipath/uipath-typescript",
        version: process.env.SDK_VERSION || "latest",
    },
    {
        name: "@uipath/coded-action-app",
        version: process.env.CAA_VERSION || "latest",
    },
];
for (const root of ROOTS) {
    if (!SAFE_VERSION.test(root.version)) {
        throw new Error(`Invalid version for ${root.name}: "${root.version}"`);
    }
}

const log = (message) => console.log(`[airgap-bundle] ${message}`);

/**
 * Wiping OUT_DIR is only safe when it is clearly ours: missing, empty, or a
 * previous bundle (has manifest.json). Anything else — including obviously
 * catastrophic paths — is refused rather than deleted.
 */
function prepareOutDir() {
    if (OUT_DIR === parse(OUT_DIR).root || OUT_DIR === homedir()) {
        throw new Error(`Refusing to use OUT_DIR=${OUT_DIR}`);
    }
    if (existsSync(OUT_DIR)) {
        const entries = readdirSync(OUT_DIR);
        if (entries.length > 0 && !entries.includes("manifest.json")) {
            throw new Error(
                `OUT_DIR ${OUT_DIR} exists and is not a previous bundle — refusing to wipe it`,
            );
        }
        rmSync(OUT_DIR, { recursive: true, force: true });
    }
    mkdirSync(OUT_DIR, { recursive: true });
}

// All npm calls run from a temp cwd (never the repo — its .npmrc routes
// @uipath to GitHub Packages). The scoped override is still required because
// a user-level ~/.npmrc @uipath:registry mapping beats the generic --registry
// flag and would silently source the @uipath tarballs from the wrong registry.
function npm(args, cwd) {
    return execFileSync(
        "npm",
        [...args, `--registry=${REGISTRY}`, `--@uipath:registry=${REGISTRY}`],
        {
            cwd,
            encoding: "utf-8",
            stdio: ["ignore", "pipe", "inherit"],
        },
    ).trim();
}

/**
 * Resolve the full dependency closure of the root packages: install them into
 * a throwaway project (scripts disabled — nothing in the closure needs to
 * execute at resolve time) and read the exact name@version set from the
 * lockfile. Returns [{name, version}] sorted by name, roots included.
 */
function resolveClosure(workDir) {
    const projectDir = join(workDir, "resolve");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(
        join(projectDir, "package.json"),
        `${JSON.stringify({ name: "airgap-resolve", private: true }, null, 2)}\n`,
    );

    const specs = ROOTS.map((root) => `${root.name}@${root.version}`);
    log(`resolving dependency closure of: ${specs.join(", ")}`);
    // Peer and optional deps stay in so the bundle covers everything npm
    // would install for a connected user (--omit=dev is belt-and-braces; it
    // only affects the throwaway root, which has no dev deps).
    npm(
        ["install", ...specs, "--ignore-scripts", "--no-audit", "--no-fund", "--omit=dev"],
        projectDir,
    );

    const lock = JSON.parse(
        readFileSync(join(projectDir, "package-lock.json"), "utf-8"),
    );
    const seen = new Map();
    for (const [path, entry] of Object.entries(lock.packages)) {
        if (path === "") continue; // the throwaway root project
        if (!path.includes("node_modules/")) {
            throw new Error(`Unexpected non-registry lockfile entry: ${path}`);
        }
        // Every entry must have come from the registry — a git/file/link
        // resolution would make `npm pack name@version` fetch a different
        // artifact than what the closure actually resolved.
        if (entry.resolved && !entry.resolved.startsWith(REGISTRY)) {
            throw new Error(
                `${path} resolved outside ${REGISTRY}: ${entry.resolved}`,
            );
        }
        // Lockfile keys are node_modules paths; the package name is everything
        // after the last "node_modules/" (covers nested dedup copies).
        // entry.name (set for npm-aliased deps) wins over the path-derived
        // alias so `npm pack` fetches the real package.
        const name =
            entry.name ??
            path.slice(path.lastIndexOf("node_modules/") + "node_modules/".length);
        if (!entry.version) {
            throw new Error(`Lockfile entry for ${name} has no version`);
        }
        seen.set(`${name}@${entry.version}`, { name, version: entry.version });
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Fetch the published tarball for name@version into OUT_DIR via npm pack. */
function packPublished(pkg, workDir) {
    // --ignore-scripts is a no-op for registry specs today (npm only runs
    // lifecycle scripts when packing local/git specs) but keeps the
    // no-code-execution invariant explicit.
    const output = npm(
        ["pack", `${pkg.name}@${pkg.version}`, "--pack-destination", OUT_DIR, "--ignore-scripts"],
        workDir,
    );
    // npm pack prints the generated filename as its last stdout line.
    const tarball = output.split("\n").pop().trim();
    if (!tarball || !existsSync(join(OUT_DIR, tarball))) {
        throw new Error(`npm pack produced no tarball for ${pkg.name}@${pkg.version}`);
    }
    log(`  packed ${pkg.name}@${pkg.version} -> ${tarball}`);
    return tarball;
}

function writeReadme(packages, roots) {
    const rootLines = roots
        .map((root) => `- \`${root.name}@${root.resolvedVersion}\``)
        .join("\n");
    const readme = `# UiPath TypeScript SDK — air-gapped bundle

Published npm tarballs for:

${rootLines}

plus every transitive runtime dependency (${packages.length} tarballs total —
see \`manifest.json\`). All tarballs are the exact bits published to
registry.npmjs.org.

## Installing without registry access

**Option A (recommended): publish into your internal npm registry**
(Artifactory, Nexus, Verdaccio, ...), then install normally:

\`\`\`bash
for t in *.tgz; do
  npm publish "./$t" --registry=https://<your-internal-registry>/
done
\`\`\`

Make sure your project's \`.npmrc\` routes the \`@uipath\` scope to that
registry and does not override it per command.

**Option B: install the tarballs directly, fully offline** — seed npm's
cache from the tarballs, then install every tarball in one command with
\`--offline\` so npm never queries a registry:

\`\`\`bash
for t in *.tgz; do npm cache add "./$t"; done
npm install ./*.tgz --offline
\`\`\`

Both steps are required: without \`--offline\` npm still fetches dependency
metadata from the registry (and hangs when it is blocked), and \`--offline\`
resolves only from the cache seeded in the first step.

Option A is the robust path: it keeps normal \`npm install\` semantics for
every project. Option B pins the whole closure as direct dependencies of one
project and must be repeated per project.

> Note: this bundle covers only the UiPath SDK packages and their
> dependencies. Third-party toolchain packages (vite, react, tailwind, ...)
> are not included — they come from your internal registry mirror.
`;
    writeFileSync(join(OUT_DIR, "README.md"), readme);
}

function main() {
    prepareOutDir();
    const workDir = mkdtempSync(join(tmpdir(), "airgap-bundle-"));

    try {
        const closure = resolveClosure(workDir);
        log(`closure resolved: ${closure.length} packages`);

        const packages = closure.map((pkg) => ({
            ...pkg,
            tarball: packPublished(pkg, workDir),
        }));

        const roots = ROOTS.map((root) => ({
            ...root,
            resolvedVersion: closure.find((pkg) => pkg.name === root.name)?.version,
        }));
        for (const root of roots) {
            if (!root.resolvedVersion) {
                throw new Error(`Root package ${root.name} missing from closure`);
            }
        }

        const manifest = {
            generatedAt: new Date().toISOString(),
            registry: REGISTRY,
            roots: roots.map(({ name, resolvedVersion }) => ({
                name,
                version: resolvedVersion,
            })),
            packageCount: packages.length,
            packages,
        };
        writeFileSync(
            join(OUT_DIR, "manifest.json"),
            `${JSON.stringify(manifest, null, 2)}\n`,
        );
        writeReadme(packages, roots);

        log(`bundle written to ${OUT_DIR} (${packages.length} tarballs)`);
    } finally {
        rmSync(workDir, { recursive: true, force: true });
    }
}

main();
