#!/usr/bin/env node
// `npm start`: installs the site when it has no finished install from its current lockfile, builds it when `site/dist` is not fresh, then serves it with scripts/serve-dist.mjs. For a Node host that runs only `npm start` after installing dependencies, with no build phase of its own (Virtuozzo Application Platform). `--no-build` or `START_SKIP_BUILD=1` serves only. `--setup-done` is the last step of `npm run setup`, which marks the install with its lockfile's digest; `--stamp-begin` and `--stamp` are internal to `npm run build`: the first, unless it refuses what `npm start` refuses, removes the stamp and opens a pending one when the build starts, the second turns it into the stamp when the build has finished.
// Temporary: remove once FrontX templates share the UI kit across MFEs and the build fits the default heap. Until then a start-triggered build gets a heap sized from the memory limit, and serving goes back to `node scripts/serve-dist.mjs`.
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { isEntryPoint } from './entry-point.mjs';
import { main as serve, parsePort } from './serve-dist.mjs';
import { findTemplateDirs } from './template-discovery.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The stamp of the last finished build, outside `site/dist` so the server never serves it; `.pending` is the stamp of a build in progress, dated at its start.
 * @param {string} root
 */
const stampFile = (root) => path.join(root, 'site', '.dist-stamp');

/** Directories that hold outputs or installs, never build inputs. */
const SKIPPED_DIRS = new Set(['node_modules', 'dist', 'dist-lib', '@mf-types', 'coverage']);
/** Files the build itself writes inside an input directory. */
const SKIPPED_FILES = new Set(['generated-mfe-manifests.json']);

/**
 * The build's inputs under the repository root: every template (a directory with `frontx-template.json`), the site's config, the root manifests and lockfile, the root scripts and assets, and the whole of `site/`.
 * @param {string} root
 * @returns {string[]}
 */
function buildInputs(root) {
  // @cpt-begin:cpt-site-algo-production-build-layout-dist-fresh:p2:inst-scan
  return [...findTemplateDirs(root), ...['site.config.json', 'package.json', 'package-lock.json', 'scripts', 'assets', 'site'].map((name) => path.join(root, name))];
  // @cpt-end:cpt-site-algo-production-build-layout-dist-fresh:p2:inst-scan
}

/**
 * The newest modification time (ms) of the input files and a digest of their paths, so a deleted, added or renamed file changes the digest. Outputs, installs, dot entries and the files the build writes are skipped.
 * @param {string} root - paths in the digest are relative to it
 * @param {string[]} inputs
 * @returns {{ newest: number, digest: string }}
 */
function scanInputs(root, inputs) {
  // @cpt-begin:cpt-site-algo-production-build-layout-dist-fresh:p2:inst-scan
  let newest = 0;
  const files = [];
  /**
   * @param {string} file
   * @param {boolean} top - an input itself, followed when it is a link
   */
  const walk = (file, top) => {
    let stat;
    try {
      // Below an input a link is not followed, so it cannot pull a tree outside the inputs, or a loop, into the scan; it counts as a file, its own path and time.
      stat = top ? fs.statSync(file) : fs.lstatSync(file);
    } catch {
      return;
    }
    if (!stat.isDirectory()) {
      newest = Math.max(newest, stat.mtimeMs);
      // Forward slashes, so a checkout gives one digest on every platform.
      files.push(path.relative(root, file).split(path.sep).join('/'));
      return;
    }
    let entries;
    try {
      entries = fs.readdirSync(file, { withFileTypes: true });
    } catch {
      // An unreadable folder counts as changed, so the build is never fresh by mistake.
      newest = Infinity;
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || SKIPPED_FILES.has(entry.name) || (entry.isDirectory() && SKIPPED_DIRS.has(entry.name))) continue;
      walk(path.join(file, entry.name), false);
    }
  };
  for (const input of inputs) walk(input, true);
  const digest = crypto.createHash('sha256').update(files.sort().join('\n')).digest('hex');
  return { newest, digest };
  // @cpt-end:cpt-site-algo-production-build-layout-dist-fresh:p2:inst-scan
}

