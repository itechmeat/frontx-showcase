// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { check, generate } from './generate.ts';
import { renderRobots } from './outputs.ts';
import { pruneOutline } from './publish.ts';
import { buildPageMap, resolveIndexing } from './site.ts';
import { CONFIG } from './test-support/fixtures.ts';
import { makeProject, write } from './test-support/project.ts';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

const ORIGIN = 'https://site.example';
const read = (paths: { dist: string }, file: string) => fs.readFileSync(path.join(paths.dist, file), 'utf8');
type MapPage = { indexable: boolean };
type InlinedMap = { home: MapPage; fallback: MapPage; screens: Record<string, { pages: Record<string, MapPage>; patterns: MapPage[] }> };
const pageMapOf = (html: string): InlinedMap => JSON.parse(/<script type="application\/json" id="site-meta-map">([\s\S]*?)<\/script>/.exec(html)?.[1] ?? '{}');

/** A home outline that links the demo screen three ways: a card, a labelled link and a map-like node. */
function writeHomeOutline(paths: { packages: string }) {
  write(path.join(paths.packages, 'home-mfe', 'src', 'i18n', 'en.json'), { title: 'Home' });
  write(path.join(paths.packages, 'home-mfe', 'src', 'content', 'outline.json'), {
    screen: 'home',
    strings: 'src/i18n/en.json',
    pages: [
      {
        route: '/',
        title: 't:title',
        lead: 'Welcome.',
        entries: [
          { type: 'card-tiles', items: [{ title: 'Demo', href: { extension: 'ext.demo' } }, { title: 'Source', href: { url: 'https://source.example/' } }] },
          { type: 'cta-box', title: 'Try it', text: 'Open the demo.', action: { label: 'Open', href: { extension: 'ext.demo' } } },
          { type: 'logo-strip', id: 'home-teams', title: 'Teams', logos: [{ name: 'Team', logo: 'team.svg', width: 1, height: 1, href: { url: 'https://team.example/' } }] },
        ],
      },
    ],
  });
}

describe('resolveIndexing', () => {
  it('is on by default, takes on and off, and refuses any other value', () => {
    expect(resolveIndexing({})).toBe('on');
    expect(resolveIndexing({ SITE_INDEXING: 'on' })).toBe('on');
    expect(resolveIndexing({ SITE_INDEXING: 'off' })).toBe('off');
    for (const value of ['', 'OFF', 'no', 'false']) expect(() => resolveIndexing({ SITE_INDEXING: value })).toThrow(`SITE_INDEXING is "${value}"`);
  });
});

