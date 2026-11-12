# Feature: Head Block, Discovery Files and Web Manifest

- [x] `p1` - **ID**: `cpt-template-site-meta-featstatus-seo-outputs`

<!-- toc -->

- [1. Feature Context](#1-feature-context)
  - [1.1 Overview](#11-overview)
  - [1.2 Purpose](#12-purpose)
  - [1.3 Actors](#13-actors)
  - [1.4 References](#14-references)
- [2. Actor Flows (CDSL)](#2-actor-flows-cdsl)
  - [No Actor Flow of Its Own](#no-actor-flow-of-its-own)
- [3. Processes / Business Logic (CDSL)](#3-processes--business-logic-cdsl)
  - [Icon Set](#icon-set)
  - [Sitemap and Robots](#sitemap-and-robots)
  - [llms.txt](#llmstxt)
  - [Page Map Manifest](#page-map-manifest)
  - [Head Block of the Built Document](#head-block-of-the-built-document)
  - [Web Manifest](#web-manifest)
- [4. States (CDSL)](#4-states-cdsl)
  - [No Feature-Owned State Machine](#no-feature-owned-state-machine)
- [5. Definitions of Done](#5-definitions-of-done)
  - [Discovery Files](#discovery-files)
  - [Site Head in the Built Document](#site-head-in-the-built-document)
  - [Web Manifest](#web-manifest-1)
- [6. Acceptance Criteria](#6-acceptance-criteria)

<!-- /toc -->

## 1. Feature Context

- [x] `p1` - `cpt-template-site-meta-feature-seo-outputs`

### 1.1 Overview

The output renderers: pure functions that turn the page map into the head block of the built document, `sitemap.xml`, `robots.txt`, `llms.txt`, `seo-manifest.json` and `site.webmanifest`, with no file access of their own. The generator writes what they return and the check compares it.

### 1.2 Purpose

These outputs are everything a crawler, a link preview or a browser installing the site reads from a build. Keeping each one a pure function of the page map makes every output deterministic, testable by snapshot and comparable byte for byte by the check, and keeps the static head and the runtime head on one tag list.

**Requirements**: `cpt-template-site-meta-fr-site-head`, `cpt-template-site-meta-fr-discovery-files`, `cpt-template-site-meta-fr-web-manifest`, `cpt-template-site-meta-nfr-deterministic-outputs` (shared with generate-and-check: this feature keeps every rendered output a pure function of the page map; that feature keeps the bundled runtime deterministic), `cpt-template-site-meta-nfr-head-before-boot` (shared with head-sync: this feature places the inline map and script ahead of the module scripts; that feature runs with no request of its own)

**Principles**: none of its own beyond those of the page map it depends on.

### 1.3 Actors

| Actor | Role in Feature |
|-------|-----------------|
| `cpt-template-site-meta-actor-crawler` | Reads the robots file, the sitemap, the site-level head, `llms.txt` and the page map manifest |
| `cpt-template-site-meta-actor-visitor` | Installs the site from the browser through the web manifest and sees the icons the head links |

### 1.4 References

- **PRD**: [PRD.md](../../PRD.md)
- **Design**: [DESIGN.md](../../DESIGN.md), component `cpt-template-site-meta-component-output-renderers`, sequence `cpt-template-site-meta-seq-crawl`
- **Decomposition**: [DECOMPOSITION.md](../../DECOMPOSITION.md)
- **Dependencies**: `cpt-template-site-meta-feature-page-map` (the map and its static pages), `cpt-template-site-meta-feature-head-sync` (the head tag list and the map node id), `cpt-template-site-meta-feature-plain-text-twins` (the twins `llms.txt` lists)
- **Code**: `template-site-meta/src-app/verify_packages/site-meta/src/outputs.ts`

## 2. Actor Flows (CDSL)

**Use cases**: `cpt-template-site-meta-usecase-crawl` is served by the files this feature renders; no code of the template runs while a crawler reads them.

### No Actor Flow of Its Own

The crawl is a series of reads of static files from the host; the renderers run inside the generate and check flows of generate-and-check, which call the processes below.

## 3. Processes / Business Logic (CDSL)

### Icon Set

- [x] `p1` - **ID**: `cpt-template-site-meta-algo-seo-outputs-icon-set`

**Input**: None.

**Output**: The icon files and the web manifest path the head and the web manifest link, relative to the document.

**Steps**:
1. [x] - `p1` - Name the icon set relative to the document: `brand/favicon.ico`, the 32 pixel icon, the touch icon, the 192 and 512 pixel icons and the maskable 512 pixel icon - `inst-icon-files`
2. [x] - `p1` - Name the web manifest `site.webmanifest`, next to the document - `inst-manifest-path`

### Sitemap and Robots

- [x] `p1` - **ID**: `cpt-template-site-meta-algo-seo-outputs-sitemap-robots`

**Input**: The page map, and the build's indexing.

**Output**: `sitemap.xml` and `robots.txt`.

**Steps**:
1. [x] - `p1` - Escape a text for XML - `inst-escape-xml`
2. [x] - `p1` - Take every indexable static page in menu order as a `<url>` with its escaped canonical address; no `lastmod`, no pattern route - `inst-indexable-urls`
3. [x] - `p1` - **RETURN** the sitemap document in the sitemaps.org namespace - `inst-return-sitemap`
4. [x] - `p1` - **IF** the build's indexing is `off`, **RETURN** a robots file that disallows every path to every agent and names no sitemap - `inst-if-indexing-off`
5. [x] - `p1` - **RETURN** a robots file that allows every agent everything and names the sitemap on the origin - `inst-return-robots`

### llms.txt

- [x] `p1` - **ID**: `cpt-template-site-meta-algo-seo-outputs-llms`

**Input**: The page map, the site summary, the documented packages' published `llms.txt`, the twins and the site configuration's `llmsSections`.

**Output**: `llms.txt` in the llmstxt.org shape.

**Steps**:
1. [x] - `p1` - Title a group by its path segment with a capital first letter and spaces for hyphens - `inst-group-title`
2. [x] - `p1` - Write a page line as a link to its canonical address with its description - `inst-page-line`
3. [x] - `p1` - Start with the site name and the summary as a quote - `inst-header`
4. [x] - `p1` - Order the screens by menu order - `inst-screens-in-order`
5. [x] - `p1` - **FOR EACH** screen - `inst-foreach-screen`
   1. [x] - `p1` - Take its indexable static pages; **IF** none, skip the screen - `inst-indexable-pages`
   2. [x] - `p1` - Write a section headed by the screen's label - `inst-screen-heading`
   3. [x] - `p1` - Group pages whose route has more than one segment under their first segment; keep the others direct - `inst-group-pages`
   4. [x] - `p1` - Write the direct pages - `inst-direct-pages`
   5. [x] - `p1` - Write each group, in name order, as a subsection with its pages - `inst-grouped-sections`
6. [x] - `p1` - **IF** there are twins, write a plain-text pages section with each twin's address, its title (the task title for a task copy) and its page's description - `inst-twins-section`
7. [x] - `p1` - **IF** there are documented packages, write a packages section linking each published `llms.txt` - `inst-packages-section`
8. [x] - `p1` - Write each section of the site configuration's `llmsSections`, in its order, headed by its heading with one list line per item; none when the field is absent or empty, so the text stays as without it - `inst-config-sections`
9. [x] - `p1` - **RETURN** the text with one closing newline - `inst-return-llms`

### Page Map Manifest

- [x] `p1` - **ID**: `cpt-template-site-meta-algo-seo-outputs-seo-manifest`

**Input**: The page map.

**Output**: `seo-manifest.json`.

**Steps**:
1. [x] - `p1` - Describe a page's share fields: document title, description, address, type, site name, locale and the share image when there is one - `inst-share-fields`
2. [x] - `p1` - Describe a page entry: address, screen, route, title, document title, description, indexable and share fields - `inst-page-entry`
3. [x] - `p1` - Key every static page by its canonical address - `inst-pages-by-canonical`
4. [x] - `p1` - List the pattern pages apart, screens in menu order, each with its address pattern - `inst-patterns-apart`
5. [x] - `p1` - **RETURN** the site fields (name, origin, the build's indexing, locale, home page, screen domain key, `route` parameter name), the pages and the patterns as indented JSON - `inst-return-manifest`

### Head Block of the Built Document

- [x] `p1` - **ID**: `cpt-template-site-meta-algo-seo-outputs-index-html`

**Input**: The built document as the build or a previous generation left it, the page map and the bundled head-sync script.

**Output**: The built document with the site-level head block.

**Steps**:
1. [x] - `p1` - Escape a text for an HTML attribute or element - `inst-escape-html`
2. [x] - `p1` - Delimit the block with the `site-meta:start` and `site-meta:end` comments - `inst-block-delimiters`
3. [x] - `p1` - Escape inlined JSON so `<` cannot close its script element - `inst-inline-json`
4. [x] - `p1` - Escape the inlined script so `</script` and `<!--` cannot close its element - `inst-inline-script`
5. [x] - `p1` - Take the site-level page: the fallback page, indexable as the home page is - `inst-site-page`
6. [x] - `p1` - Write the site-level page's head tags with the shared head tag list - `inst-site-tags`
7. [x] - `p1` - Add the theme colour when set, the icon links and the web manifest link - `inst-asset-links`
8. [x] - `p1` - Assemble the block: delimiters, tags, links, the page map as inert JSON under the map node id and the runtime as a classic script - `inst-assemble-block`
9. [x] - `p1` - Remove a block a previous generation wrote - `inst-remove-previous`
10. [x] - `p1` - **IF** the document has no `<html>` or no `</head>`, fail - `inst-if-no-head`
11. [x] - `p1` - Set the document language to the site locale - `inst-set-lang`
12. [x] - `p1` - Set the title to the site name, adding a title when there is none - `inst-set-title`
13. [x] - `p1` - **RETURN** the document with the block right after the title, ahead of the module scripts - `inst-place-block`

### Web Manifest

- [x] `p2` - **ID**: `cpt-template-site-meta-algo-seo-outputs-web-manifest`

**Input**: The page map and the site configuration.

**Output**: `site.webmanifest`.

**Steps**:
1. [x] - `p2` - Write the name, the short name (the site name when absent), the description, the language, the home page as start address relative to the manifest, the browser display, the theme and background colours when set and the 192, 512 and maskable 512 pixel icons - `inst-manifest-fields`
2. [x] - `p2` - **RETURN** the manifest as indented JSON - `inst-return-web-manifest`

## 4. States (CDSL)

### No Feature-Owned State Machine

Not applicable because every renderer is a pure function of its inputs; generating again replaces the head block instead of adding to it, so the document has no state beyond its content.

## 5. Definitions of Done

### Discovery Files

- [x] `p1` - **ID**: `cpt-template-site-meta-dod-seo-outputs-discovery-files`

The system **MUST** render the sitemap of every indexable static page in menu order (no address when the build's indexing is off, since no page is indexable then), a robots file that allows crawling and names the sitemap or, with indexing off, disallows every path and names none, `llms.txt` with a section per screen, grouped pages, the twins, the documented packages and the sections the site configuration adds, and the page map manifest keyed by canonical address with the pattern pages apart, each as a pure function of its inputs.

**Implements**:
- `cpt-template-site-meta-algo-seo-outputs-sitemap-robots`
- `cpt-template-site-meta-algo-seo-outputs-llms`
- `cpt-template-site-meta-algo-seo-outputs-seo-manifest`

**Touches**:
- Component: `cpt-template-site-meta-component-output-renderers`
- Entities: `SiteMetaMap`, `PageMeta`, `Twin`

### Site Head in the Built Document

- [x] `p1` - **ID**: `cpt-template-site-meta-dod-seo-outputs-site-head`

The system **MUST** write the site-level head into the built document once, between its delimiters right after the title, with the language, the title, the shared head tags of the site-level page, the theme colour, the icon and manifest links relative to the document, the page map inlined as inert JSON and the head-sync runtime as a classic script that runs before the module scripts, with no inlined text able to close its script element.

**Implements**:
- `cpt-template-site-meta-algo-seo-outputs-index-html`
- `cpt-template-site-meta-algo-seo-outputs-icon-set`

**Constraints**: `cpt-template-site-meta-constraint-no-shell-head-port`

**Touches**:
- Component: `cpt-template-site-meta-component-output-renderers`
- Entities: `SiteMetaMap`, `PageMeta`

### Web Manifest

- [x] `p2` - **ID**: `cpt-template-site-meta-dod-seo-outputs-web-manifest`

The system **MUST** render a web manifest with the site's name, short name, description and language, the home page as start address relative to the manifest, the configured colours and the icon set.

**Implements**:
- `cpt-template-site-meta-algo-seo-outputs-web-manifest`
- `cpt-template-site-meta-algo-seo-outputs-icon-set`

**Touches**:
- Component: `cpt-template-site-meta-component-output-renderers`
- Entities: `SiteMetaMap`

## 6. Acceptance Criteria

- [x] `sitemap.xml` lists every indexable page and no pattern route.
- [x] `llms.txt` has a section per screen in menu order, routes grouped by their first segment, and the package links.
- [x] `llms.txt` ends with the sections the site configuration adds, and is unchanged without them.
- [x] `robots.txt` points at the sitemap on the origin; with indexing off it is `User-agent: *` and `Disallow: /` with no sitemap line, and the sitemap lists no address.
- [x] `seo-manifest.json` keys pages by canonical address and lists pattern routes apart.
- [x] `index.html` gets the site-level head, the page map and the script once, however often it is generated.
- [x] Inlined text never closes its script element, and the script stays valid.
- [x] A share image path resolves on the origin and the head carries its alternative text.
- [x] The icons and the web manifest are linked relative to the document, so the head works at any mount point.
- [x] The web manifest starts at the home page with the site colours and icons.

**Test scenarios** (all in `template-site-meta/src-app/verify_packages/site-meta/src/`):
- `outputs.test.ts` with its snapshot `__snapshots__/outputs.test.ts.snap`: "sitemap.xml lists every indexable page, no pattern route"; "llms.txt has a section per screen in menu order, routes grouped by their first segment, and the package links"; "llms.txt ends with the sections the site config adds, and is unchanged without them"; "robots.txt points at the sitemap on the origin"; "seo-manifest.json keys pages by canonical URL and lists pattern routes apart"; "index.html gets the site-level head, the page map and the script once, however often it is generated"; "index.html never lets inlined text close its script element, and keeps the script valid"; "resolves a share image path on the origin and gives it its alternative text in the head"; "links the icons and the web manifest relative to the document, so the head works at any mount point"; "writes a web manifest that starts at the home page with the site colors and icons".
- `publishing.test.ts`: "makes no page indexable, pattern routes and the home page included"; "generates noindex heads, a sitemap without addresses, a robots.txt that disallows everything and no llms.txt; check holds and refuses a planted llms.txt"; "leaves an indexing-on build as it was".
- `bundle.test.ts`: the generated document with the real bundle, run in jsdom, applies the page of its address and follows a history step.
