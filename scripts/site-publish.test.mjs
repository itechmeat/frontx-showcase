import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { composedScreens, publishedAggregate, publishingChoices, publishingEnv, resolvePublishing, unpublishedFindings, withoutCode } from './site-publish.mjs';

const SCREEN = 'gts.frontx.mfes.ext.domain.v1~frontx.screensets.layout.screen.v1';
const WIDGETS = 'gts.frontx.mfes.ext.domain.v1~frontx.widgets.area.main.v1';
const ext = (name) => `ext.${name}`;

let site;

function write(file, content) {
  mkdirSync(path.dirname(path.join(site, file)), { recursive: true });
  writeFileSync(path.join(site, file), typeof content === 'string' ? content : JSON.stringify(content));
}

/** A composed package with screen extensions of the given tokens. */
function screenPackage(name, tokens, extra = {}) {
  write(`src-app/mfe_packages/${name}/mfe.json`, { ...extra, extensions: tokens.map((token) => ({ id: ext(token), domain: SCREEN, route: `/${token}` })) });
}

beforeEach(() => {
  site = mkdtempSync(path.join(tmpdir(), 'site-publish-'));
  write('packages/framework/src/plugins/microfrontends/gts/frontx.screensets/instances/domains/screen.v1.json', { id: SCREEN, route: 'screen' });
  screenPackage('home-mfe', ['home']);
  screenPackage('kit-mfe', ['kit']);
  screenPackage('demo-mfe', ['demo-a', 'demo-b']);
  screenPackage('example-mfe', ['example'], { templateExample: true });
  write('src-app/mfe_packages/shared/site/x.json', {});
});

afterEach(() => {
  rmSync(site, { recursive: true, force: true });
});

describe('publishingChoices and resolvePublishing', () => {
  it('publishes everything when the config has no lists', () => {
    expect(publishingChoices({})).toEqual({ unpublished: [], hiddenEntries: [] });
    expect(resolvePublishing({ homeScreen: 'home' }, composedScreens(site).screens)).toEqual({ unpublished: [], hiddenEntries: [], hiddenScreens: [] });
  });

  it('resolves unpublished tokens to their extension ids, reading screens with the scanner rules', () => {
    const { domainKey, screens } = composedScreens(site);
    expect(domainKey).toBe('screen');
    expect(screens.map((screen) => screen.token)).toEqual(['demo-a', 'demo-b', 'home', 'kit']);
    expect(resolvePublishing({ homeScreen: 'home', unpublishedScreens: ['kit', 'demo-b'], hiddenEntries: ['teams'] }, screens)).toEqual({ unpublished: ['kit', 'demo-b'], hiddenEntries: ['teams'], hiddenScreens: [ext('demo-b'), ext('kit')] });
  });

  it('refuses a list of the wrong shape, an unknown token, the home screen and a footer screen', () => {
    const { screens } = composedScreens(site);
    expect(() => publishingChoices({ unpublishedScreens: 'kit' })).toThrow('unpublishedScreens must be a list of non-empty strings');
    expect(() => resolvePublishing({ homeScreen: 'home', unpublishedScreens: ['nope'] }, screens)).toThrow('names nope, which no composed screen declares');
    expect(() => resolvePublishing({ homeScreen: 'home', unpublishedScreens: ['home'] }, screens)).toThrow('names the home screen home');
    expect(() => resolvePublishing({ homeScreen: 'home', unpublishedScreens: ['kit'], footerScreens: ['kit'] }, screens)).toThrow('footerScreens links kit');
  });

  it('carries the choices to the screens as JSON arrays in the build variables', () => {
    expect(publishingEnv({ hiddenScreens: [ext('kit')], hiddenEntries: [] })).toEqual({ VITE_SITE_HIDDEN_SCREENS: '["ext.kit"]', VITE_SITE_HIDDEN_ENTRIES: '[]' });
  });
});

