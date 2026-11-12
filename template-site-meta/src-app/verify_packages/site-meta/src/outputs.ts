/**
 * The generated outputs: `sitemap.xml`, `robots.txt`, `llms.txt`, `seo-manifest.json` and the head of `index.html`, each a pure function of the page map.
 */
import { headTagsFor, MAP_ELEMENT_ID } from './head-sync.ts';
import type { PageMeta, SiteMetaMap } from './page-map.ts';
import { staticPages, type Indexing, type LlmsSection, type SiteConfig } from './site.ts';
import type { Twin } from './twins.ts';

/** The site-level icon files the head and the web manifest link: the Constructor Fabric brand set under the shell's `public/brand/`, which the build ships into `dist/`. The paths are relative: the document and the web manifest sit at the top of `dist/`, and screens are addressed in the query string, so they resolve wherever the site is mounted. */
// @cpt-algo:cpt-template-site-meta-algo-seo-outputs-icon-set:p1
// @cpt-begin:cpt-template-site-meta-algo-seo-outputs-icon-set:p1:inst-icon-files
export const SITE_ASSETS = {
  iconIco: 'brand/favicon.ico',
  icon32: 'brand/favicon-32.png',
  appleTouchIcon: 'brand/apple-touch-icon.png',
  icon192: 'brand/icon-192.png',
  icon512: 'brand/icon-512.png',
  iconMaskable512: 'brand/icon-maskable-512.png',
} as const;
// @cpt-end:cpt-template-site-meta-algo-seo-outputs-icon-set:p1:inst-icon-files

/** The web manifest's path in `dist/`, linked relative to the document; the generator writes it. */
// @cpt-begin:cpt-template-site-meta-algo-seo-outputs-icon-set:p1:inst-manifest-path
export const WEB_MANIFEST = 'site.webmanifest';
// @cpt-end:cpt-template-site-meta-algo-seo-outputs-icon-set:p1:inst-manifest-path

// @cpt-begin:cpt-template-site-meta-algo-seo-outputs-sitemap-robots:p1:inst-escape-xml
function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
// @cpt-end:cpt-template-site-meta-algo-seo-outputs-sitemap-robots:p1:inst-escape-xml

// @cpt-begin:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-escape-html
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// @cpt-end:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-escape-html

/** Every indexable page's canonical URL, screens in menu order; no `lastmod`, no pattern routes. */
// @cpt-algo:cpt-template-site-meta-algo-seo-outputs-sitemap-robots:p1
// @cpt-dod:cpt-template-site-meta-dod-seo-outputs-discovery-files:p1
export function renderSitemap(map: SiteMetaMap): string {
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-sitemap-robots:p1:inst-indexable-urls
  const urls = staticPages(map)
    .filter((page) => page.indexable)
    .map((page) => `  <url>\n    <loc>${escapeXml(page.canonical)}</loc>\n  </url>`);
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-sitemap-robots:p1:inst-indexable-urls
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-sitemap-robots:p1:inst-return-sitemap
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-sitemap-robots:p1:inst-return-sitemap
}

/** Crawling allowed with the sitemap's address; with indexing off, every path disallowed and no sitemap named. */
export function renderRobots(map: SiteMetaMap, indexing: Indexing = 'on'): string {
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-sitemap-robots:p1:inst-if-indexing-off
  if (indexing === 'off') return 'User-agent: *\nDisallow: /\n';
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-sitemap-robots:p1:inst-if-indexing-off
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-sitemap-robots:p1:inst-return-robots
  return `User-agent: *\nAllow: /\n\nSitemap: ${map.origin}/sitemap.xml\n`;
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-sitemap-robots:p1:inst-return-robots
}

/** A published package's own `llms.txt`, linked from the site's. */
export interface PackageLlms {
  readonly name: string;
  readonly url: string;
  readonly description: string;
}

// @cpt-begin:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-group-title
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).replace(/-/g, ' ');
}
// @cpt-end:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-group-title

// @cpt-begin:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-page-line
function linkLine(page: PageMeta): string {
  return `- [${page.title}](${page.canonical}): ${page.description}`;
}
// @cpt-end:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-page-line

/**
 * `llms.txt` (the llmstxt.org shape): the site name, its summary, one section per screen in menu order with each indexable page linked by its canonical URL and described; a screen's pages under a common first path segment (`/components/...`) are grouped under that segment; then the plain-text twins of the outline pages, then the published `llms.txt` of the packages the site documents, then the sections the site config adds.
 * @param map - the site's page map
 * @param summary - the site summary (`defaultDescription`)
 * @param packages - published package `llms.txt` files to link
 * @param twins - the plain-text twins of the outline pages
 * @param sections - the site config's `llmsSections`
 */
