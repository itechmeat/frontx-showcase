# Feature: Plain-Text Twins

- [x] `p2` - **ID**: `cpt-template-site-meta-featstatus-plain-text-twins`

<!-- toc -->

- [1. Feature Context](#1-feature-context)
  - [1.1 Overview](#11-overview)
  - [1.2 Purpose](#12-purpose)
  - [1.3 Actors](#13-actors)
  - [1.4 References](#14-references)
- [2. Actor Flows (CDSL)](#2-actor-flows-cdsl)
  - [Read a Twin in Development](#read-a-twin-in-development)
- [3. Processes / Business Logic (CDSL)](#3-processes--business-logic-cdsl)
  - [Twin Paths](#twin-paths)
  - [Read the Outlines](#read-the-outlines)
  - [Prune an Outline](#prune-an-outline)
  - [Published Outlines](#published-outlines)
  - [Resolve Texts and Links](#resolve-texts-and-links)
  - [Render a Page](#render-a-page)
  - [Render the Twins](#render-the-twins)
- [4. States (CDSL)](#4-states-cdsl)
  - [No Feature-Owned State Machine](#no-feature-owned-state-machine)
- [5. Definitions of Done](#5-definitions-of-done)
  - [Twins From the Page's Own Sources](#twins-from-the-pages-own-sources)
  - [Twins in Development](#twins-in-development)
- [6. Acceptance Criteria](#6-acceptance-criteria)

<!-- /toc -->

## 1. Feature Context

- [x] `p2` - `cpt-template-site-meta-feature-plain-text-twins`

### 1.1 Overview

Renders every outline page of the composed screens, the home page included, as a Markdown twin, from the same outline, strings and data the screen renders, at the path the page links (`/<token>/index.md` for a screen root, `/<token>/<route>.md` inside it), plus a plain-text copy of an agent task next to its page's twin. The dev twin renders the twin at a requested path from the current sources for the project's dev server.

### 1.2 Purpose

Coding agents and crawlers that run no script cannot read a screen's content from the single built document. The twins give them the full content of every outline page as text, rendered from the sources the page itself renders, at the same path in a build and in development.

**Requirements**: `cpt-template-site-meta-fr-plain-text-twins`, `cpt-template-site-meta-fr-dev-twins`

**Principles**: none of its own beyond those of the page map it depends on (every twin link is a canonical address written in the router's grammar).

### 1.3 Actors

| Actor | Role in Feature |
|-------|-----------------|
| `cpt-template-site-meta-actor-crawler` | Reads the twins `llms.txt` lists, as a coding agent or a crawler that runs no script |
| `cpt-template-site-meta-actor-project-developer` | Follows a page's plain-text link under the dev server and reads the twin rendered from the current sources |

### 1.4 References

- **PRD**: [PRD.md](../../PRD.md)
- **Design**: [DESIGN.md](../../DESIGN.md), components `cpt-template-site-meta-component-twin-renderer` and `cpt-template-site-meta-component-dev-twin`, sequence `cpt-template-site-meta-seq-dev-twin`
- **Decomposition**: [DECOMPOSITION.md](../../DECOMPOSITION.md)
- **Dependencies**: `cpt-template-site-meta-feature-page-map` (declared pages, canonical addresses, the dev twin's page map)
- **Outline model**: owned by template-site ([template-site DESIGN](../../../../template-site/architecture/DESIGN.md)); read here as data only.
- **Code**: `template-site-meta/src-app/verify_packages/site-meta/src/twins.ts`, `template-site-meta/src-app/verify_packages/site-meta/src/publish.ts`, `template-site-meta/src-app/verify_packages/site-meta/src/generate.ts` (the published outlines), `template-site-meta/src-app/verify_packages/site-meta/src/dev.ts`

## 2. Actor Flows (CDSL)

**Use cases**: `cpt-template-site-meta-usecase-dev-twin`

### Read a Twin in Development

- [x] `p2` - **ID**: `cpt-template-site-meta-flow-plain-text-twins-dev-twin`

**Actor**: `cpt-template-site-meta-actor-project-developer`

**Success Scenarios**:
- The developer follows a page's plain-text link under the dev server; the project's middleware asks for the twin at that path and serves it as plain text, rendered from the current sources with links on the dev server's origin.

**Error Scenarios**:
- The path does not end in `.md`, or no outline page has that path: nothing is returned and the dev server answers as it would without the package.
- An outline names an unknown screen or an undeclared page: rendering fails with the message of the render algorithm.

**Steps**:
1. [x] - `p2` - Name the media type twins are served with: `text/plain; charset=utf-8` - `inst-media-type`
2. [x] - `p2` - The developer requests a path; **IF** it does not end in `.md`, **RETURN** nothing - `inst-if-not-twin-path`
3. [x] - `p2` - Read the site configuration and the screen domain and build the page map on the dev server's origin from the current screen extensions - `inst-build-dev-map`
4. [x] - `p2` - Read the current outlines, render every twin and take the one at the requested path - `inst-find-twin`
5. [x] - `p2` - **RETURN** that twin with the media type, or nothing when no twin has the path - `inst-return-twin`
6. [x] - `p2` - Re-export the project path resolution, so the dev server's configuration resolves the project with the same rules - `inst-reexport-paths`

## 3. Processes / Business Logic (CDSL)

### Twin Paths

- [x] `p2` - **ID**: `cpt-template-site-meta-algo-plain-text-twins-paths`

**Input**: A screen token, a page route and, for an agent task, the task entry's id.

**Output**: The path the twin is published at.

**Steps**:
1. [x] - `p2` - **RETURN** `/<token>/index.md` for the screen root and `/<token><route>.md` for any other route - `inst-twin-path`
2. [x] - `p2` - **RETURN** `/<token>/<id>.md` for a task on the screen root and `/<token><route>/<id>.md` for a task on any other route - `inst-task-path`

### Read the Outlines

- [x] `p2` - **ID**: `cpt-template-site-meta-algo-plain-text-twins-read-outlines`

**Input**: The composed packages directory.

**Output**: One outline per package that carries one, with its strings and data.

**Steps**:
1. [x] - `p2` - Look for `src/content/outline.json`, then `src/content/outline.generated.json` - `inst-outline-files`
2. [x] - `p2` - **IF** the packages directory does not exist, **RETURN** no outlines - `inst-if-no-packages`
3. [x] - `p2` - **FOR EACH** entry in name order - `inst-foreach-entry`
   1. [x] - `p2` - **IF** it is not a directory, or is `shared` or a dot-directory, skip it - `inst-skip-non-package`
   2. [x] - `p2` - Take the first outline file that exists; **IF** none, skip the package - `inst-find-outline`
   3. [x] - `p2` - Read the outline; **IF** it names no strings file, fail naming the outline - `inst-if-no-strings`
   4. [x] - `p2` - Read the data file when the outline names one - `inst-read-data`
   5. [x] - `p2` - Keep the screen token, the pages, the English strings, the data variables, the libraries and the shell packages - `inst-collect-outline`
4. [x] - `p2` - **RETURN** the outlines - `inst-return-outlines`

### Prune an Outline

- [x] `p2` - **ID**: `cpt-template-site-meta-algo-plain-text-twins-prune-outline`

**Input**: A parsed outline and the site's publishing choices: the extension ids of the screens it leaves out and the ids of the entries it hides.

**Output**: The outline as a published page shows it, as raw outline JSON. The rule is template-site's (`shared/site/content/publish.ts`), kept here as a code-identical copy, since neither template references the other.

**Steps**:
1. [x] - `p2` - Name the publishing choices and the mark of a value that goes - `inst-publishing-types`
2. [x] - `p2` - Prune a value: a list keeps the items that do not go and goes itself when pruning empties it; in an object, a link target that names a hidden screen takes the object with it when the object is a list item (other than a screen node of an architecture map) or a labelled link, and only the link target otherwise (a map node, each screen node of the map included, or a source line stays as plain text); a property that goes takes a list item with it and is dropped from any other object - `inst-prune-value`
3. [x] - `p2` - **IF** the outline has no pages or nothing is hidden, **RETURN** it as it is - `inst-if-nothing-hidden`
4. [x] - `p2` - **FOR EACH** page, keep it with its entries list: drop the entries whose id is hidden, prune the others as list items, and drop a back link that names a hidden screen - `inst-foreach-page`
5. [x] - `p2` - **RETURN** the outline with the pruned pages - `inst-return-pruned`

### Published Outlines

- [x] `p2` - **ID**: `cpt-template-site-meta-algo-plain-text-twins-published-outlines`

**Input**: The composed outlines, the site's publishing choices and the tokens of the screens the site leaves out.

**Output**: The outlines the twins are rendered from.

**Steps**:
1. [x] - `p2` - Drop the outline of every screen the site leaves out - `inst-drop-unpublished`
2. [x] - `p2` - **RETURN** every other outline with its pages pruned (`cpt-template-site-meta-algo-plain-text-twins-prune-outline`) - `inst-prune-pages`

### Resolve Texts and Links

- [x] `p2` - **ID**: `cpt-template-site-meta-algo-plain-text-twins-resolve-text`

**Input**: A text value or a link target of an outline entry, the outline and the page map.

**Output**: The text or address the page shows.

**Steps**:
1. [x] - `p2` - Name the fence language of a file by its extension, none for an unknown one - `inst-fence-language`
2. [x] - `p2` - Resolve a text: a `t:<key>` value from the screen's strings (the key itself when missing), a literal as is; fill each `{name}` placeholder from the data variables with the site origin added as `siteOrigin`, leaving an unknown one as written - `inst-resolve-text`
3. [x] - `p2` - Resolve a one-line text (a heading, a link label, a bold title) as a text with each authored line break and the spaces around it turned into one space - `inst-one-line`
4. [x] - `p2` - Resolve a link: **IF** it has a URL, resolve it as a text; **IF** it has an anchor, write `#<anchor>`; **IF** it names a screen by its address token, or names another screen by its extension id together with a route, fail; **IF** it names another screen by its extension id, find that screen in the page map (fail when the site has none) and write the canonical address of its root, or, when the link carries a show action, of the one page of that screen whose path ends with the action's payload value (fail when no page or more than one does); **ELSE** write the canonical address of this screen at the link's route (the root by default) on the origin - `inst-resolve-link`

### Render a Page

- [x] `p2` - **ID**: `cpt-template-site-meta-algo-plain-text-twins-render-page`

**Input**: One outline page, its outline and the page map.

**Output**: The page's twin as Markdown.

**Steps**:
1. [x] - `p2` - Render a code block as its bold title and its lines in a fence - `inst-render-code`
2. [x] - `p2` - Render a key files explorer: each file with its path, description, line count, pinned commit link and content in a fence longer than any backtick run inside it; then, when the example still lists its screens, the example screens as links and the open link when it has one; then the pinned source line - `inst-render-explorer`
3. [x] - `p2` - Render a list of links as Markdown list items - `inst-render-links`
4. [x] - `p2` - Render a guide step: its heading, numbered when the step is counted, then its lead, code, files with their links, expected screen, expected result, note and links - `inst-render-step`
5. [x] - `p2` - Render linked cards or map nodes as list items with their text; a node without a link, whose screen the site leaves out, as its title alone - `inst-render-cards`
6. [x] - `p2` - **FOR EACH** entry, render it by its entry type - `inst-render-entry`
   1. [x] - `p2` - A section heading or a guide's closing heading: its heading and lead - `inst-entry-headings`
   2. [x] - `p2` - A step: the guide step with the next number; an unnumbered step: the guide step without a number, leaving the count as it is - `inst-entry-steps`
   3. [x] - `p2` - A paragraph, fine print or status line: its text - `inst-entry-text`
   4. [x] - `p2` - Links and actions: the lead and the link list - `inst-entry-links`
   5. [x] - `p2` - An agent task: its summary heading, lead and code - `inst-entry-task`
   6. [x] - `p2` - Troubleshooting and lists: a heading with each item - `inst-entry-questions-list`
   7. [x] - `p2` - Code, checklists and every card arrangement (path cards, start paths, template pair, template rows, card tiles): the code block, the items, the linked cards - `inst-entry-code-cards`
   8. [x] - `p2` - A file explorer: the explorer rendering - `inst-entry-explorer`
   9. [x] - `p2` - Panels, call-to-action boxes and rules, facts, details and callouts: headings, texts and links - `inst-entry-panels-callouts`
   10. [x] - `p2` - A package list: each library with its version, description, install command and source, then the shell packages without an install line - `inst-entry-packages`
   11. [x] - `p2` - The home entries: the hero's actions (the page's title and lead are the hero's, and its drawing's name is not content); features with their titles, texts and links; the architecture map with its lead, its description and its nodes as links; the change story with its task, diff, expected screen and link; the kit showcase with its groups of linked tiles; the metric comparison with each metric's title, its unit and the note where they are not empty, statement and explanation, and no figures; the logo strip with each company's name as a link to its site; the get-started steps as linked items; the closing call with its actions - `inst-entry-home`
   12. [x] - `p2` - **ELSE** an entry type it does not know renders nothing - `inst-entry-unknown`
7. [x] - `p2` - Render an agent task's plain-text copy: its code lines alone, with texts resolved - `inst-render-task-copy`
8. [x] - `p2` - Render the page's entries in order with a shared step counter and drop empty sections - `inst-render-sections`
9. [x] - `p2` - **RETURN** the title heading, lead, meta line, the page's canonical address and the sections, with runs of blank lines collapsed - `inst-return-page`

### Render the Twins

- [x] `p2` - **ID**: `cpt-template-site-meta-algo-plain-text-twins-render-twins`

**Input**: The outlines and the page map.

**Output**: Every twin with its file, path, screen, route and content.

**Steps**:
1. [x] - `p2` - **FOR EACH** outline - `inst-foreach-outline`
   1. [x] - `p2` - **IF** its screen is not an own key of the page map's screens, fail naming it - `inst-if-unknown-screen`
   2. [x] - `p2` - **FOR EACH** page of the outline - `inst-foreach-page`
      1. [x] - `p2` - **IF** its route is not a static page the screen's metadata block declares, fail naming the screen and route - `inst-if-undeclared-page`
      2. [x] - `p2` - Add the page's twin at its twin path - `inst-add-page-twin`
      3. [x] - `p2` - **FOR EACH** agent task entry that offers a copy, add the copy at its task path, titled with the task's summary - `inst-add-task-twins`
2. [x] - `p2` - **RETURN** the twins - `inst-return-twins`

## 4. States (CDSL)

### No Feature-Owned State Machine

Not applicable because twins are rendered from files on each call (once per generation, once per dev twin request) and nothing is cached or kept between calls.

## 5. Definitions of Done

### Twins From the Page's Own Sources

- [x] `p2` - **ID**: `cpt-template-site-meta-dod-plain-text-twins-render`

The system **MUST** find every composed package with an outline, leave out the outlines of the screens the site does not publish and prune the others as their published pages show them, render each outline page as Markdown from its outline, strings and data with links written as canonical addresses, publish it at the path the page links (and an agent task copy next to it), refuse an outline for an unknown screen and an outline page the screen's metadata block does not declare, and read the outline model as data, keeping its own copy of the twin path rule.

**Implements**:
- `cpt-template-site-meta-algo-plain-text-twins-paths`
- `cpt-template-site-meta-algo-plain-text-twins-read-outlines`
- `cpt-template-site-meta-algo-plain-text-twins-prune-outline`
- `cpt-template-site-meta-algo-plain-text-twins-published-outlines`
- `cpt-template-site-meta-algo-plain-text-twins-resolve-text`
- `cpt-template-site-meta-algo-plain-text-twins-render-page`
- `cpt-template-site-meta-algo-plain-text-twins-render-twins`

**Constraints**: `cpt-template-site-meta-constraint-no-cross-template-reference`

**Touches**:
- Component: `cpt-template-site-meta-component-twin-renderer`
- Entities: `ScreenOutline`, `Twin`

### Twins in Development

- [x] `p2` - **ID**: `cpt-template-site-meta-dod-plain-text-twins-dev`

The system **MUST** answer a request path ending in `.md` with the twin at that path, rendered on every request from the current sources with links on the dev server's origin, together with the plain-text media type, and answer nothing for any other path, so the project's dev-server middleware serves nothing extra without the package.

**Implements**:
- `cpt-template-site-meta-flow-plain-text-twins-dev-twin`

**Constraints**: `cpt-template-site-meta-constraint-dev-server-plugin`, `cpt-template-site-meta-constraint-twin-media-type`

**Touches**:
- Component: `cpt-template-site-meta-component-dev-twin`
- Entities: `Twin`, `SitePaths`

## 6. Acceptance Criteria

- [x] The screen root's twin is published as `index.md`, a route at its own path, and an agent task's copy beside its page's twin.
- [x] An agent task's copy is its text alone, with the site's address filled in; an unnumbered step stays unnumbered.
- [x] Key files are rendered with their content as fenced code, in a fence the content cannot close.
- [x] Example screens are rendered as links through their canonical addresses, with the pinned source and the toolchain line.
- [x] Data placeholders of an external address are filled, an anchor is written as one, and shell packages are listed without an install line.
- [x] Every content-page arrangement renders under its own entry type; an unnumbered step leaves the step count as it is.
- [x] Every home entry type renders its content; the metric comparison names no figure and leaves out an empty unit or note, the logo strip names each company as a link, and the hero's drawing name is left out.
- [x] An entry type the renderer does not know renders nothing, and a page is read from its `entries` list only.
- [x] A link to another screen is written as the canonical address of that screen, or of the page its show action names; a link to a screen extension the site does not have, a show action whose payload names no page or more than one page of it, a screen named by its address token, or a route beside an extension fails the rendering.
- [x] A site that leaves screens out publishes no twin of theirs, and its twins hold no link to them: a list item or a labelled link that names one goes, with an entry or list it empties, a map node keeps its title without a link, an example whose screens all go is not shown; the entries the site hides are in no twin. Both copies of the pruning rule give one result on every outline the templates ship.
- [x] A title or link label with authored line breaks renders on one line, its breaks joined with a space.
- [x] Under the dev server, the twin of an outline page is rendered from the current sources with links on the dev origin, and other paths get nothing.

**Test scenarios** (all in `template-site-meta/src-app/verify_packages/site-meta/src/`):
- `twins.test.ts`: "publishes an agent task's text alone next to its page's twin, with the site's address filled in, and keeps an unnumbered step unnumbered"; "renders the key files with their content as fenced code, using a fence the content cannot close"; "renders the example screens as links through their canonical addresses, the pinned source and the toolchain line"; "fills data placeholders of an external address, writes an anchor as one and lists the shell packages without an install line"; "renders every content-page arrangement under its own entry type, with the renamed headings and card arrangements"; "renders the home entries: hero actions, features, the architecture map, the change story, the kit showcase, the metrics without figures, the logo strip, the steps and the closing call"; "joins the authored line breaks of titles and link labels with a space, so a heading or a link stays on one line"; "renders nothing for an entry type it does not know, such as section or cards"; "reads a page from its entries list only"; "refuses a link to a screen extension the site does not have, a show action whose payload names no page or more than one page of it, a screen named by its address token and a route beside an extension"; `twinPath` "publishes the screen root as index.md and a route at its own path, and an agent task beside its page".
- `publishing.test.ts`: the `pruneOutline` cases; "leaves an unpublished screen out of every output and prunes the links published outlines hold to it".
- `scripts/publish-prune.test.mjs` of the site repository: "prune %s alike for every screen it links, and for all of them at once".
- `dev.test.ts`: "renders the twin of an outline page from the current sources, with links on the dev origin, and answers nothing for other paths".
- `check.test.ts` (owned by generate-and-check): "writes a plain-text twin per outline page from its strings and data, lists it in llms.txt and holds it to its sources".
