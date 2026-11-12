import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { indexedFindings, unindexedFindings } from './indexing-check.mjs';

const ORIGIN = 'https://frontx.example';
let dist;

function write(file, content) {
  mkdirSync(path.dirname(path.join(dist, file)), { recursive: true });
  writeFileSync(path.join(dist, file), content);
}

/** The document as template-site-meta writes it: the static head and the page map. */
function documentWith(robots, indexable) {
  const page = (route) => ({ route, indexable });
  const map = { home: page('/'), fallback: { route: '/', indexable: false }, screens: { home: { pages: { '/': page('/') }, patterns: [page('/$id')] } } };
  return `<html><head><title>FrontX</title><meta name="robots" content="${robots}" /><link rel="canonical" href="${ORIGIN}/?screen=home" /><script type="application/json" id="site-meta-map">${JSON.stringify(map)}</script></head></html>`;
}

function production() {
  write('index.html', documentWith('index, follow', true));
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
  write('sitemap.xml', `<urlset>\n  <url>\n    <loc>${ORIGIN}/?screen=home</loc>\n  </url>\n</urlset>\n`);
  write('llms.txt', '# FrontX\n');
}

function preview() {
  write('index.html', documentWith('noindex, follow', false));
  write('robots.txt', 'User-agent: *\nDisallow: /\n');
  write('sitemap.xml', '<urlset>\n\n</urlset>\n');
}

beforeEach(() => {
  dist = mkdtempSync(path.join(tmpdir(), 'indexing-check-'));
});

afterEach(() => {
  rmSync(dist, { recursive: true, force: true });
});

describe('indexedFindings', () => {
  it('holds for a production build on its origin', () => {
    production();
    expect(indexedFindings(dist, ORIGIN)).toEqual([]);
  });

  it('refuses a build for another origin, and a preview build', () => {
    production();
    expect(indexedFindings(dist, 'https://other.example')).toEqual([
      `index.html: the canonical address is ${ORIGIN}/?screen=home, not on https://other.example/`,
      'robots.txt does not name https://other.example/sitemap.xml',
      'sitemap.xml lists no address on https://other.example/',
    ]);
    rmSync(dist, { recursive: true, force: true });
    preview();
    expect(indexedFindings(dist, ORIGIN)).toEqual([
      'index.html: robots is noindex, follow, not "index, follow"',
      'robots.txt does not allow crawling',
      `robots.txt does not name ${ORIGIN}/sitemap.xml`,
      `sitemap.xml lists no address on ${ORIGIN}/`,
    ]);
  });
});

describe('unindexedFindings', () => {
  it('holds for a preview build', () => {
    preview();
    expect(unindexedFindings(dist)).toEqual([]);
  });

  it('refuses a production build: indexable head and pages, crawling allowed, a sitemap with addresses and llms.txt', () => {
    production();
    expect(unindexedFindings(dist)).toEqual([
      'index.html: robots is index, follow, not noindex',
      'index.html page map: home is indexable',
      'index.html page map: home / is indexable',
      'index.html page map: home /$id is indexable',
      'robots.txt is not "User-agent: *" and "Disallow: /"',
      'sitemap.xml lists an address',
      'llms.txt is published',
    ]);
  });

  it('refuses any other HTML file without noindex', () => {
    preview();
    write('mfe/a/index.html', '<html><head></head></html>');
    expect(unindexedFindings(dist)).toEqual(['mfe/a/index.html: robots is missing, not noindex']);
  });
});