/**
 * The stamp's record, or null when it is missing or not a record this script wrote. A record with no indexing mode is from a build that predates `SITE_INDEXING` and counts as `on`.
 * @param {string} stamp
 * @returns {{ time: number, origin: string, indexing: string, digest: string } | null}
 */
function readStamp(stamp) {
  try {
    const record = JSON.parse(fs.readFileSync(stamp, 'utf8'));
    if (typeof record?.origin !== 'string' || typeof record?.digest !== 'string') return null;
    if (record.indexing !== undefined && typeof record.indexing !== 'string') return null;
    return { time: fs.statSync(stamp).mtimeMs, origin: record.origin, indexing: record.indexing ?? 'on', digest: record.digest };
  } catch {
    return null;
  }
}

// @cpt-algo:cpt-site-algo-production-build-layout-dist-fresh:p2
/**
 * Whether `site/dist` can be served without a build: its `index.html` exists, and the stamp of the last finished build names the same origin, the same indexing mode, the same input files and a start no older than any input.
 * @param {{ root: string, origin: string, indexing?: string }} where - `indexing` as `indexingMode` reads it, `on` when absent
 * @returns {boolean}
 */
export function isFresh({ root, origin, indexing = 'on' }) {
  // @cpt-begin:cpt-site-algo-production-build-layout-dist-fresh:p2:inst-if-no-index
  if (!fs.existsSync(path.join(root, 'site', 'dist', 'index.html'))) return false;
  // @cpt-end:cpt-site-algo-production-build-layout-dist-fresh:p2:inst-if-no-index
  // @cpt-begin:cpt-site-algo-production-build-layout-dist-fresh:p2:inst-compare-stamp
  const record = readStamp(stampFile(root));
  if (!record || record.origin !== origin || record.indexing !== indexing) return false;
  const { newest, digest } = scanInputs(root, buildInputs(root));
  return record.digest === digest && newest <= record.time;
  // @cpt-end:cpt-site-algo-production-build-layout-dist-fresh:p2:inst-compare-stamp
}

/** Written into `site/node_modules` by the last step of `npm run setup`: the digest of the lockfile that install came from. */
const SETUP_MARK = '.frontx-setup';

/**
 * The digest of a site's lockfile, or '' without one.
 * @param {string} site - the `site/` directory
 * @returns {string}
 */
function lockDigest(site) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(path.join(site, 'package-lock.json'))).digest('hex');
  } catch {
    return '';
  }
}

/**
 * Whether the site needs `npm run setup`: its install carries no mark of a finished setup, or one from another lockfile. `npm ci` empties `node_modules` first, so an install killed midway has no mark.
 * @param {string} site - the `site/` directory
 * @returns {boolean}
 */
export function needsSetup(site) {
  // @cpt-begin:cpt-site-flow-production-build-layout-start:p2:inst-setup
  let mark = '';
  try {
    mark = fs.readFileSync(path.join(site, 'node_modules', SETUP_MARK), 'utf8').trim();
  } catch {
    return true;
  }
  return mark !== lockDigest(site);
  // @cpt-end:cpt-site-flow-production-build-layout-start:p2:inst-setup
}

/**
 * `--setup-done`, the last step of `npm run setup`: mark the install with its lockfile's digest.
 * @param {string} site - the `site/` directory
 */
export function markSetup(site) {
  // @cpt-begin:cpt-site-flow-production-build-layout-start:p2:inst-setup
  fs.writeFileSync(path.join(site, 'node_modules', SETUP_MARK), `${lockDigest(site)}\n`);
  // @cpt-end:cpt-site-flow-production-build-layout-start:p2:inst-setup
}