// @cpt-algo:cpt-template-site-meta-algo-seo-outputs-llms:p1
export function renderLlms(map: SiteMetaMap, summary: string, packages: readonly PackageLlms[], twins: readonly Twin[] = [], sections: readonly LlmsSection[] = []): string {
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-header
  const lines = [`# ${map.siteName}`, '', `> ${summary}`, ''];
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-header
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-screens-in-order
  const screens = Object.values(map.screens).sort((a, b) => a.order - b.order);
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-screens-in-order
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-foreach-screen
  for (const screen of screens) {
    // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-indexable-pages
    const pages = Object.values(screen.pages).filter((page) => page.indexable);
    if (pages.length === 0) continue;
    // @cpt-end:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-indexable-pages
    // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-screen-heading
    lines.push(`## ${screen.label}`, '');
    // @cpt-end:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-screen-heading
    // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-group-pages
    const groups = new Map<string, PageMeta[]>();
    const direct: PageMeta[] = [];
    for (const page of pages) {
      const segments = page.route.split('/').filter(Boolean);
      if (segments.length > 1) {
        const group = segments[0] ?? '';
        groups.set(group, [...(groups.get(group) ?? []), page]);
      } else {
        direct.push(page);
      }
    }
    // @cpt-end:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-group-pages
    // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-direct-pages
    lines.push(...direct.map(linkLine));
    // @cpt-end:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-direct-pages
    // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-grouped-sections
    for (const [group, grouped] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      lines.push('', `### ${capitalize(group)}`, '', ...grouped.map(linkLine));
    }
    // @cpt-end:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-grouped-sections
    lines.push('');
  }
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-foreach-screen
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-twins-section
  if (twins.length > 0) {
    lines.push('## Plain-text pages', '');
    for (const twin of twins) {
      const page = map.screens[twin.screen]?.pages[twin.route];
      if (page) lines.push(`- [${twin.title ?? page.title}](${map.origin}${twin.path}): ${page.description}`);
    }
    lines.push('');
  }
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-twins-section
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-packages-section
  if (packages.length > 0) {
    lines.push('## Packages', '', ...packages.map((pkg) => `- [${pkg.name}](${pkg.url}): ${pkg.description}`), '');
  }
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-packages-section
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-config-sections
  for (const section of sections) {
    lines.push(`## ${section.heading}`, '', ...section.items.map((item) => `- ${item}`), '');
  }
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-config-sections
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-return-llms
  return `${lines.join('\n').replace(/\n+$/, '')}\n`;
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-llms:p1:inst-return-llms
}

