/**
 * Generation and checking over a project: resolves the page map from the sources and writes or compares the outputs in the project's `dist/`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { isPattern, type SiteMetaMap } from './page-map.ts';
import { renderIndexHtml, renderLlms, renderRobots, renderSeoManifest, renderSitemap, renderWebManifest, SITE_ASSETS, type PackageLlms } from './outputs.ts';
import { checkRasters } from './rasters.ts';
import { pruneOutline, type Publishing } from './publish.ts';
import { readOutlines, renderTwins, type ScreenOutline } from './twins.ts';
import { buildPageMap, publishedScreens, readJson, readScreenDomain, readScreenExtensions, resolveIndexing, resolveOrigin, screenToken, staticPages, type Indexing, type ScreenExtension, type SiteConfig, type SitePaths } from './site.ts';

// @cpt-begin:cpt-template-site-meta-algo-generate-and-check-routing-version:p1:inst-tool-dir
const HERE = path.dirname(fileURLToPath(import.meta.url));

/** This package's own directory: where npm puts the tool's own copy of a dependency whose version differs from the project's. */
export const TOOL_DIR = path.resolve(HERE, '..');
// @cpt-end:cpt-template-site-meta-algo-generate-and-check-routing-version:p1:inst-tool-dir

/** What one run reads: the project with its site config, and the raster record when the project keeps one. */
export interface RunOptions {
  readonly paths: SitePaths;
  readonly rasters?: string;
}

/** A path for a message: relative to the project. */
// @cpt-begin:cpt-template-site-meta-flow-generate-and-check-generate:p1:inst-shown-path
const shown = (paths: SitePaths, file: string): string => path.relative(paths.project, file);
// @cpt-end:cpt-template-site-meta-flow-generate-and-check-generate:p1:inst-shown-path

/** The packages whose published `llms.txt` the site's `llms.txt` links. */
// @cpt-begin:cpt-template-site-meta-algo-generate-and-check-render-outputs:p1:inst-documented-packages
export const DOCUMENTED_PACKAGES = ['@gears-frontx/ui-kit', '@gears-frontx/api'];
// @cpt-end:cpt-template-site-meta-algo-generate-and-check-render-outputs:p1:inst-documented-packages

