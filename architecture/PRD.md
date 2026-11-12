# PRD - FrontX Site


<!-- toc -->

- [1. Overview](#1-overview)
  - [1.1 Purpose](#11-purpose)
  - [1.2 Background / Problem Statement](#12-background--problem-statement)
  - [1.3 Goals (Business Outcomes)](#13-goals-business-outcomes)
  - [1.4 Glossary](#14-glossary)
- [2. Actors](#2-actors)
  - [2.1 Human Actors](#21-human-actors)
  - [2.2 System Actors](#22-system-actors)
- [3. Operational Concept & Environment](#3-operational-concept--environment)
  - [3.1 Module-Specific Environment Constraints](#31-module-specific-environment-constraints)
- [4. Scope](#4-scope)
  - [4.1 In Scope](#41-in-scope)
  - [4.2 Out of Scope](#42-out-of-scope)
- [5. Functional Requirements](#5-functional-requirements)
  - [5.1 Pages and Routes](#51-pages-and-routes)
  - [5.2 Page Metadata](#52-page-metadata)
  - [5.3 Repository Shape](#53-repository-shape)
  - [5.4 Build and Run](#54-build-and-run)
- [6. Non-Functional Requirements](#6-non-functional-requirements)
  - [6.1 NFR Inclusions](#61-nfr-inclusions)
  - [6.2 NFR Exclusions](#62-nfr-exclusions)
- [7. Public Library Interfaces](#7-public-library-interfaces)
  - [7.1 Public API Surface](#71-public-api-surface)
  - [7.2 External Integration Contracts](#72-external-integration-contracts)
- [8. Use Cases](#8-use-cases)
- [9. Acceptance Criteria](#9-acceptance-criteria)
- [10. Dependencies](#10-dependencies)
- [11. Assumptions](#11-assumptions)
- [12. Risks](#12-risks)

<!-- /toc -->

## 1. Overview

### 1.1 Purpose

The FrontX site is the public face of FrontX: a FrontX application that presents the product (what it is, its templates, how to start, its libraries), its UI kit catalogue and live demos, and that is itself built only from FrontX templates. It proves the product by being made with it.

The site's look and information architecture follow the approved designer site; that site is a design reference only: nothing is copied from its code, and every text is written from FrontX's own sources.

The repository holds the site, the templates the site is built from, the demos the site shows, and the templates those demos come from. The official templates (template-shell, template-mfe, template-design-guardrails) stay in gears-frontx-templates and are applied here by the FrontX CLI. Each of this repository's templates states its own consumer-facing requirements in its own artifact tree (`<template>/architecture/PRD.md`); this document holds the site-level intent.

### 1.2 Background / Problem Statement

The demo and example applications of FrontX come from several places and are shaped differently: the ui-kit catalogue is a Vite app with hash routing inside gears-frontx, the inbox app is an overlay on template-shell in a draft templates PR, and the MFE mechanics demo and widget fixtures are template examples inside template-mfe. None of them is reachable at a stable public address, none carries page metadata, and gears-frontx-templates holds only official templates.

### 1.3 Goals (Business Outcomes)

- **One place for demos**: every demo and example app named in the scope runs in the site, at its own address. Target: all of them.
- **One shape**: every template and every screen package in the repository follows one documented shape. Target: 100%, enforced by the repository's checks.
- **Search-ready**: every page has a canonical address, a title, a description and Open Graph data from one declaration, and the site publishes a sitemap, robots rules and an `llms.txt` index. Target: 100% of indexable pages, enforced by the repository's checks.
- **Built from FrontX only**: the site uses template-shell (rebuilt on React and the FrontX UI kit), template-mfe mechanics and template-design-guardrails, MFEs, FrontX routing, actions, API services, i18n and GTS types. Target: no screen outside the MFE runtime; every capability FrontX lacks is a recorded gap, not a workaround.
- **Ready for agents**: every templates, docs and Libraries page has a plain-text twin listed in `llms.txt`. Target: 100% of those pages.
- **Deployable anywhere**: one production build works at the root of an origin or under any sub-path of it. Target: the same build output passes the page checks at both mount points.

### 1.4 Glossary

| Term | Definition |
|------|------------|
| site | The FrontX application in `site/`. |
| screen | A screen-domain extension of an MFE package, shown in the shell's menu or reached by link, with its own address. |
| page | An address that renders content: a screen, or a route inside a screen. |
| demo | A screen that shows FrontX or one of its packages at work. |
| template | A top-level directory carrying `frontx-template.json`. |
| canonical address | The one URL a page is published under, in FrontX's URL grammar (`/?screen=<token>[;route=<path>]`). |
| composition | Copying this repository's templates' screen code into `site/`, so that the template stays the only committed copy. |
| mount point | The origin path the built site is served from: the root of an origin or a sub-path of it. |
| plain-text twin | A Markdown rendering of a page, published next to it for readers that do not run JavaScript. |
| kit candidate | A generic UI primitive the FrontX UI kit lacks, kept in the site under the kit's own name and API until the kit releases it. |
| brand | The site's values over the UI kit's design tokens, its typeface and its art, kept in one source. |
| block | A section-level arrangement of a page (a landing band, a page frame, a row of cards, a guide step), built from kit components, kit candidates and the brand, that places its parts and takes content only. |
| exemptions ledger | The list, beside a set of blocks, of every style declaration that is not layout, each naming the kit gap or kit defect it waits for. |

## 2. Actors

### 2.1 Human Actors

#### Visitor

**ID**: `cpt-site-actor-visitor`

**Role**: Reads the site and uses the demos in a browser.
**Needs**: Every page at a stable address, working demos, links between pages that behave like ordinary links.

#### Site Developer

**ID**: `cpt-site-actor-site-developer`

**Role**: Changes the site's templates, runs the site locally, and keeps metadata and demos current; works alongside AI agents.
**Needs**: One place to edit each screen, a local run that shows the change, checks that catch drift.

#### Template Consumer

**ID**: `cpt-site-actor-template-consumer`

**Role**: A project developer elsewhere who copies one of this repository's templates into a project of their own.
**Needs**: Self-contained templates with a documented shape and README. What each template promises its consumer is stated in that template's own PRD.

### 2.2 System Actors

#### Search Engine and AI Crawler

**ID**: `cpt-site-actor-crawler`

**Role**: Reads the sitemap, robots rules, `llms.txt`, the plain-text twins and page metadata.

#### FrontX CLI

**ID**: `cpt-site-actor-frontx-cli`

**Role**: Applies the official templates to `site/`, records their provenance, and validates this repository's templates.

## 3. Operational Concept & Environment

### 3.1 Module-Specific Environment Constraints

- Node 24.14.0 or later and npm 10 or later; the FrontX ecosystem packages require that floor.
- The site is static: a built output served by any static host; no server process.
- The FrontX ecosystem packages are installed from the npm registry at exact released versions.

## 4. Scope

### 4.1 In Scope

- The repository: layout, tooling, CI, licence files, Constructor Studio configuration and these artifacts.
- The site assembled from template-shell, template-mfe and template-design-guardrails, the shell rebuilt on React and the FrontX UI kit to the site's look: a header with the Constructor Fabric lockup, the navigation built from the registered screens (the demo screens under one entry of their own), the GitHub link and a language selector that lists only the languages the whole site ships (hidden while that is one language), the page frame and a footer with the lockup; the light theme, with no theme choice in the header; no Tailwind. The rebuild is the working version of the agreed template-shell change, which the owner upstreams.
- The site's own sections: home (the landing page), templates (an index and a page per template, generated from the templates' manifests and sources), docs (overview, get started, first change) and Libraries (the libraries page and summaries of routing, the MFE model and the screen domain).
- The ui-kit catalogue as one screen with an index and a page per component (64) and per foundation (3).
- The inbox app (4 screens) and the MFE mechanics demo (4 screens and 2 widget packages), carried over from their sources with the source and commit and every difference recorded in each template, and a calendar screen that is a placeholder until a calendar kit is released.
- The site's visual layers: the UI kit's components first, the primitives the kit lacks as kit candidates proposed to the kit, the brand over the kit's tokens, and blocks for the arrangements the design draws, with pages that carry no CSS; a showcase screen with a page per block, kept out of the search index.
- Links from one screen to a page inside another screen.
- Page metadata declared once per screen and route, and the generated head, sitemap, robots rules, `llms.txt`, web manifest, share image and icons, and a plain-text twin of every templates, docs and Libraries page.
- A production build that works at any mount point, and a local run of the whole site.
- Consumption of the FrontX ecosystem packages as released versions from the npm registry, pinned exactly.

### 4.2 Out of Scope

- Server-side rendering and any server process.
- Changes to gears-frontx, gears-frontx-templates or any open PR (the gaps found are reported, not fixed here; the shell rebuild reaches template-shell through the owner).
- The hosting's own setup: the domain and its DNS, and the repository's GitHub Pages, app and variable settings. The repository builds and publishes the site and its pull request previews to GitHub Pages (DESIGN section 3.8).
- A ui-kit contracts page (needs contract artifacts the published package does not ship).
- The telemetry package's demo in gears-frontx (a public-API consumer check of that package).
- Any company- or vendor-specific content beyond the Constructor Fabric brand rule of `cpt-site-nfr-content-rules`.
- The consumer-facing requirements of each template of this repository: they live in that template's own PRD.

## 5. Functional Requirements

### 5.1 Pages and Routes

#### Every page is a screen MFE with an address

- [x] `p1` - **ID**: `cpt-site-fr-screen-pages`

The site **MUST** render every page through a screen-domain extension of an MFE package, addressed by the FrontX URL grammar, and **MUST** give every route inside a screen its own address through the screen's own route tree.

**Rationale**: The shell's menu, routing and isolation apply only to registered screen extensions; an address per page is what makes a page linkable and indexable.

**Actors**: `cpt-site-actor-visitor`

#### Catalogue routes

- [x] `p1` - **ID**: `cpt-site-fr-catalogue-routes`

The site **MUST** present the UI kit catalogue as one screen that gives each of the 64 components and each of the 3 foundations its own page and address, shows each component as the released kit's own examples show it, groups the components by family on its index, and shows on each component page the example's source and how to use the component in an application.

**Rationale**: Each kit component is a page a visitor or crawler reaches directly; the kit's own examples keep the catalogue equal to what the kit ships; a visitor needs to know how to get and connect a component, not only what it looks like.

**Actors**: `cpt-site-actor-visitor`, `cpt-site-actor-site-developer`

#### The site's own sections

- [x] `p1` - **ID**: `cpt-site-fr-site-sections`

The site **MUST** have a home screen, a templates screen with an index and a page per template, a docs screen with an overview, a getting-started guide and a first-change guide, and a Libraries screen with the libraries page and technical summaries of routing, the MFE model and the screen domain written from the FrontX sources at the pinned versions. The header **MUST** list the site's own sections as the designer's site does: Home, Templates, UI Kit, Libraries, Docs; the blocks showcase follows UI Kit. The content pages **MUST** follow the designer's site in structure and wording wherever its wording is true for FrontX at the pinned versions, and keep their own wording where it would not be. The templates index **MUST** feature the official templates; this repository's own templates keep their pages, reachable by address, from the sitemap and from the Libraries page. Template pages **MUST** describe each template as it is at the version the site uses; every command the docs publish **MUST** have been run as written and **MUST** carry the versions the site itself uses.

**Rationale**: The site presents FrontX, not only its demos; content derived from and tested against what FrontX ships cannot drift from it.

**Actors**: `cpt-site-actor-visitor`, `cpt-site-actor-site-developer`

#### Site navigation from the registered screens

- [x] `p1` - **ID**: `cpt-site-fr-site-navigation`

The shell **MUST** build its header navigation from the registered screens (label, order and an optional group the screen declares), **MUST** list the demo screens under one header entry of their group, **MUST** render every entry as a real link to its canonical address, and **MUST** open the home screen at the bare address.

**Rationale**: A new screen appears in the navigation without a shared list to edit; the shell, which knows the registered screens, is the one place that lists them; the shell's links are real links, crawlable and openable in a new tab.

**Actors**: `cpt-site-actor-visitor`

#### Links to a page inside another screen

- [x] `p1` - **ID**: `cpt-site-fr-cross-screen-links`

A link from one screen to another screen, or to a page inside it, **MUST** open it in one step: it **MUST** add exactly one browser history entry, the browser's Back **MUST** return to the page the visitor came from, and the document **MUST NOT** reload. The link **MUST** open the other screen through the screen domain's `mount_ext` and a page of it through an action the receiving screen declares, with a closed schema that names its pages in its own terms; it **MUST NOT** carry or build the shell's address, and the sending screen **MUST NOT** know the receiving screen's routes or read the list of registered screens. The link **MUST** have the link role and open from the keyboard. Every page it leads to **MUST** stay reachable by a crawler through the sitemap and the plain-text twins.

**Rationale**: The site's sections, the catalogue and the demos lead into each other's pages; a link that adds two history entries, breaks Back or reloads the whole application does not behave like a link, and a screen that knew other screens' routes or wrote the address would break FrontX's isolation of screens and its rule that the address follows the actions.

**Actors**: `cpt-site-actor-visitor`, `cpt-site-actor-crawler`

#### Demo screens

- [x] `p1` - **ID**: `cpt-site-fr-demo-screens`

The site **MUST** run, each at its own address: the inbox app (contacts with a page per contact, dashboard, chat and mail) working on built-in sample data with no backend, each screen keeping what the user changes on it for the page session; the MFE mechanics demo (hello world, profile, current theme, and a widgets host that mounts widget packages in a nested domain with their own addresses; the kit's components are shown by the catalogue); and a calendar screen that states that the calendar kit is coming, until a calendar kit is released. The demo screens **MUST** be listed by the shell's header, under one entry of their group.

**Rationale**: Demos show FrontX's MFE model, actions, API services and nested domains at work in one application, which text pages cannot.

**Actors**: `cpt-site-actor-visitor`

### 5.2 Page Metadata

#### One declaration of page metadata

- [x] `p1` - **ID**: `cpt-site-fr-metadata-single-source`

Each page's title, description, indexability and Open Graph data **MUST** be declared once, on the screen's own declaration, with the site-level values declared once for the whole site, and every generated output and the runtime document head **MUST** be derived from these declarations.

**Rationale**: Metadata kept in two places drifts.

**Actors**: `cpt-site-actor-site-developer`, `cpt-site-actor-crawler`

#### Generated discovery files

- [x] `p1` - **ID**: `cpt-site-fr-discovery-files`

The production build **MUST** publish a sitemap, robots rules, an `llms.txt` index and a web manifest, and a document head with title, description, canonical link, Open Graph and Twitter tags with a share image and its alternative text, the theme color and the icons.

**Rationale**: Search engines and AI crawlers discover pages through these files.

**Actors**: `cpt-site-actor-crawler`

#### Plain-text twins

- [x] `p2` - **ID**: `cpt-site-fr-plain-text-twins`

The production build **MUST** publish a plain-text twin of every templates, docs and Libraries page, with the same content as the page, **MUST** link the twin from its page and **MUST** list it in `llms.txt`. An agent task on a page **MUST** also be published as plain text on its own and linked from the task. The local run **MUST** serve the same twins at the same addresses, so a page's link works there too.

**Rationale**: Coding agents and crawlers that do not run JavaScript read the guides in full.

**Actors**: `cpt-site-actor-crawler`

### 5.3 Repository Shape

#### Uniform templates

- [x] `p1` - **ID**: `cpt-site-fr-uniform-shape`

Every template and screen package in the repository **MUST** follow one documented shape, and the repository's checks **MUST** fail when one does not.

**Rationale**: Template Consumers and Site Developers rely on one documented shape.

**Actors**: `cpt-site-actor-site-developer`, `cpt-site-actor-template-consumer`

#### Single copy of screen code

- [x] `p1` - **ID**: `cpt-site-fr-single-copy`

Screen code **MUST** be committed only inside its template; the site's copy **MUST** be produced from the templates and **MUST** be checkable for drift, naming each drifted file.

**Rationale**: Two committed copies of a screen drift apart.

**Actors**: `cpt-site-actor-site-developer`

### 5.4 Build and Run

#### Static build at any mount point

- [x] `p1` - **ID**: `cpt-site-fr-static-build`

The production build **MUST** be one self-contained static output that holds the host and every screen package, **MUST** work unchanged when served from the root of an origin or from any sub-path of it, and **MUST NOT** depend on an origin or path fixed at build time for loading screens or for links between pages; only the canonical addresses name the configured origin.

**Rationale**: The same build serves the production site at the root of its origin and a pull request preview under a sub-path; a build that works at any mount point is published anywhere without rebuilding.

**Actors**: `cpt-site-actor-visitor`, `cpt-site-actor-site-developer`

#### Visible failure when a screen cannot load

- [x] `p2` - **ID**: `cpt-site-fr-screen-load-failure`

When a screen cannot be loaded or fails while it opens, the site **MUST** show the visitor an error state with a way to retry inside the page frame, instead of an empty page, and a retry **MUST** keep the history behaviour of the visitor's original request.

**Rationale**: A missing or unreachable screen file at a static host otherwise leaves the visitor on a blank page with no explanation and no way forward.

**Actors**: `cpt-site-actor-visitor`

#### Local run of the whole site

- [x] `p2` - **ID**: `cpt-site-fr-local-run`

The repository **MUST** provide one documented local run in which the host and every screen and widget package answer, using only tools the repository installs, without an interactive prompt and without fetching unpinned tools, and the repository's checks **MUST** verify that this run starts.

**Rationale**: The Site Developer sees a change in the whole site, not in one package; a run that hangs on a prompt or fetches an unpinned tool fails silently or differs between machines.

**Actors**: `cpt-site-actor-site-developer`

## 6. Non-Functional Requirements

### 6.1 NFR Inclusions

#### Toolchain

- [x] `p1` - **ID**: `cpt-site-nfr-toolchain`

Every install of the repository **MUST** resolve the same dependency versions with one pinned package manager version, and every check **MUST** pass both on the lowest Node version the FrontX ecosystem packages support and on the current Node release.

**Threshold**: every CI job green on Node 24.14.x and 25.x with the pinned package manager version verified before install.

**Rationale**: The ecosystem packages require the Node floor; the same toolchain as gears-frontx keeps installs reproducible.

#### Styling

- [x] `p1` - **ID**: `cpt-site-nfr-styling`

Code the site owns, the template-shell files it changed included, **MUST** use the FrontX UI kit's components first; a generic primitive the kit lacks **MUST** be a kit candidate with the kit's name and API, the brand **MUST** be values over the kit's design tokens declared in one source, and an arrangement a page draws **MUST** be a block with layout-only styles on tokens and content-only props. Pages **MUST NOT** carry CSS, every style declaration of a block or of the shell chrome that is not layout **MUST** name the kit gap or kit defect it waits for, and no code may use Tailwind. A difference from the designer site that comes from a kit component is accepted and recorded.

**Threshold**: zero findings of the repository's own-styles check and of the brand check; no Tailwind package, configuration or import in the site's build; no design check finding outside the recorded baseline.

**Rationale**: One visual language and one styling system for the shell and every screen; the kit stays the one source of components, and every gap the site fills is visible and goes when the kit closes it.

#### Brand and content rules

- [x] `p1` - **ID**: `cpt-site-nfr-content-rules`

The site is a Constructor Fabric property: its header and footer **MUST** carry the Constructor Fabric logo and lockup before FrontX, and the repository may name the company, its products, its brand domain and its GitHub organization. The repository **MUST NOT** carry a long dash, a design-tool vendor name, an internal company domain or the former product name.

**Threshold**: zero findings of the repository's text check over the tree.

**Rationale**: The site presents FrontX, an open-source product, as published by Constructor Fabric; the rule that FrontX names no company applies to gears-frontx upstream, not to the site.

#### Accessibility and semantics

- [x] `p2` - **ID**: `cpt-site-nfr-semantics`

Every page **MUST** have exactly one top-level heading, headed sections and links between pages that assistive technology announces as links, and its text **MUST** reach a contrast of 4.5:1 against its background; template-design-guardrails' checks apply. A defect of a kit component that breaks a rule is recorded with its upstream report, not restyled inside the kit component.

**Threshold**: one top-level heading per page in every screen test; every brand text and surface pair at 4.5:1 in the brand check; no accessibility finding of the design check outside the recorded baseline on any page at 1440 and 390 pixels, light and dark.

**Rationale**: Semantic pages are readable by assistive technology and crawlers.

### 6.2 NFR Exclusions

- Performance budgets: no budget beyond what the shell ships; the site is static.
- Availability and recovery: GitHub Pages serves the site; a broken deployment is replaced by re-running an earlier one (README, "GitHub Pages and pull request previews").
- Authentication and authorization: not applicable because the site has no accounts and no protected resource; every page is public and read-only, and the inbox demo's writes change only sample data inside the visitor's browser.
- Privacy, data retention and audit: not applicable because the site collects, stores and sends no visitor data; it has no analytics and no server.
- Internationalization beyond one language: the site ships English only; the language selector appears once the whole site ships a second language.
- Regulatory compliance: not applicable because the site processes no personal or regulated data.

## 7. Public Library Interfaces

### 7.1 Public API Surface

#### Canonical page addresses

- [x] `p1` - **ID**: `cpt-site-interface-canonical-address`

**Type**: URL grammar

**Stability**: stable

**Description**: Every page is published under `/?screen=<token>[;route=<path>]`, relative to the site's mount point; the tokens and internal paths are listed in the DESIGN.

**Breaking Change Policy**: a token or path is never reused for other content; a removed page is dropped from the sitemap.

#### Template overlays

- [x] `p2` - **ID**: `cpt-site-interface-template-overlay`

**Type**: Data format (`frontx-template.json` and the subtrees it claims)

**Stability**: experimental

**Description**: Each template of this repository is an overlay a project with template-shell and template-mfe can copy.

**Breaking Change Policy**: template version bump on any change to a claimed subtree.

### 7.2 External Integration Contracts

#### Screen metadata block

- [x] `p2` - **ID**: `cpt-site-contract-seo-block`

**Direction**: provided by the repository's templates to the metadata generator

**Protocol/Format**: JSON, the `seo` field of a screen extension in the MFE package manifest

**Compatibility**: extra field on an open extension schema; the shell passes it through unchanged.

#### Official templates

- [x] `p2` - **ID**: `cpt-site-contract-official-templates`

**Direction**: required from gears-frontx-templates

**Protocol/Format**: `github:` source-spec acquired by the FrontX CLI, with the provenance the CLI records

**Compatibility**: pinned to a commit; upgrades are explicit.

## 8. Use Cases

#### Visit a page

- [x] `p2` - **ID**: `cpt-site-usecase-visit-page`

**Actor**: `cpt-site-actor-visitor`

**Preconditions**:
- The site is built and served.

**Main Flow**:
1. The visitor opens a canonical address.
2. The shell mounts the screen and the screen renders the route.
3. The document head shows the page's title and description.

**Postconditions**:
- The page is shown at its own address.

**Alternative Flows**:
- **Bare address**: the visitor is sent to the home screen's address.
- **The screen cannot load**: the page frame shows an error state with a retry.

#### Follow a link into another screen

- [x] `p2` - **ID**: `cpt-site-usecase-follow-link`

**Actor**: `cpt-site-actor-visitor`

**Preconditions**:
- The visitor is on a page of one screen that links to a page inside another screen.

**Main Flow**:
1. The visitor clicks the link.
2. The site opens the target screen at the linked page without reloading the document.
3. The visitor presses Back.

**Postconditions**:
- The visitor is back on the page they came from; the link added one history entry.

**Alternative Flows**:
- **Keyboard**: the visitor focuses the link and presses Enter; the site opens the page as on a click.

#### Change a screen

- [x] `p2` - **ID**: `cpt-site-usecase-change-screen`

**Actor**: `cpt-site-actor-site-developer`

**Preconditions**:
- The repository is installed and set up as its README describes.

**Main Flow**:
1. The developer edits a package inside its template.
2. The developer composes the templates into the site.
3. The developer runs the site locally and runs the checks.

**Postconditions**:
- The template is the only committed copy and the site matches it.

**Alternative Flows**:
- **Edit made in the site copy**: the drift check names the drifted file.

#### Crawl the site

- [x] `p2` - **ID**: `cpt-site-usecase-crawl`

**Actor**: `cpt-site-actor-crawler`

**Preconditions**:
- The site is published at its origin.

**Main Flow**:
1. The crawler reads the robots rules and the sitemap.
2. It fetches each canonical address and reads its metadata.
3. It reads `llms.txt` for page summaries and the plain-text twins.

**Postconditions**:
- Every indexable page is known by its canonical address.

## 9. Acceptance Criteria

- [ ] Every check the repository's CI runs exits 0 locally on Node 25 and in CI on Node 24.14.x and 25.x.
- [ ] Every address in the DESIGN's routing table renders its page in the built site, and the document title is that page's declared title in the site's title template (the site name alone for the home page).
- [ ] The same build output renders every page when served from the root of an origin and from a sub-path.
- [ ] A link into another screen's page adds one history entry, Back returns to the previous page, and the document does not reload.
- [ ] The published sitemap lists every indexable page once, by canonical address.
- [ ] The drift check reports drift after an edit to the site's copy of a screen.
- [ ] The generated site data match their sources, and the recorded shell changes match `site/` against the pinned template-shell.
- [ ] The local run brings up the host and every screen and widget package.
- [ ] Every page renders in light and dark at 1440 and 390 pixels wide with no console error.
- [ ] The design check reports no finding outside its recorded baseline on every page and block showcase route at 1440 and 390 pixels, light and dark, and every finding the baseline carries names its reason.
- [ ] No source repository changes (`git status` clean and HEAD unchanged in each).

## 10. Dependencies

| Dependency | Description | Criticality |
|------------|-------------|-------------|
| gears-frontx releases on the npm registry (published from `main` `00f71b23`) | ui-kit `0.4.0`, api `0.3.0`, routing `0.3.0`, routing-tanstack `0.3.0`, cli `0.3.0` | p1 |
| gears-frontx releases on the npm registry (published from `main` `ec2a1dbf`) | mfes `0.3.2` and gts-plugin `0.3.3` | p1 |
| gears-frontx-templates `main` `8510e80` | template-shell `0.1.0-alpha.5` with its own packages as workspace sources (framework `0.2.0-alpha.12`, react `0.2.0-alpha.10`, state and i18n `0.2.0-alpha.1`, auth and studio `0.2.0-alpha.2`), template-mfe `0.1.0-alpha.2`, template-design-guardrails `0.1.0-alpha.0` | p1 |
| gears-frontx-templates draft PR #13 | the inbox app | p2 |
| Constructor Studio `v1.8.0` | artifact validation with the `sdlc` kit `v1.2.1` | p3 |
| Designer site | the target look and information architecture; a design reference, never code | p2 |

## 11. Assumptions

- The official templates' read commit stays reachable on GitHub for the CLI to fetch.
- The screen extension schema keeps accepting extra fields (it has no `additionalProperties: false`).
- A static host serves the build's files as they are, at the paths the build writes.

## 12. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Overlay components of the kit open in the document body, outside the screen's isolated subtree, with the document's theme and type | Dialogs, menus and toasts in the catalogue take the document's theme and type size instead of the screen's | Recorded per page as a kit gap |
| Crawlers that do not run JavaScript see only the site-level head | Weaker per-page previews | Edge head injection from the generated metadata once hosting exists; plain-text twins carry the guides' content |
| Pins moved across alpha versions in the inbox demo need code adaptation | Extra work while moving the demos | Type-check and tests over every package in CI |
| The kit candidates and the kit's eventual release of them differ | Swapping the candidates for the kit's components changes the pages | The candidates follow the proposed kit changes in name, API and token use; the template is deleted on release and each exemptions ledger row goes with the gap it waits for |
| The rebuilt shell diverges from template-shell until the owner upstreams it | Re-applying the shell from upstream would drop the rebuild | A checked ledger lists every changed shell file against the pinned template-shell |
| Markers and docs added to the imported demo templates make them diverge from their upstream sources | Re-syncing the inbox app or the MFE demo from upstream needs a manual merge | The upstream source and commit each imported template was moved from are recorded with the template |