/** The resolved page map as a file: site fields with the build's indexing, every page with an address keyed by its canonical URL, and the pattern routes. */
// @cpt-algo:cpt-template-site-meta-algo-seo-outputs-seo-manifest:p1
export function renderSeoManifest(map: SiteMetaMap, indexing: Indexing = 'on'): string {
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-seo-manifest:p1:inst-share-fields
  const og = (page: PageMeta) => ({
    title: page.documentTitle,
    description: page.description,
    url: page.canonical,
    type: 'website',
    siteName: map.siteName,
    locale: map.locale,
    ...(page.ogImage ?? map.ogImage ? { image: page.ogImage ?? map.ogImage } : {}),
  });
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-seo-manifest:p1:inst-share-fields
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-seo-manifest:p1:inst-page-entry
  const entry = (page: PageMeta) => ({
    address: page.address,
    screen: page.screen,
    route: page.route,
    title: page.title,
    documentTitle: page.documentTitle,
    description: page.description,
    indexable: page.indexable,
    og: og(page),
  });
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-seo-manifest:p1:inst-page-entry
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-seo-manifest:p1:inst-pages-by-canonical
  const pages = Object.fromEntries(staticPages(map).map((page) => [page.canonical, entry(page)]));
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-seo-manifest:p1:inst-pages-by-canonical
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-seo-manifest:p1:inst-patterns-apart
  const patterns = Object.values(map.screens)
    .sort((a, b) => a.order - b.order)
    .flatMap((screen) => screen.patterns)
    .map((page) => ({ addressPattern: page.address.replace(/%24/g, '$'), screen: page.screen, route: page.route, title: page.title, documentTitle: page.documentTitle, description: page.description, indexable: page.indexable }));
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-seo-manifest:p1:inst-patterns-apart
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-seo-manifest:p1:inst-return-manifest
  const manifest = {
    site: { siteName: map.siteName, origin: map.origin, indexing, locale: map.locale, home: map.home.canonical, domainKey: map.domainKey, routeParam: map.routeParam },
    pages,
    patterns,
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-seo-manifest:p1:inst-return-manifest
}

// @cpt-begin:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-block-delimiters
const BLOCK_START = '<!-- site-meta:start -->';
const BLOCK_END = '<!-- site-meta:end -->';
// @cpt-end:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-block-delimiters

/** Escapes JSON so it cannot close the script element it is inlined into (`\u003c` is the same character inside a JSON string). */
// @cpt-begin:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-inline-json
function inlineJson(text: string): string {
  return text.replace(/</g, '\\u003c');
}
// @cpt-end:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-inline-json

/** Escapes script source so it cannot close its script element: only `</script` and `<!--` are touched, which in valid source occur inside strings, regular expressions or comments, where `<\/` and `<\!--` mean the same. */
// @cpt-begin:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-inline-script
function inlineScript(text: string): string {
  return text.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
}
// @cpt-end:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-inline-script

/**
 * The built `index.html` with the site-level head: `<html lang>`, the site's name as title, its summary as description, the home page as canonical, robots, Open Graph and Twitter tags, the theme color, the icons and the web manifest link, the inlined page map and the head-sync script. The generated block is delimited, so generating again replaces it.
 * @param html - `site/dist/index.html` as the shell build wrote it, or as a previous generation left it
 * @param map - the site's page map
 * @param runtime - the bundled head-sync script
 */
// @cpt-algo:cpt-template-site-meta-algo-seo-outputs-index-html:p1
// @cpt-dod:cpt-template-site-meta-dod-seo-outputs-site-head:p1
export function renderIndexHtml(html: string, map: SiteMetaMap, runtime: string): string {
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-site-page
  // The site-level head: the site name and summary, canonical to the home page, which is also what a crawler that runs no script sees for any address.
  const sitePage: PageMeta = { ...map.fallback, indexable: map.home.indexable };
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-site-page
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-site-tags
  const tags = headTagsFor(map, sitePage).map((tag) => {
    if (tag.kind === 'link-rel') return `<link rel="${tag.key}" href="${escapeHtml(tag.value)}" />`;
    const attribute = tag.kind === 'meta-name' ? 'name' : 'property';
    return `<meta ${attribute}="${tag.key}" content="${escapeHtml(tag.value)}" />`;
  });
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-site-tags
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-asset-links
  const assets = [
    ...(map.themeColor ? [`<meta name="theme-color" content="${escapeHtml(map.themeColor)}" />`] : []),
    `<link rel="icon" href="${SITE_ASSETS.iconIco}" sizes="16x16 32x32 48x48" />`,
    `<link rel="icon" type="image/png" sizes="32x32" href="${SITE_ASSETS.icon32}" />`,
    `<link rel="apple-touch-icon" sizes="180x180" href="${SITE_ASSETS.appleTouchIcon}" />`,
    `<link rel="manifest" href="${WEB_MANIFEST}" />`,
  ];
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-asset-links
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-assemble-block
  const block = [
    BLOCK_START,
    ...tags,
    ...assets,
    `<script type="application/json" id="${MAP_ELEMENT_ID}">${inlineJson(JSON.stringify(map))}</script>`,
    `<script>${inlineScript(runtime.trim())}</script>`,
    BLOCK_END,
  ].join('\n    ');
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-assemble-block
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-remove-previous
  let out = html.replace(new RegExp(`\\s*${BLOCK_START}[\\s\\S]*?${BLOCK_END}`), '');
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-remove-previous
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-if-no-head
  if (!/<html[^>]*>/.test(out) || !/<\/head>/.test(out)) throw new Error('index.html has no <html> or </head>');
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-if-no-head
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-set-lang
  out = out.replace(/<html[^>]*>/, (tag) => (/\slang="[^"]*"/.test(tag) ? tag.replace(/\slang="[^"]*"/, () => ` lang="${map.locale}"`) : tag.replace('<html', () => `<html lang="${map.locale}"`)));
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-set-lang
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-set-title
  out = /<title>[\s\S]*?<\/title>/.test(out) ? out.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(map.siteName)}</title>`) : out.replace('</head>', () => `  <title>${escapeHtml(map.siteName)}</title>\n  </head>`);
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-set-title
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-place-block
  // The block goes right after <title>: the head-sync script then runs before the app's module scripts, which the browser defers.
  // A replacer function, not a replacement string: the bundled script contains `$&` and other sequences a replacement string would expand.
  return out.replace(/<title>[\s\S]*?<\/title>/, (title) => `${title}\n    ${block}`);
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-index-html:p1:inst-place-block
}

/**
 * The web manifest: the site's name and summary, the home page as start URL, its colors and its icons.
 * @param map - the site's page map
 * @param config - the site config
 */
// @cpt-algo:cpt-template-site-meta-algo-seo-outputs-web-manifest:p2
// @cpt-dod:cpt-template-site-meta-dod-seo-outputs-web-manifest:p2
export function renderWebManifest(map: SiteMetaMap, config: SiteConfig): string {
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-web-manifest:p2:inst-manifest-fields
  const manifest = {
    name: map.siteName,
    short_name: config.shortName ?? map.siteName,
    description: config.defaultDescription,
    lang: map.locale,
    // Relative to the manifest, which sits next to the document: the home page under any mount point.
    start_url: `.${map.home.address}`,
    display: 'browser',
    ...(map.themeColor ? { theme_color: map.themeColor } : {}),
    ...(config.backgroundColor ? { background_color: config.backgroundColor } : {}),
    icons: [
      { src: SITE_ASSETS.icon192, sizes: '192x192', type: 'image/png' },
      { src: SITE_ASSETS.icon512, sizes: '512x512', type: 'image/png' },
      { src: SITE_ASSETS.iconMaskable512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-web-manifest:p2:inst-manifest-fields
  // @cpt-begin:cpt-template-site-meta-algo-seo-outputs-web-manifest:p2:inst-return-web-manifest
  return `${JSON.stringify(manifest, null, 2)}\n`;
  // @cpt-end:cpt-template-site-meta-algo-seo-outputs-web-manifest:p2:inst-return-web-manifest
}
