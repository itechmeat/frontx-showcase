import { render, screen, within } from '@testing-library/react';
import { FRONTX_SHARED_PROPERTY_LANGUAGE } from '@gears-frontx/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMfeBridgeFixture } from '@frontx-test-utils/createMfeBridgeFixture';
import { CATALOGUE_SCREEN_EXTENSION, SHOW_COMPONENT_ACTION, SHOW_GUIDE_ACTION, SHOW_TEMPLATE_ACTION, SITE_SCREEN_EXTENSIONS } from '@site-shared/navigation/siteScreens';
import { chainOf, openChain } from '@site-shared/test-support/screenLinks';
import en from './i18n/en.json';
import { HomeScreen } from './HomeScreen';

function bridge() {
  return createMfeBridgeFixture({
    extDomainId: 'gts.frontx.mfes.ext.domain.v1~frontx.screensets.layout.screen.v1',
    extensionId: 'ext.home',
    initialProperties: { [FRONTX_SHARED_PROPERTY_LANGUAGE]: 'en' },
  }).bridge;
}

const template = (name: string) => openChain(SITE_SCREEN_EXTENSIONS.templates, { type: SHOW_TEMPLATE_ACTION, payload: { template: name } });
const guide = (name: string) => openChain(SITE_SCREEN_EXTENSIONS.docs, { type: SHOW_GUIDE_ACTION, payload: { guide: name } });
const component = (name: string) => openChain(CATALOGUE_SCREEN_EXTENSION, { type: SHOW_COMPONENT_ACTION, payload: { component: name } });

async function renderHome() {
  const fixture = bridge();
  render(<HomeScreen bridge={fixture} />);
  await screen.findByRole('heading', { level: 1, name: en['hero.title'] });
  return fixture;
}

