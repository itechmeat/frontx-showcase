#!/usr/bin/env node
// The `verify:ui` gate (architecture/DESIGN.md section 4.2.2): template-design-guardrails' design-verify runner over every page of every composed screen (published or not, as `npm run dev` serves them all), every block showcase route and the not-found screen, at 1440 and 390 pixels in the light theme, against `npm run dev` (it starts the dev server unless one already answers on port 5173). With the root baseline (scripts/design-verify-baseline.json) and `--fail-on-findings`, only a finding the baseline does not carry fails. Any runner flag passed after the command overrides these defaults; `--no-baseline` runs without the baseline, for the run the baseline is built from. Dark states are meaningful only under `npm run dev`, whose Studio overlay restores the stored theme; the production build always paints light.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { isEntryPoint } from './entry-point.mjs';
import { uncarriedFindings } from './design-verify-baseline.mjs';

/** A screen no template provides: the shell's not-found state, which must still carry the page's one level-one heading. */
export const NOT_FOUND_ROUTE = '/?screen=does-not-exist';

const NOT_ASSEMBLED = 'verify:ui: the site is not assembled; run npm run setup first (the routes come from the composed screens)';
/** The composed site-meta generator, whose page map gives the pages; read from the composed site, where its `@gears-frontx/routing` is installed. */
const SITE_META = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'site', 'src-app', 'verify_packages', 'site-meta', 'src', 'site.ts');
const BLOCKS = path.join('template-site-blocks', 'src-app', 'verify_packages', 'site-blocks', 'src', 'blocks');
const BASELINE = path.join('scripts', 'design-verify-baseline.json');
const REPORT_DIR = 'design-verify-report';
/** How long the gate waits for a cold `npm run dev:all` to answer: the same 15 minutes `npm run dev:smoke` allows, since a first start after a clean install optimizes every remote's dependencies and outlasts the runner's 2-minute default. */
const SERVER_TIMEOUT_MS = String(15 * 60 * 1000);

/**
 * The routes the gate sweeps: the pages of every composed screen in menu order (the order of seo-manifest.json), the unpublished screens included (the manifest leaves them out, `npm run dev` serves them), the showcase route of every block with a fixture (folder name in kebab case, sorted), and the not-found route.
 * @param {string} root - repository root
 * @returns {Promise<string[]>}
 */
// @cpt-dod:cpt-site-dod-dev-run-verify-ui:p3
// @cpt-algo:cpt-site-algo-dev-run-verify-ui-routes:p3
export async function verifyUiRoutes(root) {
  // @cpt-begin:cpt-site-algo-dev-run-verify-ui-routes:p3:inst-read-pages
  if (!fs.existsSync(SITE_META)) throw new Error(NOT_ASSEMBLED);
  const meta = await import(SITE_META);
  const paths = meta.sitePaths(path.join(root, 'site'), path.join(root, 'site.config.json'));
  if (!fs.existsSync(paths.screenDomain) || !fs.existsSync(paths.packages)) throw new Error(NOT_ASSEMBLED);
  const domain = meta.readScreenDomain(paths.screenDomain);
  // Every screen, unfiltered by unpublishedScreens; the origin only fills the canonical URLs, which the gate does not use.
  const map = meta.buildPageMap(meta.readJson(paths.config), 'http://localhost', domain.key, meta.readScreenExtensions(paths.packages, domain.id));
  const pages = meta.staticPages(map).map((page) => page.address);
  // @cpt-end:cpt-site-algo-dev-run-verify-ui-routes:p3:inst-read-pages
  // @cpt-begin:cpt-site-algo-dev-run-verify-ui-routes:p3:inst-showcase-routes
  const blocksDir = path.join(root, BLOCKS);
  const showcase = fs.existsSync(blocksDir)
    ? fs
        .readdirSync(blocksDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(blocksDir, entry.name, `${entry.name}.showcase.tsx`)))
        .map((entry) => entry.name)
        .sort()
        .map((folder) => `/?screen=blocks;route=${folder.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`)
    : [];
  // @cpt-end:cpt-site-algo-dev-run-verify-ui-routes:p3:inst-showcase-routes
  // @cpt-begin:cpt-site-algo-dev-run-verify-ui-routes:p3:inst-return-routes
  return [...new Set([...pages, ...showcase, NOT_FOUND_ROUTE])];
  // @cpt-end:cpt-site-algo-dev-run-verify-ui-routes:p3:inst-return-routes
}

