import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NOT_FOUND_ROUTE, runnerArgs, verifyUiRoutes } from './verify-ui.mjs';

describe('verifyUiRoutes', () => {
  let root;
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'verify-ui-'));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const write = (relativePath, text) => {
    mkdirSync(path.dirname(path.join(root, relativePath)), { recursive: true });
    writeFileSync(path.join(root, relativePath), text);
  };

  const SCREEN_DOMAIN = 'gts.frontx.mfes.ext.domain.v1~frontx.screensets.layout.screen.v1';
  const screen = (token, order, seo = {}) => ({ id: `ext.${token}`, domain: SCREEN_DOMAIN, route: `/${token}`, presentation: { label: token, order }, seo });
  /** A composed site: home, then a demo screen with a sub-page that the build leaves out, the way site.config.json leaves screens out. */
  const assembled = (unpublishedScreens) => {
    write('site.config.json', JSON.stringify({ siteName: 'Site', titleTemplate: '%s | Site', homeScreen: 'home', defaultDescription: 'A site.', locale: 'en', twitterCard: 'summary', unpublishedScreens }));
    write('site/packages/framework/src/plugins/microfrontends/gts/frontx.screensets/instances/domains/screen.v1.json', JSON.stringify({ id: SCREEN_DOMAIN, route: 'screen' }));
    write('site/src-app/mfe_packages/home-mfe/mfe.json', JSON.stringify({ extensions: [screen('home', 10)] }));
    write('site/src-app/mfe_packages/demo-mfe/mfe.json', JSON.stringify({ extensions: [screen('demo', 20, { routes: { '/week': { title: 'Week' } } })] }));
  };

  it('takes every page of every screen in menu order, then every block showcase route, then the not-found route', async () => {
    assembled([]);
    const blocks = 'template-site-blocks/src-app/verify_packages/site-blocks/src/blocks';
    write(`${blocks}/PathCards/PathCards.showcase.tsx`, '');
    write(`${blocks}/Hero/Hero.showcase.tsx`, '');
    write(`${blocks}/Hero/Hero.tsx`, '');
    write(`${blocks}/NoFixture/NoFixture.tsx`, '');
    expect(await verifyUiRoutes(root)).toEqual(['/?screen=home', '/?screen=demo', '/?screen=demo;route=week', '/?screen=blocks;route=hero', '/?screen=blocks;route=path-cards', NOT_FOUND_ROUTE]);
  });

  it('keeps the pages of a screen the build leaves out, since npm run dev serves it', async () => {
    assembled(['demo']);
    expect(await verifyUiRoutes(root)).toEqual(['/?screen=home', '/?screen=demo', '/?screen=demo;route=week', NOT_FOUND_ROUTE]);
  });

  it('fails with a hint when the site has not been assembled', async () => {
    await expect(verifyUiRoutes(root)).rejects.toThrow(/npm run setup/);
  });
});

describe('runnerArgs', () => {
  it('runs the gate: dev server with the cold-start wait dev:smoke allows, both widths, light, the root baseline, new findings fail; later flags override', () => {
    const args = runnerArgs({ root: '/r', routes: ['/?screen=home', '/?screen=docs'], extra: ['--themes', 'light,dark'] });
    expect(args).toEqual([
      '--url', 'http://localhost:5173/',
      '--start-server', 'npm run dev:all',
      '--server-cwd', path.join('/r', 'site'),
      '--server-timeout-ms', '900000',
      '--routes', '/?screen=home,/?screen=docs',
      '--widths', '1440,390',
      '--themes', 'light',
      '--out', path.join('/r', 'design-verify-report'),
      '--baseline', path.join('/r', 'scripts', 'design-verify-baseline.json'),
      '--fail-on-findings',
      '--themes', 'light,dark',
    ]);
  });

  it('leaves the baseline out for the run the baseline is built from', () => {
    const args = runnerArgs({ root: '/r', routes: ['/'], extra: [], baseline: false });
    expect(args).not.toContain('--baseline');
    expect(args).not.toContain('--fail-on-findings');
  });
});
