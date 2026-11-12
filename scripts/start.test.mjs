import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildEnv, effectiveOrigin, isFresh, markSetup, needsSetup, stamp, stepOutcome } from './start.mjs';

const GB = 1024 ** 3;
const ORIGIN = 'https://a.example';

describe('isFresh', () => {
  let root;
  const BUILT = 2_000_000;

  /**
   * Writes a file under the temporary repository, dated `seconds` (epoch).
   * @param {string} file
   */
  function put(file, seconds = BUILT - 100) {
    const full = path.join(root, file);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, file.endsWith('.json') ? '{}' : 'x');
    utimesSync(full, seconds, seconds);
  }

  const env = { SITE_ORIGIN: ORIGIN };
  const stampPath = () => path.join(root, 'site', '.dist-stamp');

  /**
   * Runs a build's two stamp steps, `--stamp-begin` then `--stamp`, dating the stamp at `seconds`, the build's start.
   * @param {number} [seconds]
   * @param {NodeJS.ProcessEnv} [given]
   */
  function build(seconds = BUILT, given = env) {
    expect(stamp('begin', { root, env: given })).toBeNull();
    utimesSync(`${stampPath()}.pending`, seconds, seconds);
    expect(stamp('end', { root, env: given })).toBeNull();
  }

  const where = (origin = ORIGIN) => ({ root, origin });

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'start-'));
    put('site.config.json');
    put('template-site/frontx-template.json');
    put('template-site/src/a.ts');
    put('site/src-app/b.ts');
    put('site/dist/index.html', BUILT);
    build();
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('is fresh when the stamp is no older than every input, an input as old as the stamp included', () => {
    put('site/src-app/b.ts', BUILT);
    build();
    expect(isFresh(where())).toBe(true);
  });

  it('is stale without site/dist/index.html', () => {
    rmSync(path.join(root, 'site', 'dist', 'index.html'));
    expect(isFresh(where())).toBe(false);
  });

  it.each([
    ['removed by a build that began and never finished', () => stamp('begin', { root, env })],
    ['not a record, an older format', () => writeFileSync(stampPath(), '2026-11-06T00:00:00Z\n')],
    ['malformed', () => writeFileSync(stampPath(), '{"origin":')],
  ])('is stale when the stamp is %s', (_name, change) => {
    change();
    expect(isFresh(where())).toBe(false);
  });

  it('is stale when the build baked in another origin', () => {
    expect(isFresh(where('https://b.example'))).toBe(false);
  });

  it("records the origin npm start checks with: site.config.json's, else the local server on PORT", () => {
    writeFileSync(path.join(root, 'site.config.json'), JSON.stringify({ origin: 'https://b.example' }));
    utimesSync(path.join(root, 'site.config.json'), BUILT - 100, BUILT - 100);
    build(BUILT, {});
    expect(isFresh(where('https://b.example'))).toBe(true);
    writeFileSync(path.join(root, 'site.config.json'), '{}');
    utimesSync(path.join(root, 'site.config.json'), BUILT - 100, BUILT - 100);
    build(BUILT, { PORT: '3000' });
    expect(isFresh(where('http://localhost:3000'))).toBe(true);
  });

  it('is stale when the build baked in another indexing mode, and reads a stamp with no mode as on', () => {
    expect(isFresh({ ...where(), indexing: 'on' })).toBe(true);
    build(BUILT, { ...env, SITE_INDEXING: 'off' });
    expect(JSON.parse(readFileSync(stampPath(), 'utf8')).indexing).toBe('off');
    expect(isFresh(where())).toBe(false);
    expect(isFresh({ ...where(), indexing: 'off' })).toBe(true);
    const { origin, digest } = JSON.parse(readFileSync(stampPath(), 'utf8'));
    writeFileSync(stampPath(), JSON.stringify({ origin, digest }));
    utimesSync(stampPath(), BUILT, BUILT);
    expect(isFresh(where())).toBe(true);
    expect(isFresh({ ...where(), indexing: 'off' })).toBe(false);
  });

  it('refuses to close the stamp with no build in progress', () => {
    expect(stamp('end', { root, env })).toMatch(/no pending stamp/);
  });

  it('refuses to close the stamp without site/dist/index.html', () => {
    stamp('begin', { root, env });
    rmSync(path.join(root, 'site', 'dist', 'index.html'));
    expect(stamp('end', { root, env })).toMatch(/did not finish/);
  });

  it('counts a link below an input as a file and does not follow it out of the inputs', () => {
    const outside = mkdtempSync(path.join(tmpdir(), 'outside-'));
    writeFileSync(path.join(outside, 'a.ts'), 'x');
    // A junction needs no privileges on Windows; elsewhere the type is ignored.
    symlinkSync(outside, path.join(root, 'site', 'linked'), 'junction');
    try {
      expect(isFresh(where())).toBe(false);
      // The build's start after the link, so the test needs no API that sets a link's own time.
      build(Math.floor(Date.now() / 1000) + 60);
      writeFileSync(path.join(outside, 'b.ts'), 'x');
      expect(isFresh(where())).toBe(true);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('follows an input that is itself a link', () => {
    const target = mkdtempSync(path.join(tmpdir(), 'assets-'));
    writeFileSync(path.join(target, 'a.json'), '{}');
    symlinkSync(target, path.join(root, 'assets'), 'junction');
    try {
      build(Math.floor(Date.now() / 1000) + 60);
      expect(isFresh(where())).toBe(true);
      writeFileSync(path.join(target, 'b.json'), '{}');
      expect(isFresh(where())).toBe(false);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });

  it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)('is stale while an input folder cannot be read', () => {
    const locked = path.join(root, 'site', 'locked');
    mkdirSync(locked);
    build();
    chmodSync(locked, 0);
    try {
      expect(isFresh(where())).toBe(false);
    } finally {
      chmodSync(locked, 0o755);
    }
  });

  it('refuses to open the stamp with a site.config.json it cannot read, keeping the last one as it was', () => {
    const before = readFileSync(stampPath(), 'utf8');
    writeFileSync(path.join(root, 'site.config.json'), '{');
    expect(stamp('begin', { root, env })).toMatch(/cannot read site.config.json/);
    expect(readFileSync(stampPath(), 'utf8')).toBe(before);
  });

  it('refuses to open the stamp with a PORT npm start refuses, and the build stays fresh', () => {
    const before = readFileSync(stampPath(), 'utf8');
    expect(stamp('begin', { root, env: { ...env, PORT: 'abc' } })).toMatch(/PORT must be an integer/);
    expect(readFileSync(stampPath(), 'utf8')).toBe(before);
    expect(isFresh(where())).toBe(true);
  });

  it('is stale when a new template appears', () => {
    put('template-new/frontx-template.json', BUILT - 100);
    expect(isFresh(where())).toBe(false);
  });

  it.each([
    'template-site/src/a.ts',
    'site.config.json',
    'package.json',
    'package-lock.json',
    'scripts/x.mjs',
    'assets/rasters.json',
    'site/src-app/b.ts',
    'site/package.json',
    'site/package-lock.json',
    'site/vite.config.ts',
    'site/index.html',
    'site/packages/react/src/i.ts',
  ])('is stale when %s is newer than the stamp', (file) => {
    put(file, BUILT + 10);
    expect(isFresh(where())).toBe(false);
  });

  it('is stale when an input file is deleted, with nothing newer', () => {
    rmSync(path.join(root, 'template-site', 'src', 'a.ts'));
    expect(isFresh(where())).toBe(false);
  });

  it('is stale when an input file is added with an old time, as a move or an archive keeps it', () => {
    put('template-site/src/moved.ts', BUILT - 100);
    expect(isFresh(where())).toBe(false);
  });

  it.each([
    'template-site/node_modules/p/i.js',
    'template-site/dist/a.js',
    'site/src-app/x/@mf-types/t.d.ts',
    'template-site/.cache/c',
    'site/src-app/coverage/c.json',
    'site/public/generated-mfe-manifests.json',
    'other/a.ts',
    'template-like/a.ts',
  ])('ignores a new %s', (file) => {
    put(file, BUILT + 10);
    expect(isFresh(where())).toBe(true);
  });
});

describe('needsSetup', () => {
  let site;

  beforeEach(() => {
    site = mkdtempSync(path.join(tmpdir(), 'setup-'));
    mkdirSync(path.join(site, 'node_modules'));
    writeFileSync(path.join(site, 'package-lock.json'), '{"lockfileVersion":3}');
    markSetup(site);
  });
  afterEach(() => rmSync(site, { recursive: true, force: true }));

  it('skips setup for an install a finished setup marked from the current lockfile', () => {
    expect(needsSetup(site)).toBe(false);
  });

  it.each([
    ['an install carries no mark, as one npm ci stopped midway leaves it', () => rmSync(path.join(site, 'node_modules', '.frontx-setup'))],
    ['the lockfile changed since', () => writeFileSync(path.join(site, 'package-lock.json'), '{"lockfileVersion":3,"packages":{}}')],
  ])('runs setup when %s', (_name, change) => {
    change();
    expect(needsSetup(site)).toBe(true);
  });
});

describe('effectiveOrigin', () => {
  it.each([
    ['SITE_ORIGIN first', { SITE_ORIGIN: ORIGIN }, 'https://b.example', ORIGIN],
    ["site.config.json's without it", {}, 'https://b.example', 'https://b.example'],
    ['the local server without either', {}, undefined, 'http://localhost:3000'],
  ])('takes %s', (_name, env, configOrigin, expected) => {
    expect(effectiveOrigin(env, configOrigin, 3000)).toBe(expected);
  });
});

describe('buildEnv', () => {
  const laptop = { constrained: 0, total: 16 * GB };
  const port = 8080;

  it.each([
    ['a constrained limit under the total', { constrained: GB, total: 8 * GB }, 768],
    ['the total under a larger constrained value', { constrained: 16 * GB, total: 8 * GB }, 6144],
    ['the total when constrained memory is 0', { constrained: 0, total: 8 * GB }, 6144],
    ['the total when constrained memory is about 2^64', { constrained: 2 ** 64, total: 8 * GB }, 6144],
  ])('sizes the heap to 75%% of %s, one MFE build at a time', (_name, memory, mb) => {
    const { env } = buildEnv({ SITE_ORIGIN: ORIGIN, NODE_OPTIONS: '--enable-source-maps' }, { port, memory });
    expect(env.NODE_OPTIONS).toBe(`--enable-source-maps --max-old-space-size=${mb}`);
    expect(env.FRONTX_BUILD_CONCURRENCY).toBe('1');
  });

  it('keeps a FRONTX_BUILD_CONCURRENCY the environment sets', () => {
    const { env } = buildEnv({ SITE_ORIGIN: ORIGIN, FRONTX_BUILD_CONCURRENCY: '3' }, { port, memory: laptop });
    expect(env.FRONTX_BUILD_CONCURRENCY).toBe('3');
  });

  it.each(['--max-old-space-size=512', '--max_old_space_size=512'])('keeps a heap NODE_OPTIONS already sets (%s), still one MFE build at a time', (flag) => {
    const { env, notes } = buildEnv({ SITE_ORIGIN: ORIGIN, NODE_OPTIONS: flag }, { port, memory: { constrained: GB, total: 8 * GB } });
    expect(env.NODE_OPTIONS).toBe(flag);
    expect(env.FRONTX_BUILD_CONCURRENCY).toBe('1');
    expect(notes.join('\n')).not.toContain('--max-old-space-size');
  });

  it.each([
    [8080, 'http://localhost:8080'],
    [3000, 'http://localhost:3000'],
  ])('defaults SITE_ORIGIN to the local server on port %i with a warning', (given, origin) => {
    const { env, notes } = buildEnv({}, { port: given, memory: laptop });
    expect(env.SITE_ORIGIN).toBe(origin);
    expect(notes.join('\n')).toMatch(/SITE_ORIGIN is not set.*Set SITE_ORIGIN/);
  });

  it.each([
    ['the environment', { SITE_ORIGIN: ORIGIN }, undefined, ORIGIN],
    ['site.config.json', {}, 'https://b.example', undefined],
  ])('keeps an origin %s names, without a warning', (_name, given, configOrigin, expected) => {
    const { env, notes } = buildEnv(given, { configOrigin, port, memory: laptop });
    expect(env.SITE_ORIGIN).toBe(expected);
    expect(notes.filter((note) => note.includes('SITE_ORIGIN'))).toEqual([]);
  });
});

describe('stepOutcome', () => {
  it.each([
    ['a clean exit goes on', 0, null, null, null],
    ['a failure stops with its code', 2, null, null, { message: 'failed with exit code 2', exitCode: 2 }],
    ['a negative code stops with 1', -2, null, null, { message: 'failed with exit code -2', exitCode: 1 }],
    ['a child stopped by SIGTERM stops with 143', null, 'SIGTERM', null, { message: 'stopped by SIGTERM', exitCode: 143 }],
    ['a forwarded SIGINT stops with 130 even when the child exits 0', 0, null, 'SIGINT', { message: 'stopped by SIGINT', exitCode: 130 }],
    ['a forwarded SIGINT on Windows, where the child reports a code, stops with 130', 1, null, 'SIGINT', { message: 'stopped by SIGINT', exitCode: 130 }],
  ])('%s', (_name, code, signal, stopped, expected) => {
    expect(stepOutcome(code, /** @type {NodeJS.Signals | null} */ (signal), /** @type {NodeJS.Signals | null} */ (stopped))).toEqual(expected);
  });
});

describe('the build and setup scripts', () => {
  const scripts = JSON.parse(readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8')).scripts;

  it('opens the stamp after the composition and closes it as its last step, so a build that stops midway is never fresh', () => {
    const steps = scripts.build.split(' && ');
    expect(steps.slice(0, 2)).toEqual(['npm run site:assemble', 'node scripts/start.mjs --stamp-begin']);
    expect(steps.at(-1)).toBe('node scripts/start.mjs --stamp');
  });

  it('installs the build tools and marks the install as its last step, so an install that stops midway runs again', () => {
    const steps = scripts.setup.split(' && ');
    expect(steps).toContain('npm ci --include=dev --prefix site');
    expect(steps.at(-1)).toBe('node scripts/start.mjs --setup-done');
  });
});