/**
 * The runner's arguments: the gate's defaults, then the caller's flags, which win because the runner keeps the last value of a flag.
 * @param {{ root: string, routes: string[], extra: string[], baseline?: boolean }} options
 * @returns {string[]}
 */
// @cpt-algo:cpt-site-algo-dev-run-verify-ui-args:p3
export function runnerArgs({ root, routes, extra, baseline = true }) {
  // @cpt-begin:cpt-site-algo-dev-run-verify-ui-args:p3:inst-defaults
  const args = [
    '--url', 'http://localhost:5173/',
    '--start-server', 'npm run dev:all',
    '--server-cwd', path.join(root, 'site'),
    '--server-timeout-ms', SERVER_TIMEOUT_MS,
    '--routes', routes.join(','),
    '--widths', '1440,390',
    '--themes', 'light',
    '--out', path.join(root, REPORT_DIR),
  ];
  // @cpt-end:cpt-site-algo-dev-run-verify-ui-args:p3:inst-defaults
  // @cpt-begin:cpt-site-algo-dev-run-verify-ui-args:p3:inst-gate
  if (baseline) args.push('--baseline', path.join(root, BASELINE), '--fail-on-findings');
  return [...args, ...extra];
  // @cpt-end:cpt-site-algo-dev-run-verify-ui-args:p3:inst-gate
}

// @cpt-flow:cpt-site-flow-dev-run-verify-ui:p3
if (isEntryPoint(import.meta.url)) {
  // @cpt-begin:cpt-site-flow-dev-run-verify-ui:p3:inst-collect-routes
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const argv = process.argv.slice(2);
  const baseline = !argv.includes('--no-baseline');
  const extra = argv.filter((arg) => arg !== '--no-baseline' && arg !== '--print-routes');
  let routes;
  try {
    routes = await verifyUiRoutes(root);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
  if (argv.includes('--print-routes')) {
    console.log(routes.join('\n'));
    process.exit(0);
  }
  if (baseline && !fs.existsSync(path.join(root, BASELINE))) {
    console.error(`verify:ui: ${BASELINE} is missing; build it with npm run verify:ui:baseline -- build <findings.json> from a run with --no-baseline`);
    process.exit(2);
  }
  // @cpt-end:cpt-site-flow-dev-run-verify-ui:p3:inst-collect-routes
  // @cpt-begin:cpt-site-flow-dev-run-verify-ui:p3:inst-run-runner
  console.log(`verify:ui: ${routes.length} routes at 1440 and 390 pixels${baseline ? ', new findings against the baseline fail' : ', no baseline'}`);
  const run = spawnSync('npm', ['run', 'verify:ui', '--workspace=@gears-frontx/design-verify', '--', ...runnerArgs({ root, routes, extra, baseline })], { cwd: path.join(root, 'site'), stdio: 'inherit' });
  // @cpt-end:cpt-site-flow-dev-run-verify-ui:p3:inst-run-runner
  // @cpt-begin:cpt-site-flow-dev-run-verify-ui:p3:inst-recheck
  const reportPath = path.join(root, REPORT_DIR, 'findings.json');
  if (baseline && run.status === 1 && fs.existsSync(reportPath)) {
    const uncarried = uncarriedFindings(JSON.parse(fs.readFileSync(path.join(root, BASELINE), 'utf8')), JSON.parse(fs.readFileSync(reportPath, 'utf8')));
    if (uncarried.length === 0) {
      console.log('verify:ui: every finding the runner calls new is a baseline finding whose generated React id moved; nothing is new');
      process.exit(0);
    }
    for (const finding of uncarried) console.error(`verify:ui: new: ${finding.route} ${finding.theme} ${finding.width} ${finding.id} ${finding.target}`);
  }
  process.exit(run.status ?? 2);
  // @cpt-end:cpt-site-flow-dev-run-verify-ui:p3:inst-recheck
}
