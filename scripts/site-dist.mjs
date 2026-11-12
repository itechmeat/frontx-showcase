#!/usr/bin/env node
// The production layout of site/dist (architecture/DESIGN.md section 3.6, "Compose and build the site"), run after the host build: every remote the manifest aggregate carries is copied from its package's dist/ into dist/mfe/<package directory>/, and the aggregate's publicPath of each remote becomes that folder relative to the aggregate (`mfe/<package directory>/`). The host resolves it against the address it fetched the aggregate from (src-app/app/mfe/bootstrap.ts), so the same dist works at the root of an origin or under any sub-path, and no build-time origin is written anywhere. The dev aggregate in site/public/ keeps the remotes' own preview servers; only the copy in dist/ is rewritten.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { isEntryPoint } from './entry-point.mjs';
import { loadPublishing, publishedAggregate } from './site-publish.mjs';

/** The aggregate the shell reads at bootstrap, copied by the host build from site/public/. */
export const AGGREGATE_FILE = 'generated-mfe-manifests.json';
/** The folder of dist/ that holds one sub-folder per remote. */
export const MFE_DIR = 'mfe';
/** The enriched manifest each remote's build writes into its dist/; its manifest id ties an aggregate config to its package. */
const ENRICHED_MANIFEST = 'mfe-manifest.json';
/** What a remote's build writes that the host never reads: the standalone preview page, the federation type bundle, the build statistics, and the enriched manifest, whose content the aggregate carries and whose remoteEntry is the dev preview address. */
const LEFT_OUT = new Set(['index.html', 'mf-stats.json', '@mf-types', '@mf-types.zip', '@mf-types.d.ts', ENRICHED_MANIFEST]);
/** The composition directory's entries that are not packages: the shared source folder and dot entries. */
const NOT_A_PACKAGE = (name) => name === 'shared' || name.startsWith('.');

/**
 * The publicPath of a remote in the production aggregate: its folder, relative to the aggregate file.
 * @param {string} packageDir - the package's directory name under src-app/mfe_packages/
 */
// @cpt-algo:cpt-site-algo-production-build-layout-resolve-addresses:p2
export function remotePublicPath(packageDir) {
  // @cpt-begin:cpt-site-algo-production-build-layout-resolve-addresses:p2:inst-relative-public-path
  return `${MFE_DIR}/${packageDir}/`;
  // @cpt-end:cpt-site-algo-production-build-layout-resolve-addresses:p2:inst-relative-public-path
}

/**
 * Built packages by the manifest id their enriched manifest carries.
 * @param {string} packagesDir - site/src-app/mfe_packages
 * @returns {Map<string, string>} manifest id -> package directory name
 */
// @cpt-flow:cpt-site-flow-production-build-layout-lay-out-dist:p2
function builtPackagesById(packagesDir) {
  // @cpt-begin:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-index-built
  const byId = new Map();
  if (!fs.existsSync(packagesDir)) return byId;
  for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || NOT_A_PACKAGE(entry.name)) continue;
    const enriched = path.join(packagesDir, entry.name, 'dist', ENRICHED_MANIFEST);
    if (!fs.existsSync(enriched)) continue;
    const id = JSON.parse(fs.readFileSync(enriched, 'utf8'))?.manifest?.id;
    if (typeof id === 'string') byId.set(id, entry.name);
  }
  return byId;
  // @cpt-end:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-index-built
}

/** Copies a remote's dist/ without the files the host never reads. */
function copyRemote(from, to) {
  // @cpt-begin:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-copy-and-rewrite
  fs.cpSync(from, to, { recursive: true, filter: (source) => source === from || !LEFT_OUT.has(path.relative(from, source).split(path.sep)[0]) });
  // @cpt-end:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-copy-and-rewrite
}

/** Sets the publicPath of a manifest object; an entry that references its manifest by id has none to set. */
function setPublicPath(manifest, publicPath) {
  // @cpt-begin:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-copy-and-rewrite
  if (manifest && typeof manifest === 'object' && manifest.metaData) manifest.metaData.publicPath = publicPath;
  // @cpt-end:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-copy-and-rewrite
}

/**
 * Lays out the remotes in site/dist and rewrites the aggregate there, without the screens the site does not publish (`publishedAggregate`). Fails, before writing anything, when dist/ has no aggregate or when an aggregate config names a manifest no built package carries.
 * @param {string} siteDir - the site directory (`site/`)
 * @param {string[]} [hiddenScreens] - the extension ids of the unpublished screens
 * @returns {string[]} the package directories laid out, in aggregate order
 */
// @cpt-dod:cpt-site-dod-production-build-layout-dist-layout:p2
export function layoutDist(siteDir, hiddenScreens = []) {
  // @cpt-begin:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-if-no-aggregate
  const distDir = path.join(siteDir, 'dist');
  const aggregateFile = path.join(distDir, AGGREGATE_FILE);
  if (!fs.existsSync(aggregateFile)) throw new Error(`site-dist: ${path.relative(siteDir, aggregateFile)} does not exist; run the site build first (it copies the aggregate from public/)`);
  // @cpt-end:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-if-no-aggregate
  // @cpt-begin:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-index-built
  // @cpt-begin:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-prune-unpublished
  const { configs } = publishedAggregate(JSON.parse(fs.readFileSync(aggregateFile, 'utf8')), hiddenScreens);
  // @cpt-end:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-prune-unpublished
  const packagesDir = path.join(siteDir, 'src-app', 'mfe_packages');
  const byId = builtPackagesById(packagesDir);
  // @cpt-end:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-index-built
  // @cpt-begin:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-if-unknown-manifest
  const layout = configs.map((config) => {
    const id = config?.manifest?.id;
    const packageDir = byId.get(id);
    if (!packageDir) throw new Error(`site-dist: the aggregate carries manifest ${id}, which no built package under src-app/mfe_packages/*/dist/${ENRICHED_MANIFEST} declares; rebuild the remotes`);
    return { config, packageDir };
  });
  // @cpt-end:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-if-unknown-manifest
  // @cpt-begin:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-clear-layout
  const mfeDir = path.join(distDir, MFE_DIR);
  fs.rmSync(mfeDir, { recursive: true, force: true });
  // @cpt-end:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-clear-layout
  // @cpt-begin:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-copy-and-rewrite
  for (const { config, packageDir } of layout) {
    copyRemote(path.join(packagesDir, packageDir, 'dist'), path.join(mfeDir, packageDir));
    const publicPath = remotePublicPath(packageDir);
    setPublicPath(config.manifest, publicPath);
    for (const entry of config.entries ?? []) setPublicPath(entry.manifest, publicPath);
  }
  // @cpt-end:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-copy-and-rewrite
  // @cpt-begin:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-write-aggregate
  fs.writeFileSync(aggregateFile, `${JSON.stringify(configs, null, 2)}\n`);
  return layout.map(({ packageDir }) => packageDir);
  // @cpt-end:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-write-aggregate
}

if (isEntryPoint(import.meta.url)) {
  // @cpt-begin:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-run-layout
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  try {
    const laidOut = layoutDist(path.join(root, 'site'), loadPublishing(root).publishing.hiddenScreens);
    // @cpt-end:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-run-layout
    // @cpt-begin:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-report
    console.log(`site-dist: ${laidOut.length} remote(s) in site/dist/${MFE_DIR}/: ${laidOut.join(', ')}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
  // @cpt-end:cpt-site-flow-production-build-layout-lay-out-dist:p2:inst-report
}