describe('HomeScreen', () => {
  it('renders one level-one heading and every section of the landing page', async () => {
    await renderHome();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    for (const key of ['groundwork.title', 'architecture.title', 'change.title', 'kit.title', 'ai.title', 'teams.title', 'steps.title', 'cta.title'] as const) {
      expect(screen.getByRole('heading', { level: 2, name: en[key] })).toBeTruthy();
    }
    expect(screen.getByRole('figure', { name: en['architecture.map'] })).toBeTruthy();
  });

  it('links every block of the architecture map to the page behind it, the screens through their template', async () => {
    const fixture = await renderHome();
    const map = screen.getByRole('figure', { name: en['architecture.map'] });
    const chains = within(map)
      .getAllByRole('link')
      .map((link) => [link.textContent, chainOf(fixture, link)]);
    expect(chains).toEqual([
      [en['architecture.shell'], template('template-shell')],
      [en['architecture.screensLink'], template('template-mfe')],
      [en['architecture.kit'], openChain(CATALOGUE_SCREEN_EXTENSION)],
      [en['architecture.rules'], template('template-design-guardrails')],
      [en['architecture.screenA'], template('template-mfe')],
      [en['architecture.screenB'], template('template-mfe')],
    ]);
  });

  it('opens the docs screen at its root through the screen domain, and keeps the source an external address', async () => {
    const fixture = await renderHome();
    expect(chainOf(fixture, screen.getByTestId('home-get-started'))).toEqual(openChain(SITE_SCREEN_EXTENSIONS.docs));
    expect(screen.getByTestId('home-source').getAttribute('href')).toBe('https://github.com/constructorfabric/gears-frontx');
  });

  it("opens a page of another screen with one chain: mount_ext, then that screen's own show action, never its route", async () => {
    const fixture = await renderHome();
    expect(chainOf(fixture, screen.getByTestId('home-kit-button'))).toEqual(component('button'));
  });

  it('links each UI kit tile to its catalogue page, with the sample kept out of focus', async () => {
    const fixture = await renderHome();
    const tile = screen.getByTestId('home-kit-button');
    expect(chainOf(fixture, tile)).toEqual(component('button'));
    const card = tile.parentElement;
    expect(card?.querySelector('[inert]')).toBeTruthy();
    expect(within(card as HTMLElement).getAllByRole('link')).toHaveLength(1);
  });

  it('shows the worked first change as the one-line change the upstream locale file really has', async () => {
    await renderHome();
    // The diff is headed by the file's full path.
    expect(screen.getByText(en['change.path'])).toBeTruthy();
    expect(en['change.path'].endsWith('/ i18n/en.json')).toBe(true);
    // The upstream _blank-mfe locale file is one line of JSON that opens with the title key, never a line of its own.
    expect(en['change.before'].startsWith('{"title": "Home", ')).toBe(true);
    expect(en['change.after']).toBe(en['change.before'].replace('"Home"', '"Project overview"'));
    const before = screen.getByText(en['change.before']);
    const after = screen.getByText(en['change.after']);
    expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The prompt the agent gets, with its emphasis.
    expect(screen.getByText(en['change.prompt.emphasis']).tagName).toBe('STRONG');
  });

  it('links all four chart tiles to the catalogue chart page and draws a sample in each', async () => {
    const fixture = await renderHome();
    for (const key of ['area', 'bar', 'distribution', 'trends']) {
      const tile = screen.getByTestId(`home-kit-${key}`);
      expect(chainOf(fixture, tile)).toEqual(component('chart'));
      expect(tile.parentElement?.querySelector('[inert] .recharts-wrapper')).toBeTruthy();
    }
    expect(screen.getByRole('heading', { level: 3, name: en['kit.group.charts'] })).toBeTruthy();
    // The reference design's data shape: eight pairs of bars, one per point of the area and trend series.
    const bars = screen.getByTestId('home-kit-bar').parentElement?.querySelectorAll('.recharts-bar-rectangle');
    expect(bars).toHaveLength(16);
  });

  it('labels the table tile for the plain table page it links to', async () => {
    const fixture = await renderHome();
    const tile = screen.getByTestId('home-kit-table');
    expect(tile.textContent).toBe(en['kit.tile.table']);
    expect(chainOf(fixture, tile)).toEqual(component('table'));
  });

  it('describes the foundation without unsupported measurements or chart proportions', async () => {
    await renderHome();
    const section = screen.getByRole('heading', { level: 2, name: en['ai.title'] }).closest('section') as HTMLElement;
    expect(section.querySelector('.recharts-wrapper')).toBeNull();
    expect(section.querySelector('[data-has-chart="true"]')).toBeNull();
    expect(section.textContent).not.toContain('Illustrative comparison');
    for (const key of ['delivery', 'review', 'checks'] as const) {
      const title = within(section).getByRole('heading', { level: 3, name: en[`ai.${key}.title`] });
      const card = title.closest('li') as HTMLElement;
      expect(within(card).getByText(en[`ai.${key}.statement`])).toBeTruthy();
      expect(within(card).getByText(en[`ai.${key}.text`])).toBeTruthy();
    }
    // The kit's chart container injects a style sheet with generated ids; only the words a reader sees count.
    const shown = section.cloneNode(true) as HTMLElement;
    shown.querySelectorAll('style').forEach((sheet) => sheet.remove());
    expect(shown.textContent).not.toMatch(/\d/);
  });

  it('names the teams using FrontX between the comparison and the steps, each logo a link to the company named by it', async () => {
    await renderHome();
    const section = (key: 'ai.title' | 'teams.title' | 'steps.title') => screen.getByRole('heading', { level: 2, name: en[key] }).closest('section') as HTMLElement;
    const band = section('teams.title');
    expect(section('ai.title').compareDocumentPosition(band) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(band.compareDocumentPosition(section('steps.title')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const companies = [
      ['Acronis', 'https://www.acronis.com/'],
      ['Virtuozzo', 'https://www.virtuozzo.com/'],
      ['Constructor Tech', 'https://constructor.tech/'],
      ['Aracor', 'https://aracor.ai/'],
    ] as const;
    expect(within(band).getAllByRole('link')).toHaveLength(companies.length);
    for (const [name, href] of companies) {
      expect(within(band).getByRole('link', { name }).getAttribute('href')).toBe(href);
      expect(within(band).getByRole('img', { name }).getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
    }
  });

  it('closes with the call to action to the getting started guide and the source', async () => {
    const fixture = await renderHome();
    const band = screen.getByRole('heading', { level: 2, name: en['cta.title'] }).closest('section') as HTMLElement;
    expect(chainOf(fixture, within(band).getByRole('link', { name: new RegExp(en['cta.getStarted']) }))).toEqual(guide('get-started'));
    expect(within(band).getByRole('link', { name: new RegExp(en['cta.source']) }).getAttribute('href')).toBe('https://github.com/constructorfabric/gears-frontx');
  });
});

describe('HomeScreen in a build that leaves the catalogue out and hides the logo strip', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('shows no UI kit section, no logo strip and no link to the catalogue; the architecture map keeps the kit as plain text', async () => {
    vi.stubEnv('VITE_SITE_HIDDEN_SCREENS', JSON.stringify([CATALOGUE_SCREEN_EXTENSION]));
    vi.stubEnv('VITE_SITE_HIDDEN_ENTRIES', JSON.stringify(['home-teams']));
    vi.resetModules();
    const { HomeScreen: PublishedHome } = await import('./HomeScreen');
    const fixture = bridge();
    render(<PublishedHome bridge={fixture} />);
    await screen.findByRole('heading', { level: 1, name: en['hero.title'] });
    expect(screen.queryByRole('heading', { level: 2, name: en['kit.title'] })).toBeNull();
    expect(screen.queryByRole('heading', { level: 2, name: en['teams.title'] })).toBeNull();
    expect(screen.queryByTestId('home-kit-button')).toBeNull();
    // A link to another screen has no address; its chain names the screen it opens.
    const chains = screen
      .getAllByRole('link')
      .filter((link) => !link.hasAttribute('href'))
      .map((link) => JSON.stringify(chainOf(fixture, link)));
    expect(chains.filter((chain) => chain.includes(CATALOGUE_SCREEN_EXTENSION))).toEqual([]);
    const map = screen.getByRole('figure', { name: en['architecture.map'] });
    expect(within(map).getByText(en['architecture.kit']).closest('a')).toBeNull();
  });
});
