/**
 * Reads the site's metadata sources (the site config, the composed screen packages' `mfe.json`, the shell's screen domain instance) and resolves them into the page map.
 */
import fs from 'node:fs';
import path from 'node:path';
import { isPattern, ROUTE_PARAM, screenAddress, type PageMeta, type ScreenPages, type SiteMetaMap } from './page-map.ts';

/** The site config: `site.config.json` in the project, or the file `--config` names. */
export interface SiteConfig {
  readonly origin?: string;
  readonly siteName: string;
  /** The short name an installed app shows under its icon (the web manifest's `short_name`); the site name when absent. */
  readonly shortName?: string;
  readonly titleTemplate: string;
  readonly defaultDescription: string;
  readonly locale: string;
  readonly homeScreen: string;
  /** The share image: an absolute URL, or a path in the site's build output (`/og-image.png`), resolved under the address the site is served from. */
  readonly ogImage?: string;
  /** The share image's alternative text; required with `ogImage`. */
  readonly ogImageAlt?: string;
  readonly twitterCard: string;
  /** The browser UI color (`theme-color`, and the web manifest's `theme_color`). */
  readonly themeColor?: string;
  /** The web manifest's `background_color`. */
  readonly backgroundColor?: string;
  /** Sections the site adds to `llms.txt` after the packages, each a heading and its list items (how to build and run the site, for example). */
  readonly llmsSections?: readonly LlmsSection[];
  /** The screens, by route token, the site leaves out of its build: no page, no sitemap or `llms.txt` line and no twin of theirs, and no link to them in a published outline. None when absent. */
  readonly unpublishedScreens?: readonly string[];
  /** The ids of the outline entries the site does not show, on its pages and in their twins. None when absent. */
  readonly hiddenEntries?: readonly string[];
}

/** A section of `llms.txt` the site config adds: `## <heading>`, then each item as a list line. */
export interface LlmsSection {
  readonly heading: string;
  readonly items: readonly string[];
}

/** The `seo` block of a screen extension, and of each of its routes. */
export interface SeoFields {
  readonly title?: string;
  readonly description?: string;
  readonly indexable?: boolean;
  readonly ogImage?: string;
}
export interface SeoBlock extends SeoFields {
  readonly routes?: Readonly<Record<string, SeoFields>>;
}

/** A screen extension as the site reads it from a package's `mfe.json`. */
export interface ScreenExtension {
  readonly id: string;
  readonly route: string;
  readonly presentation?: { readonly label?: string; readonly order?: number };
  readonly seo?: SeoBlock;
  /** The package directory the extension was read from. */
  readonly packageName: string;
}

/** Paths the generator reads and writes: the FrontX project (template-shell applied), its build output and the site config. */
export interface SitePaths {
  /** The project's root, where template-shell's `package.json` sits. */
  readonly project: string;
  readonly config: string;
  readonly packages: string;
  readonly screenDomain: string;
  readonly dist: string;
}

/**
 * The paths of a project.
 * @param project - the project's root
 * @param config - the site config file; `site.config.json` in the project when absent
 */
// @cpt-algo:cpt-template-site-meta-algo-page-map-project-paths:p1
// @cpt-dod:cpt-template-site-meta-dod-page-map-sources:p1
// @cpt-begin:cpt-template-site-meta-algo-page-map-project-paths:p1:inst-default-config
export function sitePaths(project: string, config: string = path.join(project, 'site.config.json')): SitePaths {
// @cpt-end:cpt-template-site-meta-algo-page-map-project-paths:p1:inst-default-config
  // @cpt-begin:cpt-template-site-meta-algo-page-map-project-paths:p1:inst-return-paths
  return {
    project,
    config,
    packages: path.join(project, 'src-app', 'mfe_packages'),
    screenDomain: path.join(project, 'packages', 'framework', 'src', 'plugins', 'microfrontends', 'gts', 'frontx.screensets', 'instances', 'domains', 'screen.v1.json'),
    dist: path.join(project, 'dist'),
  };
  // @cpt-end:cpt-template-site-meta-algo-page-map-project-paths:p1:inst-return-paths
}

// @cpt-begin:cpt-template-site-meta-algo-page-map-read-sources:p1:inst-read-json
export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}
// @cpt-end:cpt-template-site-meta-algo-page-map-read-sources:p1:inst-read-json

/** The message a build without an origin fails with. */
export const MISSING_ORIGIN_MESSAGE =
  'site.config.json.origin is not set. A production build needs the address the site is served from: set "origin" in site.config.json (for example "https://frontx.example", or "https://example.org/frontx" for a site mounted under a sub-path), or set SITE_ORIGIN for a local preview (SITE_ORIGIN=http://localhost:4173).';

