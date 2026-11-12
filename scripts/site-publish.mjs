#!/usr/bin/env node
// What the production build publishes (architecture/DESIGN.md section 3.6, "Compose and build the site"). `site.config.json` lists the screens the site leaves out of its build (`unpublishedScreens`, route tokens) and the outline entries it hides (`hiddenEntries`); without them everything is published. Composition stays whole, so `npm run dev`, the tests and the UI gate see every screen: only the production build leaves screens out.
//   node scripts/site-publish.mjs build   runs the site build (`npm run build --prefix site`) with the publishing choices in the build variables the screens read (VITE_SITE_HIDDEN_SCREENS, VITE_SITE_HIDDEN_ENTRIES)
//   node scripts/site-publish.mjs check   fails when the built site still carries an unpublished screen: a remote or registration of it, an address of it in the generated outputs or the twins, or a link to it in a published screen's content
// `scripts/site-dist.mjs` takes the unpublished screens out of the aggregate with `publishedAggregate`, and template-site-meta leaves them out of the page map, the discovery files and the twins.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { isEntryPoint } from './entry-point.mjs';
import { pruneOutline } from '../template-site/src-app/mfe_packages/shared/site/content/publish.ts';

/** The shell's screen domain instance, relative to the site: its `id` names the domain, its `route` is the address key (`screen`). */
const SCREEN_DOMAIN_FILE = ['packages', 'framework', 'src', 'plugins', 'microfrontends', 'gts', 'frontx.screensets', 'instances', 'domains', 'screen.v1.json'];
/** The outline files a screen package may carry, as template-site-meta reads them. */
const OUTLINE_FILES = ['src/content/outline.json', 'src/content/outline.generated.json'];
/** The folders of dist/ that hold built code, never generated text: a screen's bundle carries its whole content, which the build-time checks read from the sources instead. */
const CODE_DIRS = new Set(['mfe', 'assets']);
/** The text files of dist/ the check reads; in the generated machine files (the document with its page map, the aggregate, the discovery files) an extension id is a registration too. */
const TEXT_FILE = /\.(html|md|txt|xml|json|webmanifest)$/;
const MACHINE_FILE = /\.(html|xml|json|webmanifest)$/;
/** The shell's own sources and the content the screens share, relative to the site: their code is bundled into every page, so a literal address in it is a link the dist scan cannot see (it skips the built code). */
const SHELL_SOURCE_DIRS = [['src-app', 'app'], ['src-app', 'mfe_packages', 'shared']];
const SOURCE_FILE = /\.(ts|tsx|json|md)$/;
/** Tests are not bundled, and may plant an address on purpose. */
const TEST_FILE = /\.test\.[^/\\]+$/;

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const NOT_A_PACKAGE = (name) => name === 'shared' || name.startsWith('.');

/**
 * The site's publishing choices from its config, each list checked: `unpublishedScreens` and `hiddenEntries`, empty when absent.
 * @param {Record<string, unknown>} config - the parsed site config
 * @returns {{ unpublished: string[], hiddenEntries: string[] }}
 */
// @cpt-algo:cpt-site-algo-production-build-layout-publishing:p2
export function publishingChoices(config) {
  // @cpt-begin:cpt-site-algo-production-build-layout-publishing:p2:inst-read-lists
  const list = (name) => {
    const value = config[name] ?? [];
    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string' && item !== '')) throw new Error(`site-publish: site.config.json ${name} must be a list of non-empty strings`);
    return value;
  };
  return { unpublished: list('unpublishedScreens'), hiddenEntries: list('hiddenEntries') };
  // @cpt-end:cpt-site-algo-production-build-layout-publishing:p2:inst-read-lists
}

/**
 * The screen extensions of the composed packages, read with the shell scanner rules (no `shared`, no dot entries, no package marked `templateExample`).
 * @param {string} siteDir - the site directory
 * @returns {{ domainKey: string, screens: { token: string, id: string, packageDir: string }[] }}
 */