describe('indexing off', () => {
  it('makes no page indexable, pattern routes and the home page included', () => {
    const extension = { id: 'ext.home', route: '/home', packageName: 'home-mfe', seo: { title: 'Home', routes: { '/$id': { title: 'One' }, '/open': { title: 'Open', indexable: true } } } };
    const map = buildPageMap(CONFIG, ORIGIN, 'screen', [extension], 'off');
    const home = map.screens.home;
    expect(map.home.indexable).toBe(false);
    expect([...Object.values(home?.pages ?? {}), ...(home?.patterns ?? [])].map((page) => page.indexable)).toEqual([false, false, false]);
    expect(renderRobots(map, 'off')).toBe('User-agent: *\nDisallow: /\n');
  });

  it('generates noindex heads, a sitemap without addresses, a robots.txt that disallows everything and no llms.txt; check holds and refuses a planted llms.txt', async () => {
    const paths = makeProject(roots);
    write(path.join(paths.dist, 'llms.txt'), 'left by an indexable build\n');
    await generate({ paths }, { SITE_ORIGIN: ORIGIN, SITE_INDEXING: 'off' });
    const html = read(paths, 'index.html');
    expect(html).toContain('<meta name="robots" content="noindex, follow" />');
    expect(html).not.toContain('content="index, follow"');
    const map = pageMapOf(html);
    const pages = [map.home, map.fallback, ...Object.values(map.screens).flatMap((screen) => [...Object.values(screen.pages), ...screen.patterns])];
    expect(pages.every((page) => page.indexable === false)).toBe(true);
    expect(read(paths, 'sitemap.xml')).not.toContain('<url>');
    expect(read(paths, 'robots.txt')).toBe('User-agent: *\nDisallow: /\n');
    expect(fs.existsSync(path.join(paths.dist, 'llms.txt'))).toBe(false);
    expect(JSON.parse(read(paths, 'seo-manifest.json')).site.indexing).toBe('off');
    expect(await check({ paths })).toEqual({ errors: [], compared: true });
    write(path.join(paths.dist, 'llms.txt'), 'planted\n');
    expect((await check({ paths })).errors).toEqual(['dist/llms.txt is published although the build may not be indexed; run npm run seo:generate']);
  });

  it('leaves an indexing-on build as it was: index, follow, the sitemap address and llms.txt', async () => {
    const paths = makeProject(roots);
    await generate({ paths }, { SITE_ORIGIN: ORIGIN });
    expect(read(paths, 'index.html')).toContain('<meta name="robots" content="index, follow" />');
    expect(read(paths, 'robots.txt')).toBe(`User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
    expect(read(paths, 'sitemap.xml')).toContain(`<loc>${ORIGIN}/?screen=home</loc>`);
    expect(fs.existsSync(path.join(paths.dist, 'llms.txt'))).toBe(true);
    expect(JSON.parse(read(paths, 'seo-manifest.json')).site.indexing).toBe('on');
  });
});

describe('unpublishedScreens', () => {
  it('leaves an unpublished screen out of every output and prunes the links published outlines hold to it', async () => {
    const paths = makeProject(roots);
    writeHomeOutline(paths);
    write(paths.config, { ...CONFIG, unpublishedScreens: ['demo'], hiddenEntries: ['home-teams'] });
    const written = await generate({ paths }, { SITE_ORIGIN: ORIGIN });
    expect(written.filter((file) => file.endsWith('.md'))).toEqual(['dist/home/index.md']);
    for (const file of ['index.html', 'seo-manifest.json', 'sitemap.xml', 'llms.txt', 'home/index.md']) expect(read(paths, file)).not.toMatch(/screen=demo/);
    expect(Object.keys(pageMapOf(read(paths, 'index.html')).screens)).toEqual(['home']);
    const twin = read(paths, 'home/index.md');
    expect(twin).toContain('[Source](https://source.example/)');
    expect(twin).not.toContain('Try it');
    expect(twin).not.toContain('Teams');
    expect(await check({ paths })).toEqual({ errors: [], compared: true });
  });

  it('publishes every screen when the list is absent', async () => {
    const paths = makeProject(roots);
    writeHomeOutline(paths);
    await generate({ paths }, { SITE_ORIGIN: ORIGIN });
    expect(read(paths, 'sitemap.xml')).toContain(`<loc>${ORIGIN}/?screen=demo</loc>`);
    expect(read(paths, 'home/index.md')).toContain(`[Demo](${ORIGIN}/?screen=demo)`);
    expect(read(paths, 'home/index.md')).toContain('Teams');
  });

  it('refuses a token no screen declares, the home screen, and a list that is not one of strings', async () => {
    const paths = makeProject(roots);
    write(paths.config, { ...CONFIG, unpublishedScreens: ['nope'] });
    await expect(generate({ paths }, { SITE_ORIGIN: ORIGIN })).rejects.toThrow('site.config.json.unpublishedScreens names "nope", which no screen of the site declares');
    write(paths.config, { ...CONFIG, unpublishedScreens: ['home'] });
    await expect(generate({ paths }, { SITE_ORIGIN: ORIGIN })).rejects.toThrow('site.config.json.unpublishedScreens names the home screen "home"');
    write(paths.config, { ...CONFIG, hiddenEntries: 'home-teams' });
    await expect(generate({ paths }, { SITE_ORIGIN: ORIGIN })).rejects.toThrow('site.config.json: hiddenEntries must be a list of non-empty strings');
  });
});

describe('pruneOutline', () => {
  const hidden = { hiddenScreens: ['ext.hidden'], hiddenEntries: ['gone'] };
  const page = (entries: unknown[], extra: Record<string, unknown> = {}) => ({ screen: 's', strings: 'x', pages: [{ route: '/', title: 't', lead: 'l', ...extra, entries }] });
  const entriesOf = (value: unknown) => (value as { pages: { entries: unknown[] }[] }).pages[0]?.entries;
  const toHidden = { extension: 'ext.hidden' };
  const toShown = { extension: 'ext.shown' };

  it('returns the outline as it is when nothing is hidden', () => {
    const outline = page([{ type: 'links', lead: 'x', items: [{ label: 'a', href: toHidden }] }]);
    expect(pruneOutline(outline, { hiddenScreens: [], hiddenEntries: [] })).toBe(outline);
  });

  it('drops a list item that links a hidden screen and keeps the rest of the list', () => {
    expect(entriesOf(pruneOutline(page([{ type: 'card-tiles', items: [{ title: 'a', href: toHidden }, { title: 'b', href: toShown }] }]), hidden))).toEqual([{ type: 'card-tiles', items: [{ title: 'b', href: toShown }] }]);
  });

  it('drops an entry whose list empties, or whose labelled link names a hidden screen, and an entry hidden by id', () => {
    const entries = [
      { type: 'card-tiles', items: [{ title: 'a', href: toHidden }] },
      { type: 'cta-box', title: 't', text: 'x', action: { label: 'go', href: toHidden } },
      { type: 'logo-strip', id: 'gone', title: 't', logos: [] },
      { type: 'paragraph', text: 'kept' },
    ];
    expect(entriesOf(pruneOutline(page(entries), hidden))).toEqual([{ type: 'paragraph', text: 'kept' }]);
  });

  it('keeps a node that is neither a list item nor a labelled link, without its link, and drops what goes from a property that is not a list item', () => {
    const map = { type: 'architecture-map', id: 'm', map: { kit: { title: 'Kit', href: toHidden }, rules: { title: 'Rules', href: toShown } } };
    const explorer = { type: 'file-explorer', id: 'e', example: { title: 't', text: 'x', screens: [{ title: 'a', href: toHidden }], open: { label: 'open', href: toHidden } } };
    expect(entriesOf(pruneOutline(page([map, explorer]), hidden))).toEqual([
      { type: 'architecture-map', id: 'm', map: { kit: { title: 'Kit' }, rules: { title: 'Rules', href: toShown } } },
      { type: 'file-explorer', id: 'e', example: { title: 't', text: 'x' } },
    ]);
  });

  it('keeps every page, its entries list and a back link to a shown screen, and drops a back link to a hidden one', () => {
    const pruned = pruneOutline(page([{ type: 'card-tiles', items: [{ title: 'a', href: toHidden }] }], { back: { label: 'back', href: toHidden } }), hidden) as { pages: Record<string, unknown>[] };
    expect(pruned.pages).toEqual([{ route: '/', title: 't', lead: 'l', entries: [] }]);
    const kept = pruneOutline(page([], { back: { label: 'back', href: toShown } }), hidden) as { pages: Record<string, unknown>[] };
    expect(kept.pages[0]?.back).toEqual({ label: 'back', href: toShown });
  });
});