describe('publishedAggregate', () => {
  const config = (id, extensions, domains) => ({ manifest: { id }, entries: extensions.map((extension) => ({ id: `${extension.id}.entry` })), extensions: extensions.map((extension) => ({ ...extension, entry: `${extension.id}.entry` })), ...(domains ? { domains: domains.map((domain) => ({ id: domain })) } : {}) });
  const screen = (name) => ({ id: ext(name), domain: SCREEN });
  const aggregate = () => [
    config('m.home', [screen('home')]),
    config('m.demo', [screen('demo-a'), screen('demo-b')], [WIDGETS]),
    config('m.widget', [{ id: ext('widget'), domain: WIDGETS }]),
    { manifest: { id: 'm.bare' }, entries: [], extensions: [] },
  ];

  it('keeps the aggregate when nothing is hidden', () => {
    expect(publishedAggregate(aggregate(), [])).toEqual({ configs: aggregate(), dropped: [] });
  });

  it('keeps a remote with a published screen, without the hidden screen and its entry', () => {
    const { configs, dropped } = publishedAggregate(aggregate(), [ext('demo-b')]);
    expect(dropped).toEqual([]);
    const demo = configs.find((item) => item.manifest.id === 'm.demo');
    expect(demo.extensions.map((extension) => extension.id)).toEqual([ext('demo-a')]);
    expect(demo.entries.map((entry) => entry.id)).toEqual([`${ext('demo-a')}.entry`]);
  });

  it('drops a remote whose every screen is hidden, then the remotes whose every extension sat in a domain only it declared, and keeps a remote that never had an extension', () => {
    const { configs, dropped } = publishedAggregate(aggregate(), [ext('demo-a'), ext('demo-b')]);
    expect(dropped).toEqual(['m.demo', 'm.widget']);
    expect(configs.map((item) => item.manifest.id)).toEqual(['m.home', 'm.bare']);
  });
});

describe('unpublishedFindings', () => {
  const publishing = { unpublished: ['kit', 'demo-a', 'demo-b'], hiddenEntries: [], hiddenScreens: [ext('demo-a'), ext('demo-b'), ext('kit')] };
  const outline = (entries) => ({ screen: 'home', strings: 'x', pages: [{ route: '/', title: 't', lead: 'l', entries }] });
  const clean = () => {
    write('dist/index.html', '<script id="site-meta-map">{"home":{"address":"/?screen=home"}}</script>');
    write('dist/sitemap.xml', '<loc>https://site.example/?screen=home</loc>');
    write('dist/home/index.md', '- [Home](https://site.example/?screen=home)\n\n```json\n{ "id": "ext.kit", "route": "/?screen=kit" }\n```\n');
    write('dist/generated-mfe-manifests.json', [{ extensions: [{ id: ext('home') }] }]);
    write('dist/mfe/home-mfe/remoteEntry.js', 'export {};');
    write('dist/mfe/home-mfe/assets/chunk.js', `"${ext('kit')}"`);
    write('src-app/mfe_packages/home-mfe/src/content/outline.json', outline([{ type: 'card-tiles', items: [{ title: 'Kit', href: { extension: ext('kit') } }, { title: 'Docs', href: { url: 'https://docs.example/' } }] }]));
    write('src-app/mfe_packages/home-mfe/src/i18n/en.json', { title: 'Home', note: 'see ?screen=kitchen, another screen' });
  };
  const findings = () => unpublishedFindings(site, composedScreens(site), publishing);

  it('finds nothing in a build that carries no unpublished screen, a link the page prunes and a remote bundle aside', () => {
    clean();
    expect(findings()).toEqual([]);
  });

  it('turns red on a planted address in content, in a twin and in the page map, on a laid-out remote and on an aggregate entry', () => {
    clean();
    write('src-app/mfe_packages/home-mfe/src/i18n/en.json', { title: 'Home', note: 'Open [the kit](?screen=kit;route=components/button).' });
    write('dist/home/index.md', '- [Kit](https://site.example/?screen=kit)');
    write('dist/index.html', '<script id="site-meta-map">{"kit":{"address":"/?screen=demo-a"}}</script>');
    write('dist/mfe/demo-mfe/remoteEntry.js', 'export {};');
    write('dist/generated-mfe-manifests.json', [{ extensions: [{ id: ext('kit') }] }]);
    expect(findings()).toEqual([
      'dist/mfe/demo-mfe/ is laid out, but every screen of it is unpublished',
      `dist/generated-mfe-manifests.json names the unpublished screen ${ext('kit')}`,
      'dist/home/index.md links the unpublished screen kit (screen=kit)',
      'dist/index.html links the unpublished screen demo-a (screen=demo-a)',
      'home-mfe/src/i18n/en.json links the unpublished screen kit (screen=kit)',
    ]);
  });

  it('turns red on an outline link the pruning cannot take out', () => {
    clean();
    write('src-app/mfe_packages/home-mfe/src/content/outline.json', outline([{ type: 'custom', target: { extension: ext('kit') } }]));
    expect(findings()).toEqual([`home-mfe/src/content/outline.json still links the unpublished screen ${ext('kit')} after pruning; the page would show the link`]);
  });
});

describe('withoutCode', () => {
  it('drops fenced blocks and inline code, where an address is quoted text, and keeps links', () => {
    const text = 'See [it](https://x/?screen=kit).\n\n```md\nOpen /?screen=kit\n```\n\nMeasure on `/?screen=kit;route=a` and ``a `b` c``.';
    expect(withoutCode(text)).toBe('See [it](https://x/?screen=kit).\n\n\n\nMeasure on  and .');
  });
});