/**
 * The origin a build bakes in: `SITE_ORIGIN`, else `site.config.json`'s, else the local server.
 * @param {NodeJS.ProcessEnv} env
 * @param {string | undefined} configOrigin
 * @param {number} port
 * @returns {string}
 */
export function effectiveOrigin(env, configOrigin, port) {
  // @cpt-begin:cpt-site-flow-production-build-layout-start:p2:inst-build
  return env.SITE_ORIGIN?.trim() || configOrigin?.trim() || `http://localhost:${port}`;
  // @cpt-end:cpt-site-flow-production-build-layout-start:p2:inst-build
}

/**
 * The indexing mode a build bakes in: `SITE_INDEXING`, `on` when unset, as template-site-meta reads it. A value it refuses matches no stamp, so the build runs and fails there.
 * @param {NodeJS.ProcessEnv} env
 * @returns {string}
 */
export function indexingMode(env) {
  // @cpt-begin:cpt-site-flow-production-build-layout-start:p2:inst-build
  return env.SITE_INDEXING ?? 'on';
  // @cpt-end:cpt-site-flow-production-build-layout-start:p2:inst-build
}

/**
 * The environment of a start-triggered build: `SITE_ORIGIN` defaulted to the local server when neither it nor `site.config.json` names one, a heap of 75% of the memory limit unless `NODE_OPTIONS` sets one, and one MFE build at a time unless `FRONTX_BUILD_CONCURRENCY` is set.
 * @param {NodeJS.ProcessEnv} env
 * @param {{ configOrigin?: string, port: number, memory: { constrained: number, total: number } }} sources - `memory` holds `process.constrainedMemory()` and `os.totalmem()`
 * @returns {{ env: NodeJS.ProcessEnv, notes: string[] }}
 */
export function buildEnv(env, { configOrigin, port, memory }) {
  // @cpt-begin:cpt-site-flow-production-build-layout-start:p2:inst-build
  const next = { ...env };
  const notes = [];
  if (!env.SITE_ORIGIN?.trim() && !configOrigin?.trim()) {
    next.SITE_ORIGIN = effectiveOrigin(env, configOrigin, port);
    notes.push(`start: SITE_ORIGIN is not set; canonical links and the sitemap will point to ${next.SITE_ORIGIN}. Set SITE_ORIGIN for a real domain.`);
  }
  // Temporary: remove once FrontX templates share the UI kit across MFEs and the build fits the default heap.
  const heapSet = /--max[-_]old[-_]space[-_]size/.test(env.NODE_OPTIONS ?? '');
  if (!heapSet) {
    // The constrained reading is 0, or a huge value on some Node versions, when no limit applies; the smaller of the two is the limit.
    const limit = memory.constrained > 0 ? Math.min(memory.constrained, memory.total) : memory.total;
    const mb = Math.floor((limit * 0.75) / 1024 / 1024);
    next.NODE_OPTIONS = [env.NODE_OPTIONS, `--max-old-space-size=${mb}`].filter(Boolean).join(' ');
    notes.push(`start: memory limit ${Math.floor(limit / 1024 / 1024)} MB, building with --max-old-space-size=${mb}`);
  }
  // A heap cap, this one or the host's, is per process: MFE builds running side by side would add up past the limit.
  if (!env.FRONTX_BUILD_CONCURRENCY) {
    next.FRONTX_BUILD_CONCURRENCY = '1';
    notes.push('start: building the MFEs one at a time (FRONTX_BUILD_CONCURRENCY=1)');
  }
  return { env: next, notes };
  // @cpt-end:cpt-site-flow-production-build-layout-start:p2:inst-build
}

/** The signals `npm start` passes on to the setup or build it runs; on Windows SIGHUP comes only when the console closes, followed by a forced end, so it is not passed on. */
const FORWARDED = /** @type {NodeJS.Signals[]} */ (process.platform === 'win32' ? ['SIGINT', 'SIGTERM'] : ['SIGINT', 'SIGTERM', 'SIGHUP']);
/** How long a stopped tree may take before it gets SIGKILL. */
const GRACE_MS = 10_000;