export function composedScreens(siteDir) {
  // @cpt-begin:cpt-site-algo-production-build-layout-publishing:p2:inst-read-screens
  const domain = readJson(path.join(siteDir, ...SCREEN_DOMAIN_FILE));
  const packagesDir = path.join(siteDir, 'src-app', 'mfe_packages');
  const screens = [];
  for (const name of fs.readdirSync(packagesDir).sort()) {
    const file = path.join(packagesDir, name, 'mfe.json');
    if (NOT_A_PACKAGE(name) || !fs.existsSync(file)) continue;
    const manifest = readJson(file);
    if (manifest.templateExample === true) continue;
    for (const extension of manifest.extensions ?? []) {
      if (extension.domain === domain.id) screens.push({ token: String(extension.route).replace(/^\//, ''), id: extension.id, packageDir: name });
    }
  }
  return { domainKey: domain.route, screens };
  // @cpt-end:cpt-site-algo-production-build-layout-publishing:p2:inst-read-screens
}

/**
 * What the build publishes: the unpublished screens resolved to their extension ids and packages. Fails on a token no screen declares, on the home screen and on a footer screen, which would leave a published page with a link to a screen that is not there.
 * @param {Record<string, unknown>} config - the parsed site config
 * @param {{ token: string, id: string, packageDir: string }[]} screens - the composed screen extensions
 */
export function resolvePublishing(config, screens) {
  // @cpt-begin:cpt-site-algo-production-build-layout-publishing:p2:inst-resolve-tokens
  const { unpublished, hiddenEntries } = publishingChoices(config);
  const tokens = new Set(screens.map((screen) => screen.token));
  const unknown = unpublished.filter((token) => !tokens.has(token));
  if (unknown.length > 0) throw new Error(`site-publish: site.config.json unpublishedScreens names ${unknown.join(', ')}, which no composed screen declares`);
  if (unpublished.includes(String(config.homeScreen))) throw new Error(`site-publish: site.config.json unpublishedScreens names the home screen ${config.homeScreen}`);
  const footer = (Array.isArray(config.footerScreens) ? config.footerScreens : []).filter((token) => unpublished.includes(token));
  if (footer.length > 0) throw new Error(`site-publish: site.config.json footerScreens links ${footer.join(', ')}, which unpublishedScreens leaves out`);
  const hidden = screens.filter((screen) => unpublished.includes(screen.token));
  return { unpublished, hiddenEntries, hiddenScreens: hidden.map((screen) => screen.id) };
  // @cpt-end:cpt-site-algo-production-build-layout-publishing:p2:inst-resolve-tokens
}

/**
 * The build variables that carry the publishing choices to the screens (template-site's `shared/site/content/publish.ts` reads them).
 * @param {{ hiddenScreens: string[], hiddenEntries: string[] }} publishing
 * @returns {Record<string, string>}
 */
export function publishingEnv(publishing) {
  // @cpt-begin:cpt-site-algo-production-build-layout-publishing:p2:inst-build-variables
  return { VITE_SITE_HIDDEN_SCREENS: JSON.stringify(publishing.hiddenScreens), VITE_SITE_HIDDEN_ENTRIES: JSON.stringify(publishing.hiddenEntries) };
  // @cpt-end:cpt-site-algo-production-build-layout-publishing:p2:inst-build-variables
}

/**
 * The aggregate without the unpublished screens: their extensions and the entries only they use go; a remote that loses every extension goes with the domains it declares, and so does, in turn, a remote whose every extension sits in a domain only removed remotes declared (the widgets of a demo screen). A remote that never had an extension stays.
 * @param {object[]} configs - the aggregate's configs
 * @param {Iterable<string>} hiddenScreens - the extension ids of the unpublished screens
 * @returns {{ configs: object[], dropped: string[] }} the published configs and the manifest ids of the removed remotes
 */
// @cpt-algo:cpt-site-algo-production-build-layout-published-aggregate:p2
export function publishedAggregate(configs, hiddenScreens) {
  // @cpt-begin:cpt-site-algo-production-build-layout-published-aggregate:p2:inst-drop-extensions
  const gone = new Set(hiddenScreens);
  let kept = configs.map((config) => ({ config, had: (config.extensions ?? []).length }));
  const dropped = [];
  // @cpt-end:cpt-site-algo-production-build-layout-published-aggregate:p2:inst-drop-extensions
  // @cpt-begin:cpt-site-algo-production-build-layout-published-aggregate:p2:inst-until-stable
  for (;;) {
    const declared = new Set(kept.flatMap(({ config }) => (config.domains ?? []).map((domain) => domain.id)));
    const removedDomains = new Set(configs.filter((config) => dropped.includes(config.manifest?.id)).flatMap((config) => (config.domains ?? []).map((domain) => domain.id)).filter((id) => !declared.has(id)));
    const next = [];
    for (const { config, had } of kept) {
      const extensions = (config.extensions ?? []).filter((extension) => !gone.has(extension.id) && !removedDomains.has(extension.domain));
      if (had > 0 && extensions.length === 0) {
        dropped.push(config.manifest?.id);
        continue;
      }
      const used = new Set(extensions.map((extension) => extension.entry));
      const lost = new Set((config.extensions ?? []).filter((extension) => !extensions.includes(extension)).map((extension) => extension.entry));
      next.push({ config: { ...config, extensions, entries: (config.entries ?? []).filter((entry) => used.has(entry.id) || !lost.has(entry.id)) }, had });
    }
    const stable = next.length === kept.length && next.every(({ config }, index) => config.extensions.length === (kept[index].config.extensions ?? []).length);
    kept = next;
    if (stable) break;
  }
  // @cpt-end:cpt-site-algo-production-build-layout-published-aggregate:p2:inst-until-stable
  // @cpt-begin:cpt-site-algo-production-build-layout-published-aggregate:p2:inst-return-aggregate
  return { configs: kept.map(({ config }) => config), dropped };
  // @cpt-end:cpt-site-algo-production-build-layout-published-aggregate:p2:inst-return-aggregate
}

/**
 * The address of an unpublished screen in a text: `screen=<token>` ended by anything that cannot continue a token.
 * @param {string} domainKey - the screen domain's address key
 * @param {string} token - the screen's route token
 */
function addressPattern(domainKey, token) {
  return new RegExp(`[?&;]${domainKey}=${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9_-])`);
}

/**
 * A text without its code: fenced blocks and inline code spans, where an address is quoted source text, not a link. A fenced block goes only between two matching fence lines and a code span only when it opens and closes on one line, so a stray backtick cannot hide a link on another line; a fence that never closes throws, so the check fails closed.
 * @param {string} text
 * @returns {string}
 */
export function withoutCode(text) {
  const lines = text.split('\n');
  const kept = [];
  for (let index = 0; index < lines.length; index += 1) {
    const fence = /^(`{3,})[^`]*$/.exec(lines[index])?.[1];
    if (fence) {
      const close = lines.findIndex((line, at) => at > index && new RegExp(`^${fence}\`*[ \\t\\r]*$`).test(line));
      if (close === -1) throw new Error(`a code fence opened on line ${index + 1} never closes`);
      kept.push('');
      index = close;
      continue;
    }
    kept.push(lines[index].replace(/(`+)(?!`).*?(?<!`)\1(?!`)/g, ''));
  }
  return kept.join('\n');
}

/** Every file under a folder, as paths relative to it, skipping the folders `skip` names at the top. */
function filesUnder(dir, skip = new Set(), prefix = '') {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) return prefix === '' && skip.has(entry.name) ? [] : filesUnder(path.join(dir, entry.name), skip, relative);
    return [relative];
  });
}

