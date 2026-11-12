// template-site prunes an outline before a screen renders it, and template-site-meta prunes the same outlines before it renders their plain-text twins. Each template carries its own copy of the rule (`shared/site/content/publish.ts`, `src/publish.ts`); this test holds the two to the same results on every outline the templates ship and on the cases the rule names.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as site from '../template-site/src-app/mfe_packages/shared/site/content/publish.ts';
import * as meta from '../template-site-meta/src-app/verify_packages/site-meta/src/publish.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTLINE = /^outline(\.generated)?\.json$/;

/** Every outline file under the templates' packages. */
function outlines() {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (OUTLINE.test(entry.name)) found.push(file);
    }
  };
  for (const name of fs.readdirSync(root).filter((dir) => dir.startsWith('template-'))) {
    const packages = path.join(root, name, 'src-app', 'mfe_packages');
    if (fs.existsSync(packages)) walk(packages);
  }
  return found.sort();
}

/** Every screen extension id the outlines link, so each outline is pruned once per screen. */
function linkedScreens(value, ids = new Set()) {
  if (Array.isArray(value)) value.forEach((item) => linkedScreens(item, ids));
  else if (value && typeof value === 'object') {
    if (typeof value.extension === 'string') ids.add(value.extension);
    Object.values(value).forEach((item) => linkedScreens(item, ids));
  }
  return ids;
}

describe('the two copies of the publishing rule', () => {
  const files = outlines();

  it('find the outlines the templates ship', () => {
    expect(files.length).toBeGreaterThan(3);
  });

  it.each(files.map((file) => [path.relative(root, file)]))('prune %s alike for every screen it links, and for all of them at once', (relative) => {
    const outline = JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
    const screens = [...linkedScreens(outline)];
    const cases = [...screens.map((id) => ({ hiddenScreens: [id], hiddenEntries: [] })), { hiddenScreens: screens, hiddenEntries: ['home-teams'] }];
    for (const publishing of cases) expect(meta.pruneOutline(outline, publishing)).toEqual(site.pruneOutline(outline, publishing));
  });

  it('read the publishing build variables in template-site only, and hide nothing without them', () => {
    expect(site.sitePublishing(undefined)).toEqual({ hiddenScreens: [], hiddenEntries: [] });
    expect(site.sitePublishing({ VITE_SITE_HIDDEN_SCREENS: '["ext.kit"]', VITE_SITE_HIDDEN_ENTRIES: '["home-teams"]' })).toEqual({ hiddenScreens: ['ext.kit'], hiddenEntries: ['home-teams'] });
    expect(() => site.sitePublishing({ VITE_SITE_HIDDEN_SCREENS: '"ext.kit"' })).toThrow('VITE_SITE_HIDDEN_SCREENS must be a JSON array of strings');
    expect(site.isPublished({ hiddenScreens: ['ext.kit'], hiddenEntries: [] }, 'ext.kit')).toBe(false);
    expect(site.isPublished({ hiddenScreens: ['ext.kit'], hiddenEntries: [] }, 'ext.docs')).toBe(true);
  });
});