/**
 * How a finished `npm` step ends the start: null to go on, or the message and exit code to stop with. A signal, the child's or one passed on to it, stops the start even when the child exits 0 after it.
 * @param {number | null} code
 * @param {NodeJS.Signals | null} signal - the one that ended the child
 * @param {NodeJS.Signals | null} stopped - the one passed on to it
 * @returns {{ message: string, exitCode: number } | null}
 */
export function stepOutcome(code, signal, stopped) {
  // @cpt-begin:cpt-site-flow-production-build-layout-start:p2:inst-run
  const by = signal ?? stopped;
  if (by) return { message: `stopped by ${by}`, exitCode: 128 + (os.constants.signals[by] ?? 0) };
  // A code outside 1..255 (null, or negative after a failed spawn) is not a process exit code; fail with 1.
  if (code !== 0) return { message: `failed with exit code ${code}`, exitCode: code !== null && code > 0 && code < 256 ? code : 1 };
  return null;
  // @cpt-end:cpt-site-flow-production-build-layout-start:p2:inst-run
}

/**
 * Runs `npm run <script>` with the terminal attached and passes SIGINT, SIGTERM and SIGHUP on to its whole process tree, escalating to SIGKILL after a grace period or a second signal; resolves when it ends, and on a failure sets the process's exit code.
 * @param {string} script
 * @param {NodeJS.ProcessEnv} env
 * @returns {Promise<void>}
 */
function npmRun(script, env) {
  // @cpt-begin:cpt-site-flow-production-build-layout-start:p2:inst-run
  return new Promise((resolve) => {
    const windows = process.platform === 'win32';
    // Its own process group on POSIX, so a signal reaches the whole tree: npm passes one on to its shell only, and the shell not to the tool it runs. The group also leaves the terminal's session, so Ctrl+Z suspends only this script.
    const child = spawn('npm', ['run', script], { cwd: ROOT, env, stdio: 'inherit', shell: windows, detached: !windows });
    let closed = false;
    /** @type {NodeJS.Signals | null} */
    let stopped = null;
    /** @param {NodeJS.Signals} signal */
    const signalTree = (signal) => {
      if (child.pid === undefined || (closed && windows)) return;
      if (windows) {
        // On Windows only a console Ctrl+C reaches a handler; taskkill ends the tree. A failed spawn of it leaves the child's own close to settle.
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }).once('error', () => {});
        return;
      }
      try {
        process.kill(-child.pid, signal);
      } catch (error) {
        if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ESRCH') console.error(`start: cannot signal npm run ${script}: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    // @cpt-end:cpt-site-flow-production-build-layout-start:p2:inst-run
    // @cpt-begin:cpt-site-flow-production-build-layout-start:p2:inst-run
    /** @type {NodeJS.Timeout | undefined} */
    let grace;
    let deadline = 0;
    /** @param {NodeJS.Signals} signal */
    const forward = (signal) => {
      // A second signal does not wait for the grace period.
      if (stopped) return signalTree('SIGKILL');
      stopped = signal;
      signalTree(signal);
      deadline = Date.now() + GRACE_MS;
      grace = setTimeout(() => signalTree('SIGKILL'), GRACE_MS);
      grace.unref();
    };
    // If this script exits first, by an exception or `process.exit`, the tree goes with it; a fatal signal it does not pass on (SIGKILL, SIGQUIT, SIGABRT) ends it without an `exit` event.
    const onExit = () => signalTree('SIGKILL');
    for (const signal of FORWARDED) process.on(signal, forward);
    process.on('exit', onExit);
    // @cpt-end:cpt-site-flow-production-build-layout-start:p2:inst-run
    // @cpt-begin:cpt-site-flow-production-build-layout-start:p2:inst-run
    let settled = false;
    /** @param {{ message: string, exitCode: number } | null} outcome */
    const settle = (outcome) => {
      // A failed spawn emits `error`, then `close` with a negative code; report it once.
      if (settled) return;
      settled = true;
      clearTimeout(grace);
      for (const signal of FORWARDED) process.off(signal, forward);
      process.off('exit', onExit);
      if (outcome) {
        console.error(`start: npm run ${script} ${outcome.message}`);
        process.exitCode = outcome.exitCode;
      }
      resolve();
    };
    child.on('error', (error) => settle({ message: `could not start: ${error.message}`, exitCode: 1 }));
    // @cpt-end:cpt-site-flow-production-build-layout-start:p2:inst-run
    // @cpt-begin:cpt-site-flow-production-build-layout-start:p2:inst-run
    /**
     * Whether a process of the group is still running (POSIX).
     * @param {number} pid
     */
    const groupAlive = (pid) => {
      try {
        process.kill(-pid, 0);
        return true;
      } catch (error) {
        // Only ESRCH means the group is gone; EPERM means it is there but out of reach.
        return /** @type {NodeJS.ErrnoException} */ (error).code !== 'ESRCH';
      }
    };
    // @cpt-end:cpt-site-flow-production-build-layout-start:p2:inst-run
    // @cpt-begin:cpt-site-flow-production-build-layout-start:p2:inst-run
    child.on('close', (code, signal) => {
      const outcome = stepOutcome(code, signal, stopped);
      if (!stopped || windows || child.pid === undefined) {
        closed = true;
        return settle(outcome);
      }
      // npm may end on a passed-on signal before a tool in its group does: give the rest of the group what is left of the grace period, then SIGKILL.
      const pid = child.pid;
      const wait = () => {
        if (!groupAlive(pid)) {
          closed = true;
          return settle(outcome);
        }
        // A killed member that nobody reaps (no init in the container) stays a zombie that still answers; one second after SIGKILL the start settles anyway.
        if (Date.now() >= deadline + 1000) {
          closed = true;
          return settle(outcome);
        }
        if (Date.now() >= deadline) signalTree('SIGKILL');
        setTimeout(wait, 200);
      };
      wait();
    });
  });
  // @cpt-end:cpt-site-flow-production-build-layout-start:p2:inst-run
}