/**
 * Where the built site still carries an unpublished screen, as messages; empty when nothing does.
 * - `dist/mfe/` holds a remote of a package whose every screen is unpublished;
 * - a generated text file of `dist/` (the document with its page map, the aggregate, the discovery files, the twins) names an unpublished screen's address (`?screen=<token>`) outside code, where a quoted source file may mention one; a generated machine file (the document, the aggregate, the manifests, the sitemap) names its extension id;
 * - a published screen package's sources under `src/` (tests aside) name such an address: its JSON data outside code, strings included, its TypeScript and Markdown anywhere, code included, since that code is what ships; or its outline, pruned as the page shows it, still links such a screen.
 * - the shell's own sources or the screens' shared content (`src-app/app/`, `src-app/mfe_packages/shared/`; TypeScript, JSON and Markdown, tests aside) name such an address anywhere, code included, since that code is what ships;
 * - a text the check reads opens a code fence that never closes, so it cannot tell its code from its links.
 * @param {string} siteDir - the site directory
 * @param {{ domainKey: string, screens: { token: string, id: string, packageDir: string }[] }} composed - the composed screens
 * @param {{ unpublished: string[], hiddenScreens: string[], hiddenEntries: string[] }} publishing - what the build publishes
 * @returns {string[]}
 */