/**
 * The address canonical URLs are built on: `SITE_ORIGIN` when set (a local preview), otherwise `site.config.json.origin`. There is no default. It is an origin, or an origin and the sub-path the site is mounted at; the result has no trailing slash, so `${origin}/?screen=home` is a page's address.
 * @param config - the site config
 * @param env - the environment to read `SITE_ORIGIN` from
 */
// @cpt-algo:cpt-template-site-meta-algo-page-map-resolve-origin:p1
export function resolveOrigin(config: SiteConfig, env: Readonly<Record<string, string | undefined>>): string {
  // @cpt-begin:cpt-template-site-meta-algo-page-map-resolve-origin:p1:inst-pick-origin
  const origin = env.SITE_ORIGIN?.trim() || config.origin?.trim();
  // @cpt-end:cpt-template-site-meta-algo-page-map-resolve-origin:p1:inst-pick-origin
  // @cpt-begin:cpt-template-site-meta-algo-page-map-resolve-origin:p1:inst-if-no-origin
  if (!origin) throw new Error(MISSING_ORIGIN_MESSAGE);
  // @cpt-end:cpt-template-site-meta-algo-page-map-resolve-origin:p1:inst-if-no-origin
  // @cpt-begin:cpt-template-site-meta-algo-page-map-resolve-origin:p1:inst-if-not-url
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new Error(`site origin "${origin}" is not a URL`);
  }
  // @cpt-end:cpt-template-site-meta-algo-page-map-resolve-origin:p1:inst-if-not-url
  // @cpt-begin:cpt-template-site-meta-algo-page-map-resolve-origin:p1:inst-if-not-http
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error(`site origin "${origin}" must be http or https`);
  // @cpt-end:cpt-template-site-meta-algo-page-map-resolve-origin:p1:inst-if-not-http
  // @cpt-begin:cpt-template-site-meta-algo-page-map-resolve-origin:p1:inst-if-query-or-hash
  if (url.search !== '' || url.hash !== '') throw new Error(`site origin "${origin}" must be an origin with an optional path, and no query or hash`);
  // @cpt-end:cpt-template-site-meta-algo-page-map-resolve-origin:p1:inst-if-query-or-hash
  // @cpt-begin:cpt-template-site-meta-algo-page-map-resolve-origin:p1:inst-return-origin
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  // @cpt-end:cpt-template-site-meta-algo-page-map-resolve-origin:p1:inst-return-origin
}

/** Whether search engines may index the build: `on`, or `off` for a build no page of which may be indexed (a preview). */
export type Indexing = 'on' | 'off';

/**
 * The indexing of a build: `SITE_INDEXING`, `on` when unset; any value other than `on` or `off` fails the build.
 * @param env - the environment to read `SITE_INDEXING` from
 */
// @cpt-algo:cpt-template-site-meta-algo-page-map-resolve-indexing:p1
export function resolveIndexing(env: Readonly<Record<string, string | undefined>>): Indexing {
  // @cpt-begin:cpt-template-site-meta-algo-page-map-resolve-indexing:p1:inst-read-indexing
  const value = env.SITE_INDEXING ?? 'on';
  // @cpt-end:cpt-template-site-meta-algo-page-map-resolve-indexing:p1:inst-read-indexing
  // @cpt-begin:cpt-template-site-meta-algo-page-map-resolve-indexing:p1:inst-if-unknown-indexing
  if (value !== 'on' && value !== 'off') throw new Error(`SITE_INDEXING is "${value}"; it must be "on" (the default) or "off"`);
  // @cpt-end:cpt-template-site-meta-algo-page-map-resolve-indexing:p1:inst-if-unknown-indexing
  // @cpt-begin:cpt-template-site-meta-algo-page-map-resolve-indexing:p1:inst-return-indexing
  return value;
  // @cpt-end:cpt-template-site-meta-algo-page-map-resolve-indexing:p1:inst-return-indexing
}

/** The screen domain's key in the URL grammar: the `route` of the shell's screen domain instance. */
// @cpt-begin:cpt-template-site-meta-algo-page-map-read-sources:p1:inst-read-screen-domain
export function readScreenDomain(file: string): { id: string; key: string } {
  const domain = readJson<{ id: string; route: string }>(file);
  return { id: domain.id, key: domain.route };
}
// @cpt-end:cpt-template-site-meta-algo-page-map-read-sources:p1:inst-read-screen-domain

