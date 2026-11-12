#!/usr/bin/env node
// Checks a built site/dist before it is published (architecture/DESIGN.md section 3.8, "Deployment topology"). The GitHub Pages workflows run it on the build they upload:
//   node scripts/indexing-check.mjs indexed <origin>   the production build: the canonical address of the document sits on <origin>, robots.txt allows crawling and names the sitemap, the sitemap lists pages
//   node scripts/indexing-check.mjs unindexed          a preview: every HTML file and every page of the page map the document carries is noindex, robots.txt disallows every path, the sitemap lists no address and no llms.txt is published
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { isEntryPoint } from './entry-point.mjs';

/** The robots tag of a document, `undefined` when it has none. */
const robotsOf = (html) => /<meta\s+name="robots"\s+content="([^"]*)"/i.exec(html)?.[1];
/** The page map head-sync reads, inlined in the document by template-site-meta. */
const pageMapOf = (html) => {
  const json = /<script type="application\/json" id="site-meta-map">([\s\S]*?)<\/script>/.exec(html)?.[1];
  return json === undefined ? undefined : JSON.parse(json);
};
const read = (dist, file) => (fs.existsSync(path.join(dist, file)) ? fs.readFileSync(path.join(dist, file), 'utf8') : undefined);

/** Every HTML file under a folder, relative to it. */
function htmlFiles(dir, prefix = '') {
  return fs
    .readdirSync(path.join(dir, prefix), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const relative = path.join(prefix, entry.name);
      if (entry.isDirectory()) return htmlFiles(dir, relative);
      return entry.name.endsWith('.html') ? [relative] : [];
    });
}

/**
 * What keeps a production build from being published on its origin, as messages.
 * @param {string} dist - the built site
 * @param {string} origin - the address the site is served from
 * @returns {string[]}
 */
// @cpt-algo:cpt-site-algo-production-build-layout-check-indexing:p2
export function indexedFindings(dist, origin) {
  const findings = [];
  // @cpt-begin:cpt-site-algo-production-build-layout-check-indexing:p2:inst-check-indexed
  const base = `${origin.replace(/\/+$/, '')}/`;
  const html = read(dist, 'index.html') ?? '';
  const canonical = /<link\s+rel="canonical"\s+href="([^"]*)"/i.exec(html)?.[1];
  if (!canonical?.startsWith(base)) findings.push(`index.html: the canonical address is ${canonical ?? 'missing'}, not on ${base}`);
  if (robotsOf(html) !== 'index, follow') findings.push(`index.html: robots is ${robotsOf(html) ?? 'missing'}, not "index, follow"`);
  const robots = read(dist, 'robots.txt') ?? '';
  if (!/^Allow: \/$/m.test(robots) || /^Disallow: \/$/m.test(robots)) findings.push('robots.txt does not allow crawling');
  if (!robots.includes(`Sitemap: ${base}sitemap.xml`)) findings.push(`robots.txt does not name ${base}sitemap.xml`);
  if (!(read(dist, 'sitemap.xml') ?? '').includes(`<loc>${base}`)) findings.push(`sitemap.xml lists no address on ${base}`);
  // @cpt-end:cpt-site-algo-production-build-layout-check-indexing:p2:inst-check-indexed
  return findings;
}

/**
 * What keeps a preview build from being published unindexed, as messages.
 * @param {string} dist - the built site
 * @returns {string[]}
 */
export function unindexedFindings(dist) {
  const findings = [];
  // @cpt-begin:cpt-site-algo-production-build-layout-check-indexing:p2:inst-check-html
  for (const file of htmlFiles(dist)) {
    const robots = robotsOf(fs.readFileSync(path.join(dist, file), 'utf8'));
    if (!robots?.split(/\s*,\s*/).includes('noindex')) findings.push(`${file.split(path.sep).join('/')}: robots is ${robots ?? 'missing'}, not noindex`);
  }
  // @cpt-end:cpt-site-algo-production-build-layout-check-indexing:p2:inst-check-html
  // @cpt-begin:cpt-site-algo-production-build-layout-check-indexing:p2:inst-check-page-map
  const map = pageMapOf(read(dist, 'index.html') ?? '');
  if (!map) findings.push('index.html carries no page map');
  else {
    const pages = [['home', map.home], ['fallback', map.fallback], ...Object.entries(map.screens ?? {}).flatMap(([token, screen]) => [...Object.values(screen.pages ?? {}), ...(screen.patterns ?? [])].map((page) => [`${token} ${page.route}`, page]))];
    for (const [name, page] of pages) if (page?.indexable !== false) findings.push(`index.html page map: ${name} is indexable`);
  }
  // @cpt-end:cpt-site-algo-production-build-layout-check-indexing:p2:inst-check-page-map
  // @cpt-begin:cpt-site-algo-production-build-layout-check-indexing:p2:inst-check-discovery
  if (read(dist, 'robots.txt') !== 'User-agent: *\nDisallow: /\n') findings.push('robots.txt is not "User-agent: *" and "Disallow: /"');
  if ((read(dist, 'sitemap.xml') ?? '').includes('<url>')) findings.push('sitemap.xml lists an address');
  if (read(dist, 'llms.txt') !== undefined) findings.push('llms.txt is published');
  // @cpt-end:cpt-site-algo-production-build-layout-check-indexing:p2:inst-check-discovery
  // @cpt-begin:cpt-site-algo-production-build-layout-check-indexing:p2:inst-return-findings
  return findings;
  // @cpt-end:cpt-site-algo-production-build-layout-check-indexing:p2:inst-return-findings
}

if (isEntryPoint(import.meta.url)) {
  // @cpt-begin:cpt-site-algo-production-build-layout-check-indexing:p2:inst-run-check
  const dist = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'site', 'dist');
  const [mode, origin] = process.argv.slice(2);
  if ((mode !== 'indexed' || !origin) && mode !== 'unindexed') {
    console.error('usage: node scripts/indexing-check.mjs indexed <origin> | unindexed');
    process.exit(2);
  }
  const findings = mode === 'indexed' ? indexedFindings(dist, origin) : unindexedFindings(dist);
  for (const finding of findings) console.error(`indexing-check: ${finding}`);
  if (findings.length > 0) process.exit(1);
  console.log(mode === 'indexed' ? `indexing-check: site/dist is indexable on ${origin}` : 'indexing-check: no page of site/dist may be indexed');
  // @cpt-end:cpt-site-algo-production-build-layout-check-indexing:p2:inst-run-check
}