// @cpt-algo:cpt-site-algo-production-build-layout-check-links:p2
export function unpublishedFindings(siteDir, composed, publishing) {
  const findings = [];
  // @cpt-begin:cpt-site-algo-production-build-layout-check-links:p2:inst-check-remotes
  const distDir = path.join(siteDir, 'dist');
  const packagesOf = (tokens) => new Set(composed.screens.filter((screen) => tokens.includes(screen.token)).map((screen) => screen.packageDir));
  const published = composed.screens.filter((screen) => !publishing.unpublished.includes(screen.token)).map((screen) => screen.token);
  const publishedPackages = packagesOf(published);
  for (const packageDir of packagesOf(publishing.unpublished)) {
    if (!publishedPackages.has(packageDir) && fs.existsSync(path.join(distDir, 'mfe', packageDir))) findings.push(`dist/mfe/${packageDir}/ is laid out, but every screen of it is unpublished`);
  }
  // @cpt-end:cpt-site-algo-production-build-layout-check-links:p2:inst-check-remotes
  // @cpt-begin:cpt-site-algo-production-build-layout-check-links:p2:inst-check-outputs
  const addresses = publishing.unpublished.map((token) => ({ token, pattern: addressPattern(composed.domainKey, token) }));
  /** The text outside code, or undefined with a finding when the check cannot tell code from links. */
  const prose = (label, text) => {
    try {
      return withoutCode(text);
    } catch (error) {
      findings.push(`${label}: ${error instanceof Error ? error.message : String(error)}; the check cannot tell its code from its links`);
      return undefined;
    }
  };
  const scan = (label, text, ids) => {
    const outside = prose(label, text);
    if (outside !== undefined) for (const { token, pattern } of addresses) if (pattern.test(outside)) findings.push(`${label} links the unpublished screen ${token} (${composed.domainKey}=${token})`);
    if (ids) for (const id of publishing.hiddenScreens) if (text.includes(id)) findings.push(`${label} names the unpublished screen ${id}`);
  };
  for (const file of filesUnder(distDir, CODE_DIRS).filter((name) => TEXT_FILE.test(name))) scan(`dist/${file.split(path.sep).join('/')}`, fs.readFileSync(path.join(distDir, file), 'utf8'), MACHINE_FILE.test(file));
  // @cpt-end:cpt-site-algo-production-build-layout-check-links:p2:inst-check-outputs
  // @cpt-begin:cpt-site-algo-production-build-layout-check-links:p2:inst-check-content
  const packagesDir = path.join(siteDir, 'src-app', 'mfe_packages');
  for (const packageDir of [...publishedPackages].sort()) {
    const dir = path.join(packagesDir, packageDir);
    for (const file of filesUnder(path.join(dir, 'src')).filter((name) => SOURCE_FILE.test(name) && !TEST_FILE.test(name))) {
      const label = `${packageDir}/src/${file.split(path.sep).join('/')}`;
      const source = fs.readFileSync(path.join(dir, 'src', file), 'utf8');
      // A data file's text is read outside code, where a quoted source may mention an address; a screen's code and Markdown are bundled as they are, so they are read whole, as the shell's are.
      const text = file.endsWith('.json') ? prose(label, source) : source;
      if (text !== undefined) for (const { token, pattern } of addresses) if (pattern.test(text)) findings.push(`${label} links the unpublished screen ${token} (${composed.domainKey}=${token})`);
    }
    for (const name of OUTLINE_FILES.filter((candidate) => fs.existsSync(path.join(dir, candidate)))) {
      const shown = JSON.stringify(pruneOutline(readJson(path.join(dir, name)), publishing));
      for (const id of publishing.hiddenScreens) if (shown.includes(id)) findings.push(`${packageDir}/${name} still links the unpublished screen ${id} after pruning; the page would show the link`);
    }
  }
  // @cpt-end:cpt-site-algo-production-build-layout-check-links:p2:inst-check-content
  // @cpt-begin:cpt-site-algo-production-build-layout-check-links:p2:inst-check-shell
  for (const parts of SHELL_SOURCE_DIRS) {
    const dir = path.join(siteDir, ...parts);
    for (const file of filesUnder(dir).filter((name) => SOURCE_FILE.test(name) && !TEST_FILE.test(name))) {
      const text = fs.readFileSync(path.join(dir, file), 'utf8');
      for (const { token, pattern } of addresses) if (pattern.test(text)) findings.push(`${[...parts, ...file.split(path.sep)].join('/')} links the unpublished screen ${token} (${composed.domainKey}=${token})`);
    }
  }
  // @cpt-end:cpt-site-algo-production-build-layout-check-links:p2:inst-check-shell
  // @cpt-begin:cpt-site-algo-production-build-layout-check-links:p2:inst-return-findings
  return findings;
  // @cpt-end:cpt-site-algo-production-build-layout-check-links:p2:inst-return-findings
}