/** Directory names the shell's scanners never treat as packages. */
// @cpt-begin:cpt-template-site-meta-algo-page-map-read-sources:p1:inst-non-package-rule
function isNonPackageDirectory(name: string): boolean {
  return name === 'shared' || name.startsWith('.');
}
// @cpt-end:cpt-template-site-meta-algo-page-map-read-sources:p1:inst-non-package-rule

/**
 * Every screen extension of the composed packages, read with the shell's scanner rules: no `shared`, no dot-directories, no package marked `templateExample`.
 * @param packagesDir - the project's `src-app/mfe_packages`
 * @param screenDomainId - the screen domain's GTS id
 */
// @cpt-algo:cpt-template-site-meta-algo-page-map-read-sources:p1
export function readScreenExtensions(packagesDir: string, screenDomainId: string): ScreenExtension[] {
  const screens: ScreenExtension[] = [];
  // @cpt-begin:cpt-template-site-meta-algo-page-map-read-sources:p1:inst-foreach-package
  for (const name of fs.readdirSync(packagesDir).sort()) {
    // @cpt-begin:cpt-template-site-meta-algo-page-map-read-sources:p1:inst-skip-non-package
    if (isNonPackageDirectory(name)) continue;
    // @cpt-end:cpt-template-site-meta-algo-page-map-read-sources:p1:inst-skip-non-package
    // @cpt-begin:cpt-template-site-meta-algo-page-map-read-sources:p1:inst-skip-no-manifest
    const file = path.join(packagesDir, name, 'mfe.json');
    if (!fs.existsSync(file)) continue;
    // @cpt-end:cpt-template-site-meta-algo-page-map-read-sources:p1:inst-skip-no-manifest
    // @cpt-begin:cpt-template-site-meta-algo-page-map-read-sources:p1:inst-skip-template-example
    const manifest = readJson<{ templateExample?: boolean; extensions?: Array<Omit<ScreenExtension, 'packageName'> & { domain: string }> }>(file);
    if (manifest.templateExample === true) continue;
    // @cpt-end:cpt-template-site-meta-algo-page-map-read-sources:p1:inst-skip-template-example
    // @cpt-begin:cpt-template-site-meta-algo-page-map-read-sources:p1:inst-collect-screen-extensions
    for (const extension of manifest.extensions ?? []) {
      if (extension.domain !== screenDomainId) continue;
      screens.push({ id: extension.id, route: extension.route, presentation: extension.presentation, seo: extension.seo, packageName: name });
    }
    // @cpt-end:cpt-template-site-meta-algo-page-map-read-sources:p1:inst-collect-screen-extensions
  }
  // @cpt-end:cpt-template-site-meta-algo-page-map-read-sources:p1:inst-foreach-package
  // @cpt-begin:cpt-template-site-meta-algo-page-map-read-sources:p1:inst-return-extensions
  return screens;
  // @cpt-end:cpt-template-site-meta-algo-page-map-read-sources:p1:inst-return-extensions
}

