import { describe, expect, it } from 'vitest';
import { outlineKeys, parseOutline } from '@site-shared/content/outline';
import { pruneOutline } from '@site-shared/content/publish';
import outlineJson from './outline.json';
import strings from '../screens/home/i18n/en.json';
import { KIT_SAMPLES } from '../samples/kitSamples';
import { CATALOGUE_SCREEN_EXTENSION, SHOW_COMPONENT_ACTION, SITE_SCREEN_EXTENSIONS } from '@site-shared/navigation/siteScreens';
import { logoImage } from './logos';

const outline = parseOutline(outlineJson);

describe('home outline', () => {
  it('is one landing page whose entries are the home blocks, in the order of the page', () => {
    expect(outline.pages.map((page) => page.route)).toEqual(['/']);
    expect(outline.pages[0]?.entries.map((entry) => entry.type)).toEqual(['hero', 'features', 'architecture-map', 'change-story', 'kit-showcase', 'metric-comparison', 'logo-strip', 'get-started-steps', 'closing-cta']);
  });

  it('names a strings key that exists for every text, and uses every key the strings hold but the samples and the not-found page', () => {
    const used = new Set(outlineKeys(outline));
    expect([...used].filter((key) => !(key in strings))).toEqual([]);
    const own = /^kit\.sample\.|^not_found_/;
    expect(Object.keys(strings).filter((key) => !used.has(key) && !own.test(key))).toEqual([]);
  });

  it('names only logo files the screen supplies', () => {
    const files = outline.pages.flatMap((page) => page.entries.flatMap((entry) => (entry.type === 'logo-strip' ? entry.logos.map((logo) => logo.logo) : [])));
    expect(files.length).toBeGreaterThan(0);
    expect(files.filter((file) => logoImage(file) === undefined)).toEqual([]);
  });

  it('names only samples the screen registry draws', () => {
    const tiles = outline.pages.flatMap((page) => page.entries.flatMap((entry) => (entry.type === 'kit-showcase' ? entry.groups.flatMap((group) => group.tiles) : [])));
    expect(tiles.map((tile) => tile.sample)).toEqual([...KIT_SAMPLES]);
  });

  // The site's hand-written outlines name other screens by extension id and their pages by show action; a renamed screen, a dropped page or an action the target does not declare would send a chain the target refuses.
  it('links, in every hand-written outline of the template, only screens the site has and pages their show actions name, as the target declares them', () => {
    type Schema = { $id: string; properties: { target: { 'x-gts-ref': string }; payload: { required?: string[]; properties: Record<string, { enum?: string[] }> } } };
    type Manifest = { schemas?: Schema[]; entries: { id: string; actions: string[] }[]; extensions: { id: string; entry: string }[] };
    // Every package of the composed site: the template's own screens and the catalogue screen it depends on.
    const manifests = Object.values(import.meta.glob<Manifest>('../../../*/mfe.json', { eager: true, import: 'default' }));
    const outlines = Object.values(import.meta.glob<unknown>('../../../site-*-mfe/src/content/outline.json', { eager: true, import: 'default' }));
    expect(outlines).toHaveLength(3);
    const own = new Map(manifests.flatMap((manifest) => manifest.extensions.map((extension) => [extension.id, { manifest, extension }] as const)));
    const links: { extension: string; action?: { type: string; payload: Record<string, string> } }[] = [];
    const collect = (value: unknown): void => {
      if (Array.isArray(value)) value.forEach(collect);
      else if (value && typeof value === 'object') {
        if (typeof (value as { extension?: unknown }).extension === 'string') links.push(value as (typeof links)[number]);
        else Object.values(value).forEach(collect);
      }
    };
    outlines.forEach(collect);
    expect(links.length).toBeGreaterThan(0);
    expect(links.some((link) => link.extension === CATALOGUE_SCREEN_EXTENSION && link.action?.type === SHOW_COMPONENT_ACTION)).toBe(true);
    for (const link of links) {
      const label = JSON.stringify(link);
      expect([...Object.values(SITE_SCREEN_EXTENSIONS), CATALOGUE_SCREEN_EXTENSION], label).toContain(link.extension);
      const target = own.get(link.extension);
      expect(target, label).toBeDefined();
      if (!link.action || !target) continue;
      const entry = target.manifest.entries.find((candidate) => candidate.id === target.extension.entry);
      expect(entry?.actions, label).toContain(link.action.type);
      const schema = target.manifest.schemas?.find((candidate) => candidate.$id === `gts://${link.action?.type}`);
      expect(schema?.properties.target['x-gts-ref'], label).toBe(link.extension);
      expect(Object.keys(link.action.payload).sort(), label).toEqual([...(schema?.properties.payload.required ?? [])].sort());
      for (const [property, value] of Object.entries(link.action.payload)) expect(schema?.properties.payload.properties[property]?.enum, label).toContain(value);
    }
  });

  // A site that leaves the other screens out of its build prunes every outline of the template before rendering it (`publish.ts`); the pruned outline must still be one the model accepts, with no link left to a screen the site leaves out.
  it('still parses, in every outline of the template, with every screen but those of the template left out and the logo strip hidden, and links none of the screens left out', () => {
    const outlines = Object.entries(import.meta.glob<unknown>('../../../site-*-mfe/src/content/outline*.json', { eager: true, import: 'default' }));
    expect(outlines).toHaveLength(4);
    const own = new Set<string>(Object.values(SITE_SCREEN_EXTENSIONS));
    const linked = new Set<string>();
    const collect = (value: unknown): void => {
      if (Array.isArray(value)) value.forEach(collect);
      else if (value && typeof value === 'object') {
        const extension = (value as { extension?: unknown }).extension;
        if (typeof extension === 'string') linked.add(extension);
        Object.values(value).forEach(collect);
      }
    };
    outlines.forEach(([, value]) => collect(value));
    const hiddenScreens = [...linked].filter((id) => !own.has(id));
    expect(hiddenScreens).toContain(CATALOGUE_SCREEN_EXTENSION);
    for (const [file, value] of outlines) {
      const pruned = parseOutline(pruneOutline(value, { hiddenScreens, hiddenEntries: ['home-teams'] }));
      const text = JSON.stringify(pruned);
      expect(hiddenScreens.filter((id) => text.includes(id)), file).toEqual([]);
    }
    const home = parseOutline(pruneOutline(outlineJson, { hiddenScreens, hiddenEntries: ['home-teams'] })).pages[0];
    expect(home?.entries.map((entry) => entry.type)).toEqual(['hero', 'features', 'architecture-map', 'change-story', 'metric-comparison', 'get-started-steps', 'closing-cta']);
    const map = home?.entries.find((entry) => entry.type === 'architecture-map');
    expect(map?.type === 'architecture-map' && map.map.kit.href).toBeUndefined();
  });

  // The architecture drawing needs its two screen nodes; a node whose screen the site leaves out stays as plain text, as every other map node does.
  it('keeps both screen nodes of the architecture map when one links a screen left out, that one without its link', () => {
    const value = structuredClone(outlineJson) as { pages: { entries: { type: string; map?: { screens: { href?: unknown }[] } }[] }[] };
    const screens = value.pages[0]?.entries.find((entry) => entry.type === 'architecture-map')?.map?.screens ?? [];
    screens[1] = { ...screens[1], href: { extension: CATALOGUE_SCREEN_EXTENSION } };
    const pruned = parseOutline(pruneOutline(value, { hiddenScreens: [CATALOGUE_SCREEN_EXTENSION], hiddenEntries: [] })).pages[0];
    const map = pruned?.entries.find((entry) => entry.type === 'architecture-map');
    expect(map?.type === 'architecture-map' && map.map.screens.map((node) => ({ title: node.title, hint: node.hint, extension: node.href && 'extension' in node.href ? node.href.extension : undefined }))).toEqual([
      { title: 't:architecture.screenA', hint: 't:architecture.screenHint', extension: SITE_SCREEN_EXTENSIONS.templates },
      { title: 't:architecture.screenB', hint: 't:architecture.screenHint', extension: undefined },
    ]);
  });
});