/**
 * Reads the config and the composed screens of a repository.
 * @param {string} root - the repository root
 */
export function loadPublishing(root) {
  // @cpt-begin:cpt-site-algo-production-build-layout-publishing:p2:inst-load
  const siteDir = path.join(root, 'site');
  const composed = composedScreens(siteDir);
  return { siteDir, composed, publishing: resolvePublishing(readJson(path.join(root, 'site.config.json')), composed.screens) };
  // @cpt-end:cpt-site-algo-production-build-layout-publishing:p2:inst-load
}

// @cpt-flow:cpt-site-flow-production-build-layout-publish:p2
// @cpt-dod:cpt-site-dod-production-build-layout-publishing:p2
if (isEntryPoint(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const command = process.argv[2];
  try {
    // @cpt-begin:cpt-site-flow-production-build-layout-publish:p2:inst-load-choices
    const { siteDir, composed, publishing } = loadPublishing(root);
    // @cpt-end:cpt-site-flow-production-build-layout-publish:p2:inst-load-choices
    if (command === 'build') {
      // @cpt-begin:cpt-site-flow-production-build-layout-publish:p2:inst-build-site
      console.log(`site-publish: building with ${publishing.unpublished.length} unpublished screen(s)${publishing.unpublished.length > 0 ? `: ${publishing.unpublished.join(', ')}` : ''}`);
      const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const result = spawnSync(npm, ['run', 'build', '--prefix', siteDir], { stdio: 'inherit', env: { ...process.env, ...publishingEnv(publishing) } });
      process.exitCode = result.status ?? 1;
      // @cpt-end:cpt-site-flow-production-build-layout-publish:p2:inst-build-site
    } else if (command === 'check') {
      // @cpt-begin:cpt-site-flow-production-build-layout-publish:p2:inst-check-site
      const findings = unpublishedFindings(siteDir, composed, publishing);
      for (const finding of findings) console.error(`site-publish: ${finding}`);
      if (findings.length > 0) process.exitCode = 1;
      else console.log(`site-publish: no published page links an unpublished screen (${publishing.unpublished.length} unpublished)`);
      // @cpt-end:cpt-site-flow-production-build-layout-publish:p2:inst-check-site
    } else {
      console.error('usage: node scripts/site-publish.mjs build | check');
      process.exitCode = 2;
    }
  } catch (error) {
    // @cpt-begin:cpt-site-flow-production-build-layout-publish:p2:inst-report-error
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    // @cpt-end:cpt-site-flow-production-build-layout-publish:p2:inst-report-error
  }
}
