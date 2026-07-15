#!/usr/bin/env node
/**
 * Regenerate gallery.config.json by scanning the repo's samples/ folder.
 *
 *   node gallery/scripts/generate-config.mjs
 *
 * What it does, for every sample app it finds:
 *   - title       first "# " heading in the app's README.md
 *   - description first non-empty paragraph after the heading
 *   - preview     screenshots/*.gif if present, else null (a poster is shown)
 *   - framework   inferred from package.json deps (Angular vs React)
 *   - category    the top-level folder under samples/ (mapped to a label)
 *   - tags        preserved from the EXISTING config when the id matches,
 *                 so hand-curated tags are never clobbered by a rescan.
 *
 * Curated fields (category labels/accents, tags, description overrides) live in
 * gallery.config.json — this script fills in everything mechanical and leaves
 * your edits intact. Review the diff before committing.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");          // gallery/scripts -> repo root
const SAMPLES = join(REPO_ROOT, "samples");
const CONFIG = join(HERE, "..", "gallery.config.json");

const CATEGORY_LABELS = {
  "coded-action-apps": "action-apps",
  "dashboards": "dashboards",
};
const DEFAULT_CATEGORIES = [
  { id: "action-apps", label: "Action Apps", accent: ["#FA4616", "#FF8A4C"] },
  { id: "agents", label: "Agents", accent: ["#7C5CFC", "#A78BFA"] },
  { id: "dashboards", label: "Dashboards", accent: ["#0EA5A4", "#2DD4C4"] },
  { id: "data-fabric", label: "Data Fabric", accent: ["#2563EB", "#5B8DEF"] },
  { id: "document", label: "Document / HITL", accent: ["#0F9D6B", "#34D399"] },
  { id: "process", label: "Process Orchestration", accent: ["#DB2777", "#F472B6"] },
];

function isDir(p) { try { return statSync(p).isDirectory(); } catch { return false; } }
function firstGif(dir) {
  const shots = join(dir, "screenshots");
  if (!isDir(shots)) return null;
  const gif = readdirSync(shots).find((f) => f.toLowerCase().endsWith(".gif"));
  return gif ? relative(REPO_ROOT, join(shots, gif)).split("\\").join("/") : null;
}
function readReadme(dir) {
  const p = join(dir, "README.md");
  if (!existsSync(p)) return { title: null, description: null };
  const lines = readFileSync(p, "utf8").split("\n");
  let title = null, description = null;
  for (const line of lines) {
    const t = line.trim();
    if (!title && t.startsWith("# ")) { title = t.slice(2).trim(); continue; }
    if (title && !description && t && !t.startsWith("#") && !t.startsWith(">") && t !== "---") {
      description = t.replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
      break;
    }
  }
  return { title, description };
}
function framework(dir) {
  const p = join(dir, "package.json");
  if (!existsSync(p)) return "React";
  try {
    const pkg = JSON.parse(readFileSync(p, "utf8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (Object.keys(deps).some((d) => d.startsWith("@angular/"))) return "Angular";
    if (deps.vue) return "Vue";
    return "React";
  } catch { return "React"; }
}
function categorize(topFolder) {
  if (CATEGORY_LABELS[topFolder]) return CATEGORY_LABELS[topFolder];
  if (topFolder.includes("data-fabric")) return "data-fabric";
  if (topFolder.includes("document")) return "document";
  if (topFolder.includes("process")) return "process";
  if (topFolder.includes("agent")) return "agents";
  return "action-apps";
}
// A leaf app is a folder that has a package.json (or a README + screenshots)
function isApp(dir) {
  return existsSync(join(dir, "package.json")) || existsSync(join(dir, "action-schema.json"));
}
function walk(dir, top) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    if (!isDir(full)) continue;
    if (isApp(full)) out.push({ dir: full, top: top || name });
    else out.push(...walk(full, top || name));
  }
  return out;
}

const prev = existsSync(CONFIG) ? JSON.parse(readFileSync(CONFIG, "utf8")) : {};
const prevById = Object.fromEntries((prev.apps || []).map((a) => [a.id, a]));

const apps = walk(SAMPLES, null).map(({ dir, top }) => {
  const id = relative(SAMPLES, dir).split("\\").join("/").split("/").join("__").replace(/[^\w-]/g, "-");
  const shortId = relative(SAMPLES, dir).split("/").pop();
  const { title, description } = readReadme(dir);
  const existing = prevById[shortId] || prevById[id] || {};
  return {
    id: existing.id || shortId,
    title: existing.title || title || shortId,
    description: existing.description || description || "",
    category: existing.category || categorize(top),
    framework: framework(dir),
    tags: existing.tags || [],
    path: relative(REPO_ROOT, dir).split("\\").join("/"),
    preview: firstGif(dir),
  };
}).sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));

const config = {
  title: prev.title || "UiPath TypeScript SDK — Sample Gallery",
  tagline: prev.tagline || "Browse, preview, and clone the official @uipath/uipath-typescript sample apps.",
  repo: prev.repo || "https://github.com/UiPath/uipath-typescript",
  assetsBaseUrl: prev.assetsBaseUrl || "https://raw.githubusercontent.com/UiPath/uipath-typescript/main/",
  categories: prev.categories || DEFAULT_CATEGORIES,
  apps,
};

writeFileSync(CONFIG, JSON.stringify(config, null, 2) + "\n");
console.log(`Wrote ${apps.length} apps to ${relative(REPO_ROOT, CONFIG)}`);
for (const a of apps) console.log(`  - [${a.category}] ${a.title}${a.preview ? "" : "  (poster — no gif)"}`);
