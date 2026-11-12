import { within, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import data from '../../data/libraries.generated.json';
import en from './i18n/en.json';
import { CATALOGUE_SCREEN_EXTENSION, SHOW_TEMPLATE_ACTION, SITE_SCREEN_EXTENSIONS } from '@site-shared/navigation/siteScreens';
import { chainOf, openChain } from '@site-shared/test-support/screenLinks';
import { renderLibsAt } from '../../test-support/renderAt';

vi.mock('@gears-frontx/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@gears-frontx/react')>();
  return {
    ...actual,
    apiRegistry: { getService: () => ({ getLibraries: { key: ['site-libs', 'GET', '/libraries'] } }) },
    useApiQuery: () => ({ data, isLoading: false, isError: false }),
  };
});

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('[]')));
  vi.stubGlobal('scrollTo', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('LibsPage', () => {
  it('lists every library with its version, its install command and its source at the published commit, the UI kit first with a link to its catalogue', async () => {
    const { bridge } = renderLibsAt('/');
    await screen.findByRole('heading', { level: 1, name: en['libraries.title'] });
    for (const library of data.libraries) {
      const card = screen.getByText(`${library.package} ${library.version}`, { selector: 'code' }).closest('li');
      expect(card?.textContent?.includes(`npm install ${library.package}@${library.version}`)).toBe(true);
      expect(within(card as HTMLElement).getAllByRole('link').map((link) => link.getAttribute('href'))).toContain(library.sourceUrl);
    }
    const first = screen.getAllByRole('heading', { level: 2 })[0];
    expect(first.textContent).toBe(en['libraries.pkg.ui-kit.title']);
    expect(chainOf(bridge, screen.getByRole('link', { name: en['libraries.openKit'] }))).toEqual(openChain(CATALOGUE_SCREEN_EXTENSION));
    expect(chainOf(bridge, screen.getByRole('link', { name: en['libraries.siteTemplates.inbox'] }))).toEqual(openChain(SITE_SCREEN_EXTENSIONS.templates, { type: SHOW_TEMPLATE_ACTION, payload: { template: 'template-inbox' } }));
  });

  it("lists every template of this repository under \"Site templates\", in the templates guide's order, each linking its page on the templates screen", async () => {
    // The templates screen's guide is the one list of this repository's templates: its groups that are not featured on the templates index are the ones this list carries.
    const guides = import.meta.glob<{ groups: { templates: string[]; featured?: boolean }[] }>('../../../../site-templates-mfe/src/content/guide.json', { eager: true, import: 'default' });
    const guide = Object.values(guides)[0];
    expect(guide).toBeDefined();
    const slugs = guide?.groups.filter((group) => !group.featured).flatMap((group) => group.templates) ?? [];
    expect(slugs.length).toBeGreaterThan(0);
    const { bridge } = renderLibsAt('/');
    const section = (await screen.findByRole('heading', { level: 2, name: en['libraries.siteTemplates.title'] })).closest('section');
    const chains = within(section as HTMLElement).getAllByRole('link').map((link) => chainOf(bridge, link));
    expect(chains).toEqual(slugs.map((slug) => openChain(SITE_SCREEN_EXTENSIONS.templates, { type: SHOW_TEMPLATE_ACTION, payload: { template: slug } })));
  });

  it("lists the shell template's workspace packages without an install command, and shows no contributor's fork", async () => {
    renderLibsAt('/');
    const group = (await screen.findByRole('heading', { level: 2, name: en['libraries.shell.title'] })).closest('section');
    for (const entry of data.shellPackages) expect(group?.textContent).toContain(`${entry.package} ${entry.version}`);
    expect(group?.textContent).not.toContain('npm install');
    for (const link of document.querySelectorAll('a[href^="https://github.com/"]')) expect(link.getAttribute('href')).toContain('https://github.com/constructorfabric/');
  });

  it('marks the current page in the tab bar, and the libraries tab alone on the screen root', async () => {
    renderLibsAt('/routing');
    const tabs = await screen.findByRole('navigation', { name: en['tabs.label'] });
    expect(within(tabs).getByRole('link', { name: en['tabs.routing'] }).getAttribute('aria-current')).toBe('page');
    expect(within(tabs).getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page')).toHaveLength(1);
  });

  it('fills the versions of a summary from the data and links its plain-text twin', async () => {
    renderLibsAt('/routing');
    await screen.findByRole('heading', { level: 1, name: en['routing.title'] });
    expect(document.body.textContent).toContain(`@gears-frontx/routing ${data.vars.routingVersion}`);
    const rail = screen.getByRole('navigation', { name: en['chrome.onThisPage'] });
    expect(within(rail).getByTestId('page-twin').getAttribute('href')).toBe('./libs/routing.md');
  });

  it('moves keyboard focus to the heading an "On this page" item jumps to', async () => {
    renderLibsAt('/mfes');
    const rail = await screen.findByRole('navigation', { name: en['chrome.onThisPage'] });
    fireEvent.click(within(rail).getByRole('button', { name: new RegExp(en['mfes.bridge.title']) }));
    const heading = screen.getByRole('heading', { level: 2, name: en['mfes.bridge.title'] });
    expect(document.activeElement).toBe(heading);
  });
});

describe('LibsPage in a build that leaves the catalogue out', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('shows the UI kit card without its link to the catalogue', async () => {
    vi.stubEnv('VITE_SITE_HIDDEN_SCREENS', JSON.stringify([CATALOGUE_SCREEN_EXTENSION]));
    vi.resetModules();
    const { renderLibsAt: renderPublished } = await import('../../test-support/renderAt');
    renderPublished('/');
    await screen.findByRole('heading', { level: 1, name: en['libraries.title'] });
    expect(screen.getAllByRole('heading', { level: 2 })[0]?.textContent).toBe(en['libraries.pkg.ui-kit.title']);
    expect(screen.queryByRole('link', { name: en['libraries.openKit'] })).toBeNull();
  });
});