/** The screen token of a screen extension: its `route` without the leading `/`. */
// @cpt-begin:cpt-template-site-meta-algo-page-map-canonical-address:p1:inst-screen-token
export function screenToken(extension: Pick<ScreenExtension, 'route'>): string {
  return extension.route.replace(/^\//, '');
}
// @cpt-end:cpt-template-site-meta-algo-page-map-canonical-address:p1:inst-screen-token

/**
 * The origin-relative address of a page, written by `serializeGrammar` (the function the framework router writes the URL with): `/?screen=<token>` for a screen root, `/?screen=<token>;route=<path>` inside it.
 * @param domainKey - the screen domain's key
 * @param token - the screen token
 * @param route - the path inside the screen
 */
export function addressOf(domainKey: string, token: string, route: string): string {
  // @cpt-begin:cpt-template-site-meta-algo-page-map-canonical-address:p1:inst-site-address
  return screenAddress(domainKey, ROUTE_PARAM, token, route);
  // @cpt-end:cpt-template-site-meta-algo-page-map-canonical-address:p1:inst-site-address
}

/**
 * The screen extensions a site publishes, and the extension ids of the ones it leaves out (`unpublishedScreens`, by route token). Fails when the list names a token no screen declares, or the home screen.
 * @param config - the site config
 * @param extensions - the screen extensions of the composed packages
 */
// @cpt-algo:cpt-template-site-meta-algo-page-map-published-screens:p1
export function publishedScreens(config: SiteConfig, extensions: readonly ScreenExtension[]): { published: ScreenExtension[]; hiddenScreens: string[] } {
  // @cpt-begin:cpt-template-site-meta-algo-page-map-published-screens:p1:inst-read-list
  const unpublished = new Set(config.unpublishedScreens ?? []);
  const tokens = new Set(extensions.map(screenToken));
  // @cpt-end:cpt-template-site-meta-algo-page-map-published-screens:p1:inst-read-list
  // @cpt-begin:cpt-template-site-meta-algo-page-map-published-screens:p1:inst-if-unknown-token
  const unknown = [...unpublished].filter((token) => !tokens.has(token));
  if (unknown.length > 0) throw new Error(`site.config.json.unpublishedScreens names ${unknown.map((token) => `"${token}"`).join(', ')}, which no screen of the site declares`);
  // @cpt-end:cpt-template-site-meta-algo-page-map-published-screens:p1:inst-if-unknown-token
  // @cpt-begin:cpt-template-site-meta-algo-page-map-published-screens:p1:inst-if-home-unpublished
  if (unpublished.has(config.homeScreen)) throw new Error(`site.config.json.unpublishedScreens names the home screen "${config.homeScreen}"`);
  // @cpt-end:cpt-template-site-meta-algo-page-map-published-screens:p1:inst-if-home-unpublished
  // @cpt-begin:cpt-template-site-meta-algo-page-map-published-screens:p1:inst-return-split
  return {
    published: extensions.filter((extension) => !unpublished.has(screenToken(extension))),
    hiddenScreens: extensions.filter((extension) => unpublished.has(screenToken(extension))).map((extension) => extension.id),
  };
  // @cpt-end:cpt-template-site-meta-algo-page-map-published-screens:p1:inst-return-split
}

/**
 * Screen tokens declared by more than one screen extension, each with the packages that declare it. The page map holds one screen per token, so a duplicate would silently replace pages.
 * @param extensions - the screen extensions of the composed packages
 */
// @cpt-begin:cpt-template-site-meta-algo-page-map-build-map:p1:inst-find-duplicate-tokens
export function duplicateTokens(extensions: readonly ScreenExtension[]): string[] {
  const owners = new Map<string, string[]>();
  for (const extension of extensions) {
    const token = screenToken(extension);
    owners.set(token, [...(owners.get(token) ?? []), extension.packageName]);
  }
  return [...owners].filter(([, packages]) => packages.length > 1).map(([token, packages]) => `screen token "${token}" is declared by more than one screen extension (${packages.join(', ')})`);
}
// @cpt-end:cpt-template-site-meta-algo-page-map-build-map:p1:inst-find-duplicate-tokens

// @cpt-begin:cpt-template-site-meta-algo-page-map-build-map:p1:inst-document-title
function documentTitle(config: SiteConfig, title: string, isHome: boolean): string {
  return isHome ? config.siteName : config.titleTemplate.replace('%s', title);
}
// @cpt-end:cpt-template-site-meta-algo-page-map-build-map:p1:inst-document-title

/**
 * Resolves the page map: one page per screen root and per declared route, canonical URLs on the origin, document titles from the title template (the home page is titled with the site name alone), and the fallback head for an address that names no page. With indexing off no page is indexable. Fails when two screen extensions declare one token.
 * @param config - the site config
 * @param origin - the resolved origin
 * @param domainKey - the screen domain's key
 * @param extensions - the screen extensions of the composed packages
 * @param indexing - whether the build may be indexed
 */
// @cpt-algo:cpt-template-site-meta-algo-page-map-build-map:p1
// @cpt-dod:cpt-template-site-meta-dod-page-map-map:p1
export function buildPageMap(config: SiteConfig, origin: string, domainKey: string, extensions: readonly ScreenExtension[], indexing: Indexing = 'on'): SiteMetaMap {
  // @cpt-begin:cpt-template-site-meta-algo-page-map-build-map:p1:inst-if-duplicate-tokens
  const duplicates = duplicateTokens(extensions);
  if (duplicates.length > 0) throw new Error(duplicates.join('; '));
  // @cpt-end:cpt-template-site-meta-algo-page-map-build-map:p1:inst-if-duplicate-tokens
  const screens: Record<string, ScreenPages> = {};
  // @cpt-begin:cpt-template-site-meta-algo-page-map-build-map:p1:inst-foreach-screen
  for (const extension of extensions) {
    const token = screenToken(extension);
    // @cpt-begin:cpt-template-site-meta-algo-page-map-build-map:p1:inst-screen-block
    const seo = extension.seo ?? {};
    const isHomeScreen = token === config.homeScreen;
    // @cpt-end:cpt-template-site-meta-algo-page-map-build-map:p1:inst-screen-block
    // @cpt-begin:cpt-template-site-meta-algo-page-map-build-map:p1:inst-build-page
    const page = (route: string, fields: SeoFields, inherited: SeoFields): PageMeta => {
      const address = addressOf(domainKey, token, route);
      const title = fields.title ?? inherited.title ?? extension.presentation?.label ?? token;
      const ogImage = fields.ogImage ?? inherited.ogImage;
      return {
        canonical: `${origin}${address}`,
        address,
        screen: token,
        route,
        title,
        documentTitle: documentTitle(config, title, isHomeScreen && route === '/'),
        description: fields.description ?? inherited.description ?? config.defaultDescription,
        // @cpt-begin:cpt-template-site-meta-algo-page-map-build-map:p1:inst-if-indexing-off
        indexable: indexing === 'on' && (fields.indexable ?? !isPattern(route)),
        // @cpt-end:cpt-template-site-meta-algo-page-map-build-map:p1:inst-if-indexing-off
        ...(ogImage ? { ogImage } : {}),
      };
    };
    // @cpt-end:cpt-template-site-meta-algo-page-map-build-map:p1:inst-build-page
    // @cpt-begin:cpt-template-site-meta-algo-page-map-build-map:p1:inst-root-page
    const pages: Record<string, PageMeta> = { '/': page('/', seo, {}) };
    // @cpt-end:cpt-template-site-meta-algo-page-map-build-map:p1:inst-root-page
    // @cpt-begin:cpt-template-site-meta-algo-page-map-build-map:p1:inst-foreach-route
    const patterns: PageMeta[] = [];
    for (const [route, fields] of Object.entries(seo.routes ?? {})) {
      const resolved = page(route, fields, { ogImage: seo.ogImage });
      if (isPattern(route)) patterns.push(resolved);
      else pages[route] = resolved;
    }
    // @cpt-end:cpt-template-site-meta-algo-page-map-build-map:p1:inst-foreach-route
    // @cpt-begin:cpt-template-site-meta-algo-page-map-build-map:p1:inst-record-screen
    screens[token] = { extension: extension.id, label: extension.presentation?.label ?? token, order: extension.presentation?.order ?? Number.MAX_SAFE_INTEGER, pages, patterns };
    // @cpt-end:cpt-template-site-meta-algo-page-map-build-map:p1:inst-record-screen
  }
  // @cpt-end:cpt-template-site-meta-algo-page-map-build-map:p1:inst-foreach-screen
  // @cpt-begin:cpt-template-site-meta-algo-page-map-build-map:p1:inst-if-unknown-home
  const home = Object.hasOwn(screens, config.homeScreen) ? screens[config.homeScreen]?.pages['/'] : undefined;
  if (!home) throw new Error(`site.config.json.homeScreen "${config.homeScreen}" names no screen of the site`);
  // @cpt-end:cpt-template-site-meta-algo-page-map-build-map:p1:inst-if-unknown-home
  // @cpt-begin:cpt-template-site-meta-algo-page-map-build-map:p1:inst-fallback-page
  const fallback: PageMeta = {
    canonical: home.canonical,
    address: home.address,
    screen: null,
    route: '/',
    title: config.siteName,
    documentTitle: config.siteName,
    description: config.defaultDescription,
    indexable: false,
  };
  // @cpt-end:cpt-template-site-meta-algo-page-map-build-map:p1:inst-fallback-page
  // @cpt-begin:cpt-template-site-meta-algo-page-map-build-map:p1:inst-return-map
  return {
    siteName: config.siteName,
    origin,
    locale: config.locale,
    twitterCard: config.twitterCard,
    ...(config.ogImage ? { ogImage: new URL(config.ogImage.replace(/^\/(?!\/)/, ''), `${origin}/`).href } : {}),
    ...(config.ogImage && config.ogImageAlt ? { ogImageAlt: config.ogImageAlt } : {}),
    ...(config.themeColor ? { themeColor: config.themeColor } : {}),
    domainKey,
    routeParam: ROUTE_PARAM,
    home,
    fallback,
    screens,
  };
  // @cpt-end:cpt-template-site-meta-algo-page-map-build-map:p1:inst-return-map
}

/** Every page of the map with an address of its own (static pages), screens in menu order, pages in declaration order. */
// @cpt-begin:cpt-template-site-meta-algo-page-map-build-map:p1:inst-static-pages
export function staticPages(map: SiteMetaMap): PageMeta[] {
  return Object.values(map.screens)
    .sort((a, b) => a.order - b.order)
    .flatMap((screen) => Object.values(screen.pages));
}
// @cpt-end:cpt-template-site-meta-algo-page-map-build-map:p1:inst-static-pages