/** Bundles the head-sync runtime into one browser script (IIFE), deterministic for the same sources. */
export async function bundleHeadSync(): Promise<string> {
  // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-render-outputs:p1:inst-bundle
  const result = await build({
    entryPoints: [path.join(HERE, 'head-sync-entry.ts')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    minify: true,
    legalComments: 'none',
    logLevel: 'silent',
  });
  // @cpt-end:cpt-template-site-meta-algo-generate-and-check-render-outputs:p1:inst-bundle
  // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-render-outputs:p1:inst-if-no-bundle
  const [output] = result.outputFiles;
  if (!output) throw new Error('esbuild produced no head-sync bundle');
  return output.text;
  // @cpt-end:cpt-template-site-meta-algo-generate-and-check-render-outputs:p1:inst-if-no-bundle
}

/** The published `llms.txt` of each documented package, at the version the site installs; a package that ships none is left out. */
// @cpt-begin:cpt-template-site-meta-algo-generate-and-check-render-outputs:p1:inst-find-published-llms
export function documentedPackages(paths: SitePaths): PackageLlms[] {
  return DOCUMENTED_PACKAGES.flatMap((name) => {
    const dir = path.join(paths.project, 'node_modules', ...name.split('/'));
    if (!fs.existsSync(path.join(dir, 'llms.txt'))) return [];
    const pkg = readJson<{ version: string; description?: string }>(path.join(dir, 'package.json'));
    return [{ name: `${name}@${pkg.version}`, url: `https://unpkg.com/${name}@${pkg.version}/llms.txt`, description: pkg.description ?? name }];
  });
}
// @cpt-end:cpt-template-site-meta-algo-generate-and-check-render-outputs:p1:inst-find-published-llms

/** The rules on `site.config.json` itself, as messages. */
// @cpt-begin:cpt-template-site-meta-algo-generate-and-check-rules:p1:inst-config-rule
export function checkConfig(config: SiteConfig): string[] {
  const errors: string[] = [];
  // A share image without alternative text publishes an image that screen readers and link previews cannot describe.
  if (config.ogImage && !config.ogImageAlt?.trim()) errors.push('site.config.json: ogImage is set without ogImageAlt; the share image needs its alternative text');
  // The file is read as JSON without a schema, so each llms.txt section is checked for the shape the renderer writes: one line of heading, one line per item.
  const line = (value: unknown) => typeof value === 'string' && value.trim() !== '' && !/[\r\n]/.test(value);
  // The publishing lists are read the same way: each a list of strings.
  for (const name of ['unpublishedScreens', 'hiddenEntries'] as const) {
    const value: unknown = config[name];
    if (value !== undefined && (!Array.isArray(value) || !value.every((item) => typeof item === 'string' && item !== ''))) errors.push(`site.config.json: ${name} must be a list of non-empty strings`);
  }
  const sections: unknown = config.llmsSections;
  if (sections !== undefined && !Array.isArray(sections)) errors.push('site.config.json: llmsSections must be a list of { "heading", "items" } sections');
  if (Array.isArray(sections)) {
    sections.forEach((section: unknown, index) => {
      const fields = typeof section === 'object' && section !== null ? (section as { heading?: unknown; items?: unknown }) : {};
      if (!line(fields.heading)) errors.push(`site.config.json: llmsSections[${index}].heading must be one non-empty line`);
      if (!Array.isArray(fields.items) || fields.items.length === 0 || !fields.items.every(line)) errors.push(`site.config.json: llmsSections[${index}].items must be a non-empty list of non-empty one-line strings`);
    });
  }
  return errors;
}
// @cpt-end:cpt-template-site-meta-algo-generate-and-check-rules:p1:inst-config-rule

/** The site-wide metadata rules, as messages; empty when the sources hold them. */
// @cpt-algo:cpt-template-site-meta-algo-generate-and-check-rules:p1
export function checkRules(extensions: readonly ScreenExtension[], map: SiteMetaMap): string[] {
  const errors: string[] = [];
  // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-rules:p1:inst-describe-rule
  const describe = (where: string, fields: { title?: string; description?: string }, needsDescription: boolean) => {
    if (!fields.title) errors.push(`${where}: seo title is missing`);
    if (fields.description === undefined) {
      if (needsDescription) errors.push(`${where}: seo description is missing`);
    } else if (fields.description.length < 50 || fields.description.length > 160) {
      errors.push(`${where}: seo description is ${fields.description.length} characters; it must be 50 to 160`);
    }
  };
  // @cpt-end:cpt-template-site-meta-algo-generate-and-check-rules:p1:inst-describe-rule
  // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-rules:p1:inst-foreach-extension
  for (const extension of extensions) {
    // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-rules:p1:inst-name-place
    const where = `${extension.packageName} ${extension.route}`;
    // @cpt-end:cpt-template-site-meta-algo-generate-and-check-rules:p1:inst-name-place
    // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-rules:p1:inst-if-no-block
    if (!extension.seo) {
      errors.push(`${where}: the screen extension has no seo block`);
      continue;
    }
    // @cpt-end:cpt-template-site-meta-algo-generate-and-check-rules:p1:inst-if-no-block
    // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-rules:p1:inst-check-screen
    describe(where, extension.seo, true);
    // @cpt-end:cpt-template-site-meta-algo-generate-and-check-rules:p1:inst-check-screen
    // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-rules:p1:inst-foreach-route
    for (const [route, fields] of Object.entries(extension.seo.routes ?? {})) {
      if (!route.startsWith('/') || route === '/') errors.push(`${where} seo.routes "${route}": a route key is a path inside the screen other than "/" (the screen's own seo describes "/")`);
      describe(`${where} seo.routes "${route}"`, fields, !isPattern(route) && fields.indexable !== false);
    }
    // @cpt-end:cpt-template-site-meta-algo-generate-and-check-rules:p1:inst-foreach-route
  }
  // @cpt-end:cpt-template-site-meta-algo-generate-and-check-rules:p1:inst-foreach-extension
  // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-rules:p1:inst-unique-values
  const pages = staticPages(map);
  const seen = (values: string[], what: string) => {
    const counts = new Map<string, number>();
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
    for (const [value, count] of counts) if (count > 1) errors.push(`${count} pages share the ${what} "${value}"`);
  };
  seen(pages.map((page) => page.documentTitle), 'title');
  seen(pages.map((page) => page.canonical), 'canonical URL');
  // @cpt-end:cpt-template-site-meta-algo-generate-and-check-rules:p1:inst-unique-values
  // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-rules:p1:inst-return-rules
  return errors;
  // @cpt-end:cpt-template-site-meta-algo-generate-and-check-rules:p1:inst-return-rules
}

/**
 * The routing version head-sync is bundled with must be the site's: the realm's navigation history sits in a version-namespaced slot. esbuild resolves the package the way Node does, from this package outward, so the tool bundles its own copy when npm installed one and the project's otherwise.
 * @param paths - the project
 * @param toolDir - this package's directory
 */
// @cpt-algo:cpt-template-site-meta-algo-generate-and-check-routing-version:p1
// @cpt-dod:cpt-template-site-meta-dod-generate-and-check-routing-version:p1
export function checkRoutingVersion(paths: SitePaths, toolDir: string = TOOL_DIR): string[] {
  // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-routing-version:p1:inst-if-single-copy
  const routing = (dir: string) => path.join(dir, 'node_modules', '@gears-frontx', 'routing', 'package.json');
  const siteFile = routing(paths.project);
  if (!fs.existsSync(siteFile) || !fs.existsSync(routing(toolDir))) return [];
  // @cpt-end:cpt-template-site-meta-algo-generate-and-check-routing-version:p1:inst-if-single-copy
  // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-routing-version:p1:inst-compare-versions
  const own = readJson<{ version: string }>(routing(toolDir)).version;
  const site = readJson<{ version: string }>(siteFile).version;
  return own === site ? [] : [`head-sync bundles @gears-frontx/routing ${own}, the site runs ${site}; the navigation history singleton would not be shared`];
  // @cpt-end:cpt-template-site-meta-algo-generate-and-check-routing-version:p1:inst-compare-versions
}

/**
 * The outlines of the published screens as their pages show them: a screen the site leaves out has no outline here, and every other outline is pruned by the site's publishing choices (`publish.ts`).
 * @param outlines - the composed packages' outlines
 * @param publishing - the hidden screens and entries
 * @param unpublished - the route tokens of the screens the site leaves out
 */
// @cpt-algo:cpt-template-site-meta-algo-plain-text-twins-published-outlines:p2
export function publishedOutlines(outlines: readonly ScreenOutline[], publishing: Publishing, unpublished: readonly string[]): ScreenOutline[] {
  // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-published-outlines:p2:inst-drop-unpublished
  const shown = outlines.filter((outline) => !unpublished.includes(outline.screen));
  // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-published-outlines:p2:inst-drop-unpublished
  // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-published-outlines:p2:inst-prune-pages
  return shown.map((outline) => ({ ...outline, pages: (pruneOutline({ pages: outline.pages }, publishing) as { pages: ScreenOutline['pages'] }).pages }));
  // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-published-outlines:p2:inst-prune-pages
}

/** What the site publishes, as one run resolved it: the hidden screens and entries, and the route tokens of the screens left out. */
export interface SitePublishing extends Publishing {
  readonly unpublished: readonly string[];
}

/** The outputs for a page map, keyed by their path in `dist/`: the head, the discovery files, the web manifest and the plain-text twins of the published outline pages. With indexing off, robots.txt disallows every path and no `llms.txt` is written. */
// @cpt-algo:cpt-template-site-meta-algo-generate-and-check-render-outputs:p1
export async function renderOutputs(paths: SitePaths, config: SiteConfig, map: SiteMetaMap, indexHtml: string, publishing: SitePublishing = { hiddenScreens: [], hiddenEntries: [], unpublished: [] }, indexing: Indexing = 'on'): Promise<Record<string, string>> {
  // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-render-outputs:p1:inst-render-twins
  const twins = renderTwins(publishedOutlines(readOutlines(paths.packages), publishing, publishing.unpublished), map);
  // @cpt-end:cpt-template-site-meta-algo-generate-and-check-render-outputs:p1:inst-render-twins
  // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-render-outputs:p1:inst-return-outputs
  return {
    'index.html': renderIndexHtml(indexHtml, map, await bundleHeadSync()),
    'seo-manifest.json': renderSeoManifest(map, indexing),
    'sitemap.xml': renderSitemap(map),
    'robots.txt': renderRobots(map, indexing),
    ...(indexing === 'on' ? { 'llms.txt': renderLlms(map, config.defaultDescription, documentedPackages(paths), twins, config.llmsSections) } : {}),
    'site.webmanifest': renderWebManifest(map, config),
    ...Object.fromEntries(twins.map((twin) => [twin.file, twin.content])),
  };
  // @cpt-end:cpt-template-site-meta-algo-generate-and-check-render-outputs:p1:inst-return-outputs
}

/** The site-relative icons a page links (`<link rel="icon">`, `apple-touch-icon`, `mask-icon`, ...), in the order they appear, as paths in `dist/` (`brand/favicon.svg` for `/brand/favicon.svg`, `./brand/favicon.svg` and `brand/favicon.svg`). */
// @cpt-begin:cpt-template-site-meta-algo-generate-and-check-linked-assets:p2:inst-linked-icons
export function linkedIcons(html: string): string[] {
  const icons: string[] = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = /\brel\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? '';
    const href = /\bhref\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    if (!href || href.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(href)) continue;
    if (rel.split(/\s+/).some((token) => /icon$/i.test(token))) icons.push(href.replace(/^\.?\//, ''));
  }
  return icons;
}
// @cpt-end:cpt-template-site-meta-algo-generate-and-check-linked-assets:p2:inst-linked-icons

/** The asset files the head and the web manifest link, which the build must have copied into `dist/`: the generated icon set, every icon the built page itself links, and a share image on the site's own origin. */
// @cpt-algo:cpt-template-site-meta-algo-generate-and-check-linked-assets:p2
export function missingAssets(paths: SitePaths, map: SiteMetaMap, indexHtml: string): string[] {
  // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-linked-assets:p2:inst-asset-files
  const files = new Set<string>([...Object.values(SITE_ASSETS), ...linkedIcons(indexHtml)]);
  // @cpt-end:cpt-template-site-meta-algo-generate-and-check-linked-assets:p2:inst-asset-files
  // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-linked-assets:p2:inst-if-own-share-image
  if (map.ogImage?.startsWith(`${map.origin}/`)) files.add(map.ogImage.slice(map.origin.length + 1));
  // @cpt-end:cpt-template-site-meta-algo-generate-and-check-linked-assets:p2:inst-if-own-share-image
  // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-linked-assets:p2:inst-return-missing
  return [...files].filter((file) => !fs.existsSync(path.join(paths.dist, file))).map((file) => `${shown(paths, path.join(paths.dist, file))} does not exist; the head links it`);
  // @cpt-end:cpt-template-site-meta-algo-generate-and-check-linked-assets:p2:inst-return-missing
}

/** Everything both commands need: config, the published screen extensions, the page map on an origin with the build's indexing, and what the site leaves out. */
// @cpt-algo:cpt-template-site-meta-algo-generate-and-check-load-site:p1
export function loadSite(paths: SitePaths, origin: (config: SiteConfig) => string, indexing: Indexing = 'on') {
  // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-load-site:p1:inst-read-config
  const config = readJson<SiteConfig>(paths.config);
  // @cpt-end:cpt-template-site-meta-algo-generate-and-check-load-site:p1:inst-read-config
  // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-load-site:p1:inst-read-domain
  const domain = readScreenDomain(paths.screenDomain);
  // @cpt-end:cpt-template-site-meta-algo-generate-and-check-load-site:p1:inst-read-domain
  // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-load-site:p1:inst-read-extensions
  const all = readScreenExtensions(paths.packages, domain.id);
  // @cpt-end:cpt-template-site-meta-algo-generate-and-check-load-site:p1:inst-read-extensions
  // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-load-site:p1:inst-published-screens
  const { published: extensions, hiddenScreens } = publishedScreens(config, all);
  const publishing: SitePublishing = { hiddenScreens, hiddenEntries: config.hiddenEntries ?? [], unpublished: all.filter((extension) => hiddenScreens.includes(extension.id)).map(screenToken) };
  // @cpt-end:cpt-template-site-meta-algo-generate-and-check-load-site:p1:inst-published-screens
  // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-load-site:p1:inst-build-map
  const map = buildPageMap(config, origin(config), domain.key, extensions, indexing);
  // @cpt-end:cpt-template-site-meta-algo-generate-and-check-load-site:p1:inst-build-map
  // @cpt-begin:cpt-template-site-meta-algo-generate-and-check-load-site:p1:inst-return-site
  return { config, extensions, map, publishing };
  // @cpt-end:cpt-template-site-meta-algo-generate-and-check-load-site:p1:inst-return-site
}

/**
 * `generate`: writes the outputs into the project's `dist/` after its build. Fails without an origin, on a rule violation, or without a built `index.html`.
 * @param run - the project, its site config and its raster record
 * @param env - the environment (`SITE_ORIGIN`)
 * @returns the written files, relative to the project
 */
// @cpt-flow:cpt-template-site-meta-flow-generate-and-check-generate:p1
// @cpt-dod:cpt-template-site-meta-dod-generate-and-check-generate:p1
export async function generate(run: RunOptions, env: Readonly<Record<string, string | undefined>>): Promise<string[]> {
  // @cpt-begin:cpt-template-site-meta-flow-generate-and-check-generate:p1:inst-load-on-origin
  const { paths } = run;
  const indexing = resolveIndexing(env);
  const { config, extensions, map, publishing } = loadSite(paths, (config) => resolveOrigin(config, env), indexing);
  // @cpt-end:cpt-template-site-meta-flow-generate-and-check-generate:p1:inst-load-on-origin
  // @cpt-begin:cpt-template-site-meta-flow-generate-and-check-generate:p1:inst-if-rules-fail
  const errors = [...checkConfig(config), ...checkRules(extensions, map), ...checkRoutingVersion(paths), ...checkRasters(run.rasters)];
  if (errors.length > 0) throw new Error(`site metadata does not hold the rules:\n${errors.map((error) => `  - ${error}`).join('\n')}`);
  // @cpt-end:cpt-template-site-meta-flow-generate-and-check-generate:p1:inst-if-rules-fail
  // @cpt-begin:cpt-template-site-meta-flow-generate-and-check-generate:p1:inst-if-no-build
  const indexFile = path.join(paths.dist, 'index.html');
  if (!fs.existsSync(indexFile)) throw new Error(`${shown(paths, indexFile)} does not exist; build the project first`);
  // @cpt-end:cpt-template-site-meta-flow-generate-and-check-generate:p1:inst-if-no-build
  // @cpt-begin:cpt-template-site-meta-flow-generate-and-check-generate:p1:inst-if-missing-assets
  const indexHtml = fs.readFileSync(indexFile, 'utf8');
  const missing = missingAssets(paths, map, indexHtml);
  if (missing.length > 0) throw new Error(missing.join('\n'));
  // @cpt-end:cpt-template-site-meta-flow-generate-and-check-generate:p1:inst-if-missing-assets
  // @cpt-begin:cpt-template-site-meta-flow-generate-and-check-generate:p1:inst-render
  const outputs = await renderOutputs(paths, config, map, indexHtml, publishing, indexing);
  // @cpt-end:cpt-template-site-meta-flow-generate-and-check-generate:p1:inst-render
  // @cpt-begin:cpt-template-site-meta-flow-generate-and-check-generate:p1:inst-if-indexing-off
  // A build that may not be indexed publishes no llms.txt, not even one an earlier generation left.
  if (indexing === 'off') fs.rmSync(path.join(paths.dist, 'llms.txt'), { force: true });
  // @cpt-end:cpt-template-site-meta-flow-generate-and-check-generate:p1:inst-if-indexing-off
  // @cpt-begin:cpt-template-site-meta-flow-generate-and-check-generate:p1:inst-write-outputs
  for (const [name, content] of Object.entries(outputs)) {
    fs.mkdirSync(path.dirname(path.join(paths.dist, name)), { recursive: true });
    fs.writeFileSync(path.join(paths.dist, name), content);
  }
  // @cpt-end:cpt-template-site-meta-flow-generate-and-check-generate:p1:inst-write-outputs
  // @cpt-begin:cpt-template-site-meta-flow-generate-and-check-generate:p1:inst-return-written
  return Object.keys(outputs).map((name) => shown(paths, path.join(paths.dist, name)));
  // @cpt-end:cpt-template-site-meta-flow-generate-and-check-generate:p1:inst-return-written
}

/**
 * `check`: the metadata rules over the composed sources, and, when `dist/` holds generated outputs, that they equal what the sources generate now (on the origin they were generated for).
 * @param run - the project, its site config and its raster record
 */
// @cpt-flow:cpt-template-site-meta-flow-generate-and-check-check:p1
// @cpt-dod:cpt-template-site-meta-dod-generate-and-check-check:p1
export async function check(run: RunOptions): Promise<{ errors: string[]; compared: boolean }> {
  const { paths } = run;
  // @cpt-begin:cpt-template-site-meta-flow-generate-and-check-check:p1:inst-read-recorded-origin
  const manifestFile = path.join(paths.dist, 'seo-manifest.json');
  const generated = fs.existsSync(manifestFile) ? readJson<{ site: { origin: string; indexing?: string } }>(manifestFile).site : undefined;
  const generatedOrigin = generated?.origin;
  // A manifest from before the switch carries no indexing; it was generated indexable.
  const indexing = resolveIndexing({ SITE_INDEXING: generated?.indexing });
  // @cpt-end:cpt-template-site-meta-flow-generate-and-check-check:p1:inst-read-recorded-origin
  // @cpt-begin:cpt-template-site-meta-flow-generate-and-check-check:p1:inst-load-site
  // Without generated outputs the rules need some origin to resolve addresses; the value does not enter any rule.
  const { config, extensions, map, publishing } = loadSite(paths, () => generatedOrigin ?? 'http://localhost', indexing);
  // @cpt-end:cpt-template-site-meta-flow-generate-and-check-check:p1:inst-load-site
  // @cpt-begin:cpt-template-site-meta-flow-generate-and-check-check:p1:inst-apply-rules
  const configErrors = checkConfig(config);
  const errors = [...configErrors, ...checkRules(extensions, map), ...checkRoutingVersion(paths), ...checkRasters(run.rasters)];
  // True only once the outputs were rendered and compared.
  let compared = false;
  // @cpt-end:cpt-template-site-meta-flow-generate-and-check-check:p1:inst-apply-rules
  // @cpt-begin:cpt-template-site-meta-flow-generate-and-check-check:p1:inst-if-outputs-exist
  if (generatedOrigin !== undefined) {
    // @cpt-begin:cpt-template-site-meta-flow-generate-and-check-check:p1:inst-check-assets
    const indexFile = path.join(paths.dist, 'index.html');
    const current = fs.readFileSync(indexFile, 'utf8');
    errors.push(...missingAssets(paths, map, current));
    // @cpt-end:cpt-template-site-meta-flow-generate-and-check-check:p1:inst-check-assets
    // @cpt-begin:cpt-template-site-meta-flow-generate-and-check-check:p1:inst-compare-outputs
    // A config the rules refuse cannot be rendered (generate throws on it too), so its messages stand alone.
    if (configErrors.length === 0) {
      const outputs = await renderOutputs(paths, config, map, current, publishing, indexing);
      compared = true;
      // @cpt-begin:cpt-template-site-meta-flow-generate-and-check-check:p1:inst-if-llms-unindexed
      if (indexing === 'off' && fs.existsSync(path.join(paths.dist, 'llms.txt'))) errors.push(`${shown(paths, path.join(paths.dist, 'llms.txt'))} is published although the build may not be indexed; run npm run seo:generate`);
      // @cpt-end:cpt-template-site-meta-flow-generate-and-check-check:p1:inst-if-llms-unindexed
      for (const [name, content] of Object.entries(outputs)) {
        const file = path.join(paths.dist, name);
        if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) errors.push(`${shown(paths, file)} differs from what the sources generate; run npm run seo:generate`);
      }
    }
    // @cpt-end:cpt-template-site-meta-flow-generate-and-check-check:p1:inst-compare-outputs
  }
  // @cpt-end:cpt-template-site-meta-flow-generate-and-check-check:p1:inst-if-outputs-exist
  // @cpt-begin:cpt-template-site-meta-flow-generate-and-check-check:p1:inst-return-result
  return { errors, compared };
  // @cpt-end:cpt-template-site-meta-flow-generate-and-check-check:p1:inst-return-result
}
