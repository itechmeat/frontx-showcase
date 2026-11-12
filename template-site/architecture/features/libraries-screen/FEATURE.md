# Feature: Libraries Screen

<!-- toc -->

- [1. Feature Context](#1-feature-context)
  - [1.1 Overview](#11-overview)
  - [1.2 Purpose](#12-purpose)
  - [1.3 Actors](#13-actors)
  - [1.4 References](#14-references)
- [2. Actor Flows (CDSL)](#2-actor-flows-cdsl)
  - [Read a Libraries Page](#read-a-libraries-page)
  - [Open an Unknown Path](#open-an-unknown-path)
- [3. Processes / Business Logic (CDSL)](#3-processes--business-logic-cdsl)
  - [Draw the Package List](#draw-the-package-list)
  - [Order the Packages](#order-the-packages)
  - [Draw the Libs Tab Bar](#draw-the-libs-tab-bar)
  - [Pick a Summary Card Icon](#pick-a-summary-card-icon)
- [4. States (CDSL)](#4-states-cdsl)
  - [Libs Page State Machine](#libs-page-state-machine)
- [5. Definitions of Done](#5-definitions-of-done)
  - [Libraries Page and Summaries](#libraries-page-and-summaries)
  - [Registration, Page Metadata and Not-Found Page](#registration-page-metadata-and-not-found-page)
- [6. Acceptance Criteria](#6-acceptance-criteria)

<!-- /toc -->

- [x] `p2` - **ID**: `cpt-template-site-featstatus-libraries-screen`

## 1. Feature Context

- [x] `p2` - `cpt-template-site-feature-libraries-screen`

### 1.1 Overview

The `libs` screen of the `site-libs-mfe` package: the libraries page with a card per FrontX package the site's application depends on and the group of the shell's workspace packages, then the path cards of three technical summaries (routing, the MFE model, the screen domain) and the list of the site's own templates, all written once as the screen's hand-written outline with every package fact read from the bundled generated libraries data; a tab bar of its own across the four pages; plus the screen's own not-found page for any path that names no page.

### 1.2 Purpose

A developer adopting FrontX needs the exact packages, what they do and where their sources are, so no package fact is written by hand: the name, version, description, install command and source link at the commit the version was published from come from the libraries data the site data tooling generates. A summary states only what the installed packages and their published sources support and links those sources. The screen registers itself between UI Kit and Docs in the menu and declares a title and a description for each of its pages next to its registration.

**Requirements**: `cpt-template-site-fr-libraries`, `cpt-template-site-fr-screen-registration`, `cpt-template-site-fr-not-found`, `cpt-template-site-fr-page-metadata`, `cpt-template-site-nfr-truthful-content`, `cpt-template-site-nfr-description-length`

**Principles**: None of its own; the screen follows the principles owned by the foundation features of the [DESIGN](../../DESIGN.md).

### 1.3 Actors

| Actor | Role in Feature |
|-------|-----------------|
| `cpt-template-site-actor-visitor` | Opens the libraries page or a summary, copies an install command and follows the source links |
| `cpt-template-site-actor-host` | Registers the `libs` screen from its manifest, lists it in the menu and mounts it at its address |
| `cpt-template-site-actor-data-generator` | Writes the libraries data the screen bundles |
| `cpt-template-site-actor-metadata-tooling` | Reads the declared title and description of each libs page |

### 1.4 References

- **PRD**: [PRD.md](../../PRD.md)
- **Design**: [DESIGN.md](../../DESIGN.md), component `cpt-template-site-component-libs-screen`
- **Decomposition**: [DECOMPOSITION.md](../../DECOMPOSITION.md), entry 2.8
- **Dependencies**: `cpt-template-site-feature-content-model` (the outline parser, the outline renderer and its data block hook, the twin paths), `cpt-template-site-feature-data-services` (the libs API service that answers with the libraries data), `cpt-template-site-feature-screen-frame` (the lifecycle, the bridge hook and the strings hook)
- **Code**: `template-site/src-app/mfe_packages/site-libs-mfe/`: `mfe.json`, `src/routes.tsx`, `src/screens/libs/` (the layout with the tab bar, the page, the package list, the not-found page and the English strings), `src/content/outline.json` and `src/data/libraries.generated.json` (data without markers)

## 2. Actor Flows (CDSL)

Both flows start when the host mounts the `libs` screen at an address of the screen domain and the screen's router reads the path inside the screen from that address.

**Use cases**: `cpt-template-site-usecase-open-other-screen`

### Read a Libraries Page

- [x] `p1` - **ID**: `cpt-template-site-flow-libraries-screen-read-page`

**Actor**: `cpt-template-site-actor-visitor`

**Success Scenarios**:
- The visitor opens `/?screen=libs` and sees a card per FrontX package, the UI kit first with a link to its catalogue, the shell's workspace packages, the summaries' path cards and the "Site templates" list.
- The visitor opens `/?screen=libs;route=routing` and sees the summary with its versions filled from the data, the side panel and the link to its plain-text twin.

**Error Scenarios**:
- The libraries data cannot be read: the page shows its error state.

**Steps**:
1. [x] - `p1` - When the module loads, parse the hand-written outline through the content model and build one route per outline page under a layout route the pages render in - `inst-build-routes`
2. [x] - `p1` - The page loads the screen's English strings for the host's language - `inst-load-strings`
3. [x] - `p1` - API: GET `/api/site-libs/libraries` through the screen's libs service (the generated libraries data) - `inst-read-libraries`
4. [x] - `p1` - **IF** the strings or the libraries data are still loading - `inst-if-loading`
   1. [x] - `p1` - **RETURN** the page loading state, labelled with the screen's loading text once the strings are loaded - `inst-return-loading`
5. [x] - `p1` - **IF** the read failed or returned no data - `inst-if-error`
   1. [x] - `p1` - **RETURN** the page error state with the screen's error text - `inst-return-error`
6. [x] - `p1` - Label the content model's controls (copy, on this page, plain text) with the screen's strings and take the packages and the shell's workspace packages from the data - `inst-chrome-labels`
7. [x] - `p1` - **RETURN** the outline page rendered by the content model with the data's placeholder values, the screen's tab bar as the docs frame's navigation, the summary card icons, a side panel on the summaries and none on the libraries page, the link to the page's plain-text twin, and the outline's `package-list` entry drawn by the package list algorithm - `inst-render-page`

### Open an Unknown Path

- [x] `p2` - **ID**: `cpt-template-site-flow-libraries-screen-unknown-path`

**Actor**: `cpt-template-site-actor-visitor`

**Success Scenarios**:
- The visitor opens a path inside the libs screen that names no page and sees the screen's not-found page with a link back to the libraries page.

**Error Scenarios**:
- None: every path the outline does not name lands on this page.

**Steps**:
1. [x] - `p2` - The screen's root route renders the not-found page for any path no outline page matches - `inst-route-not-found`
2. [x] - `p2` - The not-found page loads the screen's strings and renders nothing while they load - `inst-load-strings`
3. [x] - `p2` - **RETURN** the not-found page: its title, its text and a link to the screen root inside the screen - `inst-return-not-found`

## 3. Processes / Business Logic (CDSL)

### Draw the Package List

- [x] `p1` - **ID**: `cpt-template-site-algo-libraries-screen-package-list`

**Input**: The FrontX packages and the shell's workspace packages from the libraries data, the screen's strings and the screen's bridge.

**Output**: The PackageList block of template-site-blocks and the shell packages list of the `package-list` entry.

**Steps**:
1. [x] - `p1` - Take a package's title and sentence from the screen's strings where they have them, else its short name and the description its own `package.json` carries - `inst-optional-strings`
2. [x] - `p1` - **FOR EACH** package in the order of the ordering algorithm: a package of the PackageList block named by the package path and version, with its title and sentence - `inst-for-each-package`
   1. [x] - `p1` - **IF** the package is the UI kit and the build publishes the catalogue screen: an "Open UI Kit" link drawn with the kit's button recipe that opens the catalogue through a site link - `inst-open-kit`
   2. [x] - `p1` - A "View source" link to the package's sources at the commit its version was published from - `inst-view-source`
   3. [x] - `p1` - The install command with the exact version, captioned "Install" and the package's title, with Copy - `inst-install-command`
3. [x] - `p1` - **IF** the data lists shell workspace packages: **RETURN** them under a section heading with its title and lead, as a kit item list, each with its version and description and no install command - `inst-shell-packages`

### Order the Packages

- [x] `p2` - **ID**: `cpt-template-site-algo-libraries-screen-order`

**Input**: The FrontX packages of the libraries data.

**Output**: The same packages in display order.

**Steps**:
1. [x] - `p2` - Rank the lead packages first in their fixed order (UI kit, MFE runtime, API services, GTS provider) and every other package after them - `inst-rank`
2. [x] - `p2` - **RETURN** a copy sorted by rank, keeping the data's order within a rank - `inst-return-sorted`

### Draw the Libs Tab Bar

- [x] `p2` - **ID**: `cpt-template-site-algo-libraries-screen-tab-bar`

**Input**: None.

**Output**: The docs frame's navigation: the tab bar across the four libs pages.

**Steps**:
1. [x] - `p2` - Load the screen's strings - `inst-load-strings`
2. [x] - `p2` - Read the route the router matched last as the current page - `inst-current-route`
3. [x] - `p2` - **IF** the strings are still loading: **RETURN** nothing - `inst-if-loading`
4. [x] - `p2` - **RETURN** the navigation labelled with the screen's tab bar label, with a tab per page (Libraries, Routing, MFEs, Screen domain), each an in-screen link, current when its route is the matched one - `inst-page-tabs`

### Pick a Summary Card Icon

- [x] `p2` - **ID**: `cpt-template-site-algo-libraries-screen-card-icon`

**Input**: The target of a card on a libs page.

**Output**: The icon the card shows.

**Steps**:
1. [x] - `p2` - **IF** the card opens no libs route: **RETURN** no icon - `inst-no-route`
2. [x] - `p2` - **RETURN** the route icon for the routing summary, the boxes icon for the MFE summary, the panels icon for the screen domain summary, or no icon - `inst-summary-icon`

## 4. States (CDSL)

### Libs Page State Machine

- [x] `p2` - **ID**: `cpt-template-site-state-libraries-screen-page`

**States**: Loading, Shown, Failed

**Initial State**: Loading

**Transitions**:
1. [x] - `p2` - **FROM** Loading **TO** Failed **WHEN** the libraries data read fails or returns no data - `inst-to-failed`
2. [x] - `p2` - **FROM** Loading **TO** Shown **WHEN** the strings and the libraries data are read - `inst-to-shown`

## 5. Definitions of Done

### Libraries Page and Summaries

- [x] `p1` - **ID**: `cpt-template-site-dod-libraries-screen-pages`

The system **MUST** render the libraries page and the routing, MFE and screen domain summaries from the screen's outline, with every package fact read from the generated libraries data through the screen's API service: a card per FrontX package the site's application depends on with its version, its description, its exact install command and its sources at the commit that version was published from, the UI kit first with a link to its catalogue, the shell's workspace packages without an install command, every template of this repository under "Site templates" linking its page, and each summary linking the sources it was written from; a tab bar across the four pages and a link to each page's plain-text twin; the loading state while the data is read and the error state when it cannot be read.

**Implements**:
- `cpt-template-site-flow-libraries-screen-read-page`
- `cpt-template-site-algo-libraries-screen-package-list`
- `cpt-template-site-algo-libraries-screen-order`
- `cpt-template-site-algo-libraries-screen-tab-bar`
- `cpt-template-site-algo-libraries-screen-card-icon`
- `cpt-template-site-state-libraries-screen-page`

**Constraints**: None of its own; the DESIGN constraints are owned by the foundation features.

**Touches**:
- API: `GET /api/site-libs/libraries`
- Entities: the libs outline, the libraries data (site data), the screen's English strings

### Registration, Page Metadata and Not-Found Page

- [x] `p1` - **ID**: `cpt-template-site-dod-libraries-screen-registration`

The system **MUST** declare in `mfe.json` the `libs` screen extension with its menu label Libraries, menu order 35 (between UI Kit and Docs) and no action on its entry, a page title and a description of 50 to 160 characters for the libraries page and for each summary of its route tree, and **MUST** render the screen's own not-found page for every path that names no page.

**Implements**:
- `cpt-template-site-flow-libraries-screen-unknown-path`

**Constraints**: None of its own.

**Touches**:
- API: `/?screen=libs[;route=routing|mfes|screen-domain]`
- Entities: the screen extension and its page metadata in `mfe.json`

## 6. Acceptance Criteria

- [x] Each of `/`, `/routing`, `/mfes` and `/screen-domain` renders its page with exactly one level-one heading, and any other path renders the not-found page (`routes.test.tsx`: "renders the page at %s", "renders the screen's own not-found page for any other path").
- [x] Every library is listed with its version, its install command and its source at the published commit, the UI kit first with a link to its catalogue (`LibsPage.test.tsx`: "lists every library with its version, its install command and its source at the published commit, the UI kit first with a link to its catalogue").
- [x] Every template of this repository is listed under "Site templates" in the templates guide's order, each linking its page on the templates screen (`LibsPage.test.tsx`: "lists every template of this repository under \"Site templates\", in the templates guide's order, each linking its page on the templates screen").
- [x] The shell template's workspace packages are listed without an install command, and no contributor's fork is shown (`LibsPage.test.tsx`: "lists the shell template's workspace packages without an install command, and shows no contributor's fork").
- [x] The tab bar marks the current page, and only the libraries tab on the screen root (`LibsPage.test.tsx`: "marks the current page in the tab bar, and the libraries tab alone on the screen root").
- [x] A summary's versions are filled from the data and it links its plain-text twin; "On this page" items move keyboard focus to their headings (`LibsPage.test.tsx`: "fills the versions of a summary from the data and links its plain-text twin", "moves keyboard focus to the heading an \"On this page\" item jumps to").
- [x] Every text key exists in the strings and every key is used, every placeholder is filled from the data, the pages are the screen root and the three summaries in the tab bar's order, and each summarized package's sources are linked at the commit it was published from (`outline.test.ts`: "names a strings key that exists for every text it reads from the strings, and uses every key the strings hold", "fills every placeholder of every text and command from the libs data", "pages for the screen root and the three summaries, in the order of the tab bar", "links each summarized package's sources at the FrontX repository's commit it was published from, in the organization's repositories only").
- [x] `mfe.json` declares the libs screen with its token, its place between UI Kit and Docs in the menu and its page metadata, no action, and page metadata for exactly the pages of its route tree (`manifest.test.ts`: "declares the libs screen with its token, its place between UI Kit and Docs in the menu and its page metadata", "declares no action: the screen shows no page on request from another screen", "declares its screen under the extension id the site content opens it by", "declares page metadata for exactly the pages of its route tree").