/**
 * The refusal of a PORT that is not an integer from 0 to 65535.
 * @param {string | undefined} value
 */
const portRefusal = (value) => `start: PORT must be an integer from 0 to 65535, got "${value}"`;

/**
 * `site.config.json`'s origin, or a message when the file cannot be read.
 * @param {string} root
 * @returns {{ origin?: string } | { error: string }}
 */
function readConfig(root) {
  try {
    const { origin } = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8'));
    return { origin: typeof origin === 'string' ? origin : undefined };
  } catch (error) {
    return { error: `start: cannot read site.config.json: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * `--stamp-begin`: refuse what `npm start` refuses (a `site.config.json` it cannot read, a PORT it rejects), keeping the last stamp; otherwise remove the last stamp, so a build that stops midway is never fresh, and open a pending one with the origin and the indexing mode the build bakes in (the rules `npm start` checks with) and the digest of the input files.
 * `--stamp`: the build has finished; turn the pending stamp into the stamp, keeping its time, the build's start.
 * @param {'begin' | 'end'} step
 * @param {{ root: string, env: NodeJS.ProcessEnv }} where
 * @returns {string | null} why the step refused, or null
 */
export function stamp(step, { root, env }) {
  // @cpt-begin:cpt-site-flow-production-build-layout-start:p2:inst-stamp
  const file = stampFile(root);
  const pending = `${file}.pending`;
  if (step === 'begin') {
    // The rules npm start checks with: a config it cannot read and a PORT it refuses stop the build here too, before the last stamp goes.
    const config = readConfig(root);
    if ('error' in config) return config.error;
    const port = parsePort(env.PORT);
    if (port === null) return portRefusal(env.PORT);
    fs.rmSync(file, { force: true });
    const origin = effectiveOrigin(env, config.origin, port);
    // Taken after site:assemble, so the files it writes are no newer than the stamp; the build itself writes none an input scan reads.
    const { digest } = scanInputs(root, buildInputs(root));
    fs.writeFileSync(pending, JSON.stringify({ origin, indexing: indexingMode(env), digest }));
    return null;
  }
  if (!fs.existsSync(pending)) return 'start: --stamp without a build in progress (no pending stamp); run npm run build';
  if (!fs.existsSync(path.join(root, 'site', 'dist', 'index.html'))) return 'start: --stamp without site/dist/index.html; the build did not finish';
  // A rename keeps the pending stamp's time, the build's start.
  fs.renameSync(pending, file);
  return null;
  // @cpt-end:cpt-site-flow-production-build-layout-start:p2:inst-stamp
}

// @cpt-dod:cpt-site-dod-production-build-layout-start:p2
// @cpt-flow:cpt-site-flow-production-build-layout-start:p2
async function main() {
  const args = process.argv.slice(2);
  // @cpt-begin:cpt-site-flow-production-build-layout-start:p2:inst-stamp
  /** @type {'begin' | 'end' | null} */
  let step = null;
  if (args.includes('--stamp-begin')) step = 'begin';
  else if (args.includes('--stamp')) step = 'end';
  if (step) {
    const refusal = stamp(step, { root: ROOT, env: process.env });
    if (refusal) {
      console.error(refusal);
      process.exitCode = 1;
    }
    return;
  }
  if (args.includes('--setup-done')) return markSetup(path.join(ROOT, 'site'));
  // @cpt-end:cpt-site-flow-production-build-layout-start:p2:inst-stamp
  // @cpt-begin:cpt-site-flow-production-build-layout-start:p2:inst-port
  const port = parsePort(process.env.PORT);
  if (port === null) {
    console.error(portRefusal(process.env.PORT));
    process.exitCode = 1;
    return;
  }
  // @cpt-end:cpt-site-flow-production-build-layout-start:p2:inst-port
  // @cpt-begin:cpt-site-flow-production-build-layout-start:p2:inst-if-skip
  const skip = args.includes('--no-build') || process.env.START_SKIP_BUILD === '1';
  // @cpt-end:cpt-site-flow-production-build-layout-start:p2:inst-if-skip
  if (!skip) {
    // @cpt-begin:cpt-site-flow-production-build-layout-start:p2:inst-setup
    if (needsSetup(path.join(ROOT, 'site'))) {
      await npmRun('setup', process.env);
      if (process.exitCode) return;
    }
    // @cpt-end:cpt-site-flow-production-build-layout-start:p2:inst-setup
    // @cpt-begin:cpt-site-flow-production-build-layout-start:p2:inst-build
    const config = readConfig(ROOT);
    if ('error' in config) {
      console.error(config.error);
      process.exitCode = 1;
      return;
    }
    const origin = effectiveOrigin(process.env, config.origin, port);
    if (isFresh({ root: ROOT, origin, indexing: indexingMode(process.env) })) {
      console.log('start: site/dist is up to date');
    } else {
      const { env, notes } = buildEnv(process.env, { configOrigin: config.origin, port, memory: { constrained: process.constrainedMemory(), total: os.totalmem() } });
      for (const note of notes) console.log(note);
      await npmRun('build', env);
      if (process.exitCode) return;
    }
    // @cpt-end:cpt-site-flow-production-build-layout-start:p2:inst-build
  }
  // @cpt-begin:cpt-site-flow-production-build-layout-start:p2:inst-serve
  serve();
  // @cpt-end:cpt-site-flow-production-build-layout-start:p2:inst-serve
}

if (isEntryPoint(import.meta.url)) main();
