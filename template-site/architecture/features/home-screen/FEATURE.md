# Feature: Home Screen

<!-- toc -->

- [1. Feature Context](#1-feature-context)
  - [1.1 Overview](#11-overview)
  - [1.2 Purpose](#12-purpose)
  - [1.3 Actors](#13-actors)
  - [1.4 References](#14-references)
- [2. Actor Flows (CDSL)](#2-actor-flows-cdsl)
  - [Open the Landing Page](#open-the-landing-page)
  - [Open an Unknown Path](#open-an-unknown-path)
- [3. Processes / Business Logic (CDSL)](#3-processes--business-logic-cdsl)
  - [Draw a Kit Sample](#draw-a-kit-sample)
  - [Supply a Logo Image](#supply-a-logo-image)
- [4. States (CDSL)](#4-states-cdsl)
  - [No Lifecycle to Model](#no-lifecycle-to-model)
- [5. Definitions of Done](#5-definitions-of-done)
  - [Landing Page](#landing-page)
  - [Registration, Page Metadata and Not-Found Page](#registration-page-metadata-and-not-found-page)
- [6. Acceptance Criteria](#6-acceptance-criteria)

<!-- /toc -->

- [x] `p2` - **ID**: `cpt-template-site-featstatus-home-screen`

## 1. Feature Context

- [x] `p2` - `cpt-template-site-feature-home-screen`

### 1.1 Overview

The `home` screen of the `site-home-mfe` package: the FrontX landing page at the screen root, written as the home outline (`src/content/outline.json`, one landing page of home entries) and rendered by the content model's renderer with the home blocks of template-site-blocks, the brand art of template-site-brand and live, inert UI kit samples from the screen's sample registry (`src/samples/kitSamples.tsx`) and the logos of the teams using FrontX from the screen's logo files (`src/content/logos.ts`), where every section leads to another section of the site, and the screen's own not-found page for any other path inside it.

### 1.2 Purpose

The landing page is where a visitor decides whether FrontX fits, so it presents what FrontX is, the groundwork its templates give, a shell holding independent screens, a worked first change, the UI kit, a comparison of working with and without FrontX and the steps to a running application, and it states no figure without a source. The screen registers itself in the host's menu and declares its page metadata next to its registration, so applying the template needs no change to the host.

**Requirements**: `cpt-template-site-fr-home`, `cpt-template-site-fr-screen-registration`, `cpt-template-site-fr-not-found`, `cpt-template-site-fr-page-metadata`, `cpt-template-site-nfr-truthful-content`, `cpt-template-site-nfr-description-length`

**Principles**: None of its own; the screen follows the principles owned by the foundation features of the [DESIGN](../../DESIGN.md).

### 1.3 Actors

| Actor | Role in Feature |
|-------|-----------------|
| `cpt-template-site-actor-visitor` | Opens the landing page and follows its links to the docs, templates and catalogue screens and to the source |
| `cpt-template-site-actor-host` | Registers the `home` screen from its manifest, lists it in the menu and mounts it at its address |
| `cpt-template-site-actor-metadata-tooling` | Reads the screen's declared title and description for the page head and the discovery files |

### 1.4 References

- **PRD**: [PRD.md](../../PRD.md)
- **Design**: [DESIGN.md](../../DESIGN.md), component `cpt-template-site-component-home-screen`
- **Decomposition**: [DECOMPOSITION.md](../../DECOMPOSITION.md), entry 2.5
- **Dependencies**: `cpt-template-site-feature-screen-frame` (the lifecycle, the bridge hook and the strings hook the page renders with), `cpt-template-site-feature-content-model` (the home outline and its renderer, which composes the home blocks), `cpt-template-site-feature-site-links` (the site link, the screen ids and opening another screen in place)
- **Code**: `template-site/src-app/mfe_packages/site-home-mfe/`: `mfe.json`, `src/routes.tsx`, `src/content/outline.json` (the home outline), `src/samples/kitSamples.tsx` (the sample registry), `src/content/logos.ts` and `src/content/logos/` (the logo files), `src/screens/home/` (the page, the not-found page and the English strings)

## 2. Actor Flows (CDSL)

Both flows start when the host mounts the `home` screen at an address of the screen domain and the screen's router reads the path inside the screen from that address.

**Use cases**: `cpt-template-site-usecase-open-other-screen`

### Open the Landing Page

- [x] `p1` - **ID**: `cpt-template-site-flow-home-screen-open-landing`

**Actor**: `cpt-template-site-actor-visitor`

**Success Scenarios**:
- The visitor opens `/?screen=home` and sees the landing page with one level-one heading and every section in the reference design's order.
- The visitor clicks a link to another screen, or to a page inside one, or presses Enter on it, and the page opens inside the running host without a reload.

**Error Scenarios**:
- The host refuses a link's show action (a page the target does not have): the target opens at its root.

**Steps**:
1. [x] - `p1` - The screen's route tree matches the screen root and renders the landing page with the screen's bridge - `inst-route-root`
2. [x] - `p1` - The page loads the screen's English strings for the host's language - `inst-load-strings`
3. [x] - `p1` - **IF** the strings are still loading - `inst-if-loading`
   1. [x] - `p1` - **RETURN** the page loading state - `inst-return-loading`
4. [x] - `p1` - The home outline is read, pruned by the build's publishing choices (`cpt-template-site-algo-content-model-prune-outline`) and checked when the module loads: one landing page whose entries are hero, features, architecture map, change story, kit showcase, metric comparison, logo strip, get-started steps and closing call to action, in that order; a site that leaves the catalogue out loses the kit showcase and the kit link of the map, and one that hides `home-teams` loses the logo strip - `inst-read-outline`
5. [x] - `p1` - **RETURN** the landing page rendered from the outline by the content model's renderer, every link a site link, a link to another screen opening it through the screen domain and, for a page of it, the target's show action, every kit showcase tile showing the sample the sample registry draws for its key (`cpt-template-site-algo-home-screen-kit-sample`) and every logo of the logo strip drawn from the logo file the screen bundles for its name (`cpt-template-site-algo-home-screen-logo-image`) - `inst-render-outline`

### Open an Unknown Path

- [x] `p2` - **ID**: `cpt-template-site-flow-home-screen-unknown-path`

**Actor**: `cpt-template-site-actor-visitor`

**Success Scenarios**:
- The visitor opens a path inside the home screen that names no page and sees the screen's not-found page with a link back to the screen root.

**Error Scenarios**:
- None: every path other than the root lands on this page.

**Steps**:
1. [x] - `p2` - The screen's route tree has the root page only and renders the not-found page for any other path - `inst-route-not-found`
2. [x] - `p2` - The not-found page loads the screen's strings and renders nothing while they load - `inst-load-strings`
3. [x] - `p2` - **RETURN** the not-found page: its title, its text and a link to the screen root inside the screen - `inst-return-not-found`

## 3. Processes / Business Logic (CDSL)

### Draw a Kit Sample

- [x] `p1` - **ID**: `cpt-template-site-algo-home-screen-kit-sample`

**Input**: The sample key a kit showcase tile names in the home outline.

**Output**: The live, inert sample the tile shows, drawn with kit components at the kit's own sizes and laid out by the kit showcase block's sample helpers, with no styling of the screen's own.

**Steps**:
1. [x] - `p1` - **IF** the tile names a kit component (button, input, checkbox, tabs, table, avatar, badge, progress): **RETURN** its sample composed from that component and its neighbours, with the parts a narrow tile has no room for marked optional and the table kept to its header and two rows - `inst-component-sample`
2. [x] - `p1` - **IF** the tile names a chart (area, bar, distribution, trends): **RETURN** the brand chart art for it, the distribution with its centre label and the trends with its caption - `inst-chart-sample`
3. [x] - `p1` - **RETURN** nothing for any other name - `inst-no-sample`

### Supply a Logo Image

- [x] `p1` - **ID**: `cpt-template-site-algo-home-screen-logo-image`

**Input**: The logo file name a logo of the home outline's logo strip names.

**Output**: The logo's image as a data URI bundled into the screen, which the logo strip shows in its own colours.

**Steps**:
1. [x] - `p1` - **IF** the name is one of the screen's logo files (the four company logos as the designer delivered them, under `src/content/logos/`): **RETURN** that file inlined as a data URI, since a screen package has no public path of its own inside the shell that mounts it - `inst-known-logo`
2. [x] - `p1` - **RETURN** nothing for any other name - `inst-no-logo`

## 4. States (CDSL)

### No Lifecycle to Model

The page keeps no state of its own beyond its loaded strings: its links to other screens need nothing but the screen's bridge.

## 5. Definitions of Done

### Landing Page

- [x] `p1` - **ID**: `cpt-template-site-dod-home-screen-landing-page`

The system **MUST** render at the home screen's root, from the home outline, the landing page in the reference design's section order (hero, groundwork, shell and screens map, worked first change, UI kit tiles, comparison, teams using FrontX, three steps, closing band), with exactly one level-one heading, every block linking the page behind it, another screen through the screen domain and a page of it through the target's show action, the UI kit samples kept out of focus, the comparison shown in words with no figures, units or charts, and each team's logo a link to the company's site named by the company.

**Implements**:
- `cpt-template-site-flow-home-screen-open-landing`
- `cpt-template-site-algo-home-screen-kit-sample`
- `cpt-template-site-algo-home-screen-logo-image`

**Constraints**: None of its own; the DESIGN constraints are owned by the foundation features.

**Touches**:
- API: `/?screen=home`
- Entities: the screen's English strings

### Registration, Page Metadata and Not-Found Page

- [x] `p1` - **ID**: `cpt-template-site-dod-home-screen-registration`

The system **MUST** declare in `mfe.json` the `home` screen extension with its menu label Home, menu order 10 and no action on its entry, a page title and a description of 50 to 160 characters for its root, which is the only page of its route tree, and **MUST** render the screen's own not-found page for every other path inside the screen.

**Implements**:
- `cpt-template-site-flow-home-screen-unknown-path`

**Constraints**: None of its own.

**Touches**:
- API: `/?screen=home`
- Entities: the screen extension and its page metadata in `mfe.json`

## 6. Acceptance Criteria

- [x] The screen root renders one level-one heading and every section of the landing page (`HomeScreen.test.tsx`: "renders one level-one heading and every section of the landing page"; `routes.test.tsx`: "renders the home page at the screen root").
- [x] Every block of the architecture map links the page behind it, the screens through their template (`HomeScreen.test.tsx`: "links every block of the architecture map to the page behind it, the screens through their template").
- [x] A link to the docs screen opens it through the screen domain, and a link to a page inside another screen sends `mount_ext` and then that screen's own show action, never its route; no such link carries an address (`HomeScreen.test.tsx`: "opens the docs screen at its root through the screen domain, and keeps the source an external address", "opens a page of another screen with one chain: mount_ext, then that screen's own show action, never its route").
- [x] Each UI kit tile links its catalogue page with the sample kept out of focus, all four chart tiles link the chart page and draw a sample, and the table tile is labelled for the table page (`HomeScreen.test.tsx`: "links each UI kit tile to its catalogue page, with the sample kept out of focus", "links all four chart tiles to the catalogue chart page and draws a sample in each", "labels the table tile for the plain table page it links to").
- [x] The worked first change is the one-line change the upstream locale file really has (`HomeScreen.test.tsx`: "shows the worked first change as the one-line change the upstream locale file really has").
- [x] The comparison describes the foundation in words, with no figures, units or chart proportions (`HomeScreen.test.tsx`: "describes the foundation without unsupported measurements or chart proportions").
- [x] The teams using FrontX follow the comparison and precede the steps, each logo a link to the company's site named by the company and shown from a logo file the screen bundles, in its own colours (`HomeScreen.test.tsx`: "names the teams using FrontX between the comparison and the steps, each logo a link to the company named by it"; `outline.test.ts`: "names only logo files the screen supplies").
- [x] The closing band leads to the getting started guide and to the source (`HomeScreen.test.tsx`: "closes with the call to action to the getting started guide and the source").
- [x] Any other path inside the screen renders the screen's not-found page (`routes.test.tsx`: "renders the screen's own not-found page for any other path").
- [x] `mfe.json` declares the home screen with its token, menu entry and page metadata, no action, and page metadata for exactly the pages of its route tree (`manifest.test.ts`: "declares the home screen with its token, menu entry and page metadata", "declares no action: the screen shows no page on request from another screen", "declares its screen under the extension id the site content opens it by", "declares page metadata for exactly the pages of its route tree").
