# Feature: Page Map and Package Foundation

- [x] `p1` - **ID**: `cpt-template-site-meta-featstatus-page-map`

<!-- toc -->

- [1. Feature Context](#1-feature-context)
  - [1.1 Overview](#11-overview)
  - [1.2 Purpose](#12-purpose)
  - [1.3 Actors](#13-actors)
  - [1.4 References](#14-references)
- [2. Actor Flows (CDSL)](#2-actor-flows-cdsl)
  - [No Actor Flow of Its Own](#no-actor-flow-of-its-own)
- [3. Processes / Business Logic (CDSL)](#3-processes--business-logic-cdsl)
  - [Project Paths](#project-paths)
  - [Read the Sources](#read-the-sources)
  - [Resolve the Origin](#resolve-the-origin)
  - [Resolve the Indexing](#resolve-the-indexing)
  - [Published Screens](#published-screens)
  - [Canonical Address](#canonical-address)
  - [Build the Page Map](#build-the-page-map)
  - [Resolve the Page of an Address](#resolve-the-page-of-an-address)
- [4. States (CDSL)](#4-states-cdsl)
  - [No Feature-Owned State Machine](#no-feature-owned-state-machine)
- [5. Definitions of Done](#5-definitions-of-done)
  - [Sources and Origin](#sources-and-origin)
  - [Page Map and Address Lookup](#page-map-and-address-lookup)
- [6. Acceptance Criteria](#6-acceptance-criteria)

<!-- /toc -->

## 1. Feature Context

- [x] `p1` - `cpt-template-site-meta-feature-page-map`

### 1.1 Overview

Reads the project's metadata sources (the site configuration, the shell's screen domain instance and every composed screen extension) and resolves them into the one page map that every output, every check, every twin and the browser head derive from. It also owns the lookup from a live address to its page and the canonical address writer, both built on the routing package's own grammar functions, and the packaging that makes the package part of the project it is applied into.

### 1.2 Purpose

Every other feature of this template reads the page map, so the map is where the template keeps its central promise: a page's metadata is declared once, on its screen extension, and every address is written in the router's own grammar. The source reader resolves every path from the project it is given with the shell's scanner rules, so the template works in any project that has template-shell applied.

**Requirements**: `cpt-template-site-meta-fr-metadata-once`, `cpt-template-site-meta-fr-canonical-addresses`, `cpt-template-site-meta-fr-required-origin`, `cpt-template-site-meta-nfr-self-contained`, `cpt-template-site-meta-nfr-project-lanes`

**Principles**: `cpt-template-site-meta-principle-metadata-once`, `cpt-template-site-meta-principle-router-grammar`, `cpt-template-site-meta-principle-project-boundary`

### 1.3 Actors

| Actor | Role in Feature |
|-------|-----------------|
| `cpt-template-site-meta-actor-project-developer` | Declares the metadata block of each screen and route and writes the site configuration the map is built from |
| `cpt-template-site-meta-actor-frontx-router` | Owns the URL grammar whose serializer writes every canonical address and whose parser reads the live address |

### 1.4 References

- **PRD**: [PRD.md](../../PRD.md)
- **Design**: [DESIGN.md](../../DESIGN.md), components `cpt-template-site-meta-component-source-reader` and `cpt-template-site-meta-component-page-map`
- **Decomposition**: [DECOMPOSITION.md](../../DECOMPOSITION.md)
- **Dependencies**: None. The features that depend on this one are head-sync, plain-text twins, outputs and generate-and-check.
- **Code**: `template-site-meta/src-app/verify_packages/site-meta/src/site.ts`, `template-site-meta/src-app/verify_packages/site-meta/src/page-map.ts`

## 2. Actor Flows (CDSL)

**Use cases**: none of its own. The page map is the first step of the generate, check and dev twin use cases and the lookup step of the visit use case, whose flows belong to the features that run them.

### No Actor Flow of Its Own

No actor starts this feature directly. The project developer acts on it only by editing the declarations it reads; the generator, the check, the dev twin and head-sync call its processes below.

## 3. Processes / Business Logic (CDSL)

### Project Paths

- [x] `p1` - **ID**: `cpt-template-site-meta-algo-page-map-project-paths`

**Input**: The project root, and optionally the site configuration file.

**Output**: The resolved paths every run reads and writes.

**Steps**:
1. [x] - `p1` - Take the site configuration file as given, or `site.config.json` in the project root when none is given - `inst-default-config`
2. [x] - `p1` - **RETURN** the project root, the configuration file, the composed packages directory `src-app/mfe_packages`, the shell's screen domain instance under the framework package and the build output `dist` - `inst-return-paths`

### Read the Sources

- [x] `p1` - **ID**: `cpt-template-site-meta-algo-page-map-read-sources`

**Input**: The resolved project paths.

**Output**: The screen domain's id and key, and every screen extension of the composed packages with the package it came from.

**Steps**:
1. [x] - `p1` - Read a source file as UTF-8 JSON - `inst-read-json`
2. [x] - `p1` - Read the shell's screen domain instance and take its GTS id and its `route` as the screen domain key - `inst-read-screen-domain`
3. [x] - `p1` - Treat the `shared` directory and every dot-directory as no package, as the shell's scanners do - `inst-non-package-rule`
4. [x] - `p1` - **FOR EACH** entry of the composed packages directory, in name order - `inst-foreach-package`
   1. [x] - `p1` - **IF** the entry is no package, skip it - `inst-skip-non-package`
   2. [x] - `p1` - **IF** the package has no `mfe.json`, skip it - `inst-skip-no-manifest`
   3. [x] - `p1` - **IF** the manifest marks the package as a template example, skip it - `inst-skip-template-example`
   4. [x] - `p1` - **FOR EACH** extension of the manifest on the screen domain, keep its id, route, presentation and metadata block with the package directory's name; extensions on any other domain are left out - `inst-collect-screen-extensions`
5. [x] - `p1` - **RETURN** the collected screen extensions - `inst-return-extensions`

### Resolve the Origin

- [x] `p1` - **ID**: `cpt-template-site-meta-algo-page-map-resolve-origin`

**Input**: The site configuration and the process environment.

**Output**: The address canonical URLs are built on: an origin with an optional sub-path and no trailing slash.

**Steps**:
1. [x] - `p1` - Take the preview override `SITE_ORIGIN` when set, otherwise the configured `origin`, each trimmed; there is no default - `inst-pick-origin`
2. [x] - `p1` - **IF** neither is set, fail with the message that names `site.config.json.origin`, a sub-path example and the preview override - `inst-if-no-origin`
3. [x] - `p1` - **IF** the value does not parse as a URL, fail naming it - `inst-if-not-url`
4. [x] - `p1` - **IF** the protocol is neither http nor https, fail naming it - `inst-if-not-http`
5. [x] - `p1` - **IF** the value has a query or a fragment, fail naming it - `inst-if-query-or-hash`
6. [x] - `p1` - **RETURN** the origin followed by the path with its trailing slashes removed - `inst-return-origin`

### Resolve the Indexing

- [x] `p1` - **ID**: `cpt-template-site-meta-algo-page-map-resolve-indexing`

**Input**: The process environment.

**Output**: Whether search engines may index the build: `on`, or `off` for a build no page of which may be indexed, such as a pull request preview.

**Steps**:
1. [x] - `p1` - Take `SITE_INDEXING`, `on` when unset - `inst-read-indexing`
2. [x] - `p1` - **IF** the value is neither `on` nor `off`, fail naming it and the two values - `inst-if-unknown-indexing`
3. [x] - `p1` - **RETURN** the value - `inst-return-indexing`

### Published Screens

- [x] `p1` - **ID**: `cpt-template-site-meta-algo-page-map-published-screens`

**Input**: The site configuration and the screen extensions of the composed packages.

**Output**: The screen extensions the site publishes, and the extension ids of the ones it leaves out.

**Steps**:
1. [x] - `p1` - Take the route tokens `unpublishedScreens` names, none when absent, and every screen extension's token - `inst-read-list`
2. [x] - `p1` - **IF** the list names a token no screen extension declares, fail naming each such token - `inst-if-unknown-token`
3. [x] - `p1` - **IF** the list names the configured home screen, fail naming it - `inst-if-home-unpublished`
4. [x] - `p1` - **RETURN** the screen extensions whose token the list does not name, and the extension ids of those it names - `inst-return-split`

### Canonical Address

- [x] `p1` - **ID**: `cpt-template-site-meta-algo-page-map-canonical-address`

**Input**: The screen domain key, the screen token and the path inside the screen.

**Output**: The origin-relative address of the page, as the framework router writes it.

**Steps**:
1. [x] - `p1` - Name the entry parameter that carries the path inside a screen `route`, the one place the template names it - `inst-route-param`
2. [x] - `p1` - Take a screen extension's token as its route without the leading slash - `inst-screen-token`
3. [x] - `p1` - Write an address of a site page with the screen domain key and the `route` parameter name - `inst-site-address`
4. [x] - `p1` - Strip the leading slashes from the path inside the screen - `inst-route-value`
5. [x] - `p1` - **RETURN** the routing grammar's serialization of the shell root `/` with no hash and one entry: the screen domain key, the screen token and, only when the path is not empty, the `route` parameter with the path - `inst-serialize-address`

### Build the Page Map

- [x] `p1` - **ID**: `cpt-template-site-meta-algo-page-map-build-map`

**Input**: The site configuration, the resolved origin, the screen domain key, the published screen extensions and the build's indexing.

**Output**: The page map: site fields, the home page, the fallback page and one entry per screen with its static pages and pattern pages.

**Steps**:
1. [x] - `p1` - Collect every screen token more than one extension declares, with the packages that declare it - `inst-find-duplicate-tokens`
2. [x] - `p1` - **IF** any token is declared twice, fail naming each token and its packages - `inst-if-duplicate-tokens`
3. [x] - `p1` - Title a document with the site name alone on the home page and with the title template applied to the page title on every other page - `inst-document-title`
4. [x] - `p1` - **FOR EACH** screen extension - `inst-foreach-screen`
   1. [x] - `p1` - Take its metadata block, or an empty one, and whether its token is the configured home screen - `inst-screen-block`
   2. [x] - `p1` - Build a page from its fields and the inherited fields: address and canonical address on the origin; title from the page, the inherited block, the screen's label or the token; the document title; description from the page, the inherited block or the site default; the share image of the page or the inherited one - `inst-build-page`
      1. [x] - `p1` - **IF** the build's indexing is `off`, the page is not indexable, whatever it declares; **ELSE** it is indexable unless set otherwise or the route is a pattern - `inst-if-indexing-off`
   3. [x] - `p1` - Build the screen root page from the screen's own block, inheriting nothing - `inst-root-page`
   4. [x] - `p1` - **FOR EACH** declared route, build its page inheriting the screen's share image; **IF** the route is a pattern, keep it with the pattern pages, **ELSE** with the static pages - `inst-foreach-route`
   5. [x] - `p1` - Record the screen with its label (the token when absent), its menu order (last when absent), its static pages and its pattern pages - `inst-record-screen`
5. [x] - `p1` - **IF** the configured home screen is not an own key of the screens, fail naming it - `inst-if-unknown-home`
6. [x] - `p1` - Build the fallback page: canonical to the home page, the site name as title and document title, the site default description, not indexable - `inst-fallback-page`
7. [x] - `p1` - **RETURN** the map with the site name, origin, locale and card type, the share image resolved under the origin's path with its alternative text only when both are set, the theme colour, the screen domain key, the `route` parameter name, the home page, the fallback page and the screens - `inst-return-map`
8. [x] - `p1` - List the static pages of a map: screens in menu order, pages in declaration order - `inst-static-pages`

### Resolve the Page of an Address

- [x] `p1` - **ID**: `cpt-template-site-meta-algo-page-map-resolve-page`

**Input**: The page map and the path, query and hash of the current location.

**Output**: The page the address shows, or the home page, or the fallback page.

**Steps**:
1. [x] - `p1` - Treat a route as a pattern when any of its segments starts with `$` - `inst-pattern-rule`
2. [x] - `p1` - Match a concrete path against a pattern segment by segment: the same number of segments, a `$` segment matching any non-empty segment and every other segment equal - `inst-match-pattern`
3. [x] - `p1` - Turn a `route` parameter value into the virtual path: slashes trimmed at both ends, `/` when empty or absent - `inst-route-path`
4. [x] - `p1` - Parse the address with the routing grammar's parser - `inst-parse-address`
5. [x] - `p1` - **IF** the address has no entries and no foreign segments and its path is the path of the origin (the bare mount address), **RETURN** the home page - `inst-if-bare-mount`
6. [x] - `p1` - **IF** no entry carries the screen domain key, **RETURN** the fallback page - `inst-if-no-screen-entry`
7. [x] - `p1` - **IF** the entry's token is not an own key of the screens, **RETURN** the fallback page - `inst-if-unknown-screen`
8. [x] - `p1` - Take the virtual path from the entry's `route` parameter - `inst-take-path`
9. [x] - `p1` - **IF** the path is an own key of the screen's static pages, **RETURN** that page - `inst-if-static-page`
10. [x] - `p1` - Find the first pattern page that matches the path; **IF** none matches, **RETURN** the fallback page - `inst-if-no-pattern`
11. [x] - `p1` - **RETURN** the pattern page with the address and canonical address written from the screen entry and the path alone - `inst-return-pattern-page`

## 4. States (CDSL)

### No Feature-Owned State Machine

Not applicable because the page map is an immutable value built once per run (or once per dev twin request) from files, and the address lookup is a pure function of the map and the address; nothing in this feature has a lifecycle.

## 5. Definitions of Done

### Sources and Origin

- [x] `p1` - **ID**: `cpt-template-site-meta-dod-page-map-sources`

The system **MUST** resolve every path from the project it is given, read the screen extensions with the shell's scanner rules (no `shared`, no dot-directories, no template example, no other domain), take the screen domain key from the shell's screen domain instance rather than from configuration, resolve the origin from the preview override or the configuration with no default, refusing a non-http address and one with a query or fragment, resolve the indexing from `SITE_INDEXING` (`on` by default, `off`, nothing else), and leave out the screens `unpublishedScreens` names, refusing a token no screen declares and the home screen.

**Implements**:
- `cpt-template-site-meta-algo-page-map-project-paths`
- `cpt-template-site-meta-algo-page-map-read-sources`
- `cpt-template-site-meta-algo-page-map-resolve-origin`
- `cpt-template-site-meta-algo-page-map-resolve-indexing`
- `cpt-template-site-meta-algo-page-map-published-screens`

**Constraints**: `cpt-template-site-meta-constraint-shell-workspace-root`

**Touches**:
- Component: `cpt-template-site-meta-component-source-reader`
- Entities: `SiteConfig`, `SeoBlock`, `ScreenExtension`, `SitePaths`

### Page Map and Address Lookup

- [x] `p1` - **ID**: `cpt-template-site-meta-dod-page-map-map`

The system **MUST** build one page map from the published screens' metadata blocks and the site configuration only, with no page indexable when the build's indexing is off, write every address with the routing grammar's serializer and the `route` parameter, resolve a live address with the routing grammar's parser to its page (bare mount address to the home page, static page, pattern page with its own address as canonical, otherwise the fallback page), take own keys only in every lookup, and refuse duplicate screen tokens and an unknown home screen.

**Implements**:
- `cpt-template-site-meta-algo-page-map-canonical-address`
- `cpt-template-site-meta-algo-page-map-build-map`
- `cpt-template-site-meta-algo-page-map-resolve-page`

**Constraints**: `cpt-template-site-meta-constraint-query-addressing`

**Touches**:
- Component: `cpt-template-site-meta-component-page-map`
- Entities: `PageMeta`, `ScreenPages`, `SiteMetaMap`

## 6. Acceptance Criteria

- [x] Canonical addresses are exactly what the routing grammar's serializer writes, and every page of the map sits on the origin, also under a sub-path mount.
- [x] Without an origin the run fails with a message naming `site.config.json.origin`; the preview override wins over the configuration; a sub-path is kept without its trailing slash; a query, a fragment or a non-http address is refused.
- [x] The home page is titled with the site name and every other page with the title template; pattern routes are kept apart and are not indexable.
- [x] `SITE_INDEXING` is `on` when unset and takes `on` or `off`; any other value is refused. With `off`, no page of the map is indexable, the home page, pattern routes and pages that declare themselves indexable included.
- [x] A screen `unpublishedScreens` names has no page in the map; the list refuses a token no screen declares and the home screen; without the list every screen is published.
- [x] Two screen extensions with one token are refused with both packages named; a home screen the site does not have, or one named like an object prototype key, is refused.
- [x] The bare mount address resolves to the home page (also under a sub-path), a screen root and an inner route resolve to their pages, a pattern route resolves with the address itself as canonical, and any other address, including tokens and paths named like object prototype keys, resolves to the non-indexable fallback.
- [x] The `route` parameter convention holds: a router built with routing-tanstack's public API in composed mode projects `?screen=x;route=a/b` onto the virtual pathname `/a/b`.
- [x] Packaging: the package manifest pins every dependency exactly; the package's own type-check and its Node test lane run in the project's lanes; `Object.hasOwn` is declared for the shell's application lib; every test file names its environment; the template manifest claims exactly the package and its AI bundle.

**Test scenarios** (all in `template-site-meta/src-app/verify_packages/site-meta/src/`):
- `site.test.ts`: "canonical addresses are exactly what serializeGrammar writes, the function the framework router writes the URL with"; "put every page of the map on the origin"; the `resolveOrigin` cases; "buildPageMap under a sub-path"; the `buildPageMap` cases for titles, pattern routes, duplicate tokens and unknown home screens.
- `page-map.test.ts`: the `resolvePage` cases (bare address of a sub-path mount, screen root and inner route, pattern route, pattern canonical from the screen entry alone, prototype key names, fallback, bare shell root, screen entry among other domains' entries) and the route path cases.
- `route-convention.test.ts`: "projects ?screen=x;route=a/b onto the virtual pathname /a/b".
- `publishing.test.ts`: the `resolveIndexing` case; "makes no page indexable, pattern routes and the home page included"; "refuses a token no screen declares, the home screen, and a list that is not one of strings".
- `check.test.ts`: "sitePaths reads the project from its own folder and the config from the project, unless the config is another file"; "readScreenExtensions reads screen extensions with the shell scanner rules".
