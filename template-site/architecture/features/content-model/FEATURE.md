# Feature: Content Model

- [x] `p1` - **ID**: `cpt-template-site-featstatus-content-model`

<!-- toc -->

- [1. Feature Context](#1-feature-context)
  - [1.1 Overview](#11-overview)
  - [1.2 Purpose](#12-purpose)
  - [1.3 Actors](#13-actors)
  - [1.4 References](#14-references)
- [2. Actor Flows (CDSL)](#2-actor-flows-cdsl)
  - [Read a Content Page](#read-a-content-page)
- [3. Processes / Business Logic (CDSL)](#3-processes--business-logic-cdsl)
  - [Check an Outline](#check-an-outline)
  - [Read the Publishing Choices](#read-the-publishing-choices)
  - [Prune an Outline](#prune-an-outline)
  - [Resolve a Text](#resolve-a-text)
  - [List the String Keys of an Outline](#list-the-string-keys-of-an-outline)
  - [Find a Page and Its Headings](#find-a-page-and-its-headings)
  - [Arrange the Entries of a Page](#arrange-the-entries-of-a-page)
  - [Twin Paths](#twin-paths)
  - [Wrap a Shell Command](#wrap-a-shell-command)
  - [Bind the Key Files Explorer](#bind-the-key-files-explorer)
- [4. States (CDSL)](#4-states-cdsl)
  - [No Feature-Owned State Machine](#no-feature-owned-state-machine)
- [5. Definitions of Done](#5-definitions-of-done)
  - [Outlines Are Checked and Resolved](#outlines-are-checked-and-resolved)
  - [One Renderer for Every Content Page](#one-renderer-for-every-content-page)
  - [Every Content Page Links Its Twin](#every-content-page-links-its-twin)
  - [Key Files Carried as Data](#key-files-carried-as-data)
- [6. Acceptance Criteria](#6-acceptance-criteria)

<!-- /toc -->

## 1. Feature Context

- [x] `p1` - `cpt-template-site-feature-content-model`

### 1.1 Overview

The home, templates, docs and libraries pages exist once, as typed outlines: JSON lists of pages, each an ordered list of typed entries whose texts are keys of the screen's English strings (`t:<key>`) or literals, with `{name}` placeholders filled from the screen's data. Each entry type is named after the block of `@gears-frontx/site-blocks` it renders (`path-cards`, `step`, `file-explorer`, `hero`), or after the kit part or kit candidate it renders directly (`paragraph`, `checklist`, `details`); an entry carries content only, so an arrangement that differs is an entry type of its own. The content model checks an outline against its types, resolves texts, lists the string keys an outline uses, finds a page and its side panel headings, gives the twin path of a page and of an agent task, wraps long shell commands, and renders a page from blocks, kit candidates and kit parts in the frame the page's shape asks for: the landing frame of a page that opens with a hero, the template detail frame of a page with a key-files explorer, the docs frame with the "On this page" rail and its twin link, or the docs frame with the twin link in its footer line. It also binds a file-explorer entry to the FileExplorer block, decoding the Base64 content the generated outline carries. The renderer carries no styling of its own.

### 1.2 Purpose

One source per content page lets the screen and its plain-text twin agree, and lets the screen's checks catch a missing string or an unfilled placeholder before a visitor does. Code: `shared/site/content/` (`outline.ts`, `publish.ts` and `sitePublishing.ts`, the publishing choices and the pruning, `OutlinePage.tsx`, `twins.ts`, `Explorer.tsx`, `wrapCommand.ts`, and `brandArt.tsx`, the one place that picks the brand art an entry's block shows), paths relative to `template-site/src-app/mfe_packages/`. The outlines of each screen, their strings and their data belong to the screen features; writing the twins belongs to template-site-meta's metadata tooling ([template-site-meta DESIGN](../../../../template-site-meta/architecture/DESIGN.md)).

**Requirements**: `cpt-template-site-fr-outline-content`, `cpt-template-site-fr-twin-links`, `cpt-template-site-nfr-styling`, `cpt-template-site-nfr-semantics`

**Principles**: `cpt-template-site-principle-one-source`, `cpt-template-site-principle-no-page-styling`

### 1.3 Actors

| Actor | Role in Feature |
|-------|-----------------|
| `cpt-template-site-actor-visitor` | Reads a content page and follows its links and its plain-text twin link |
| `cpt-template-site-actor-site-developer` | Writes outlines and strings; the screen's checks use the parser and the key list |
| `cpt-template-site-actor-crawler` | Follows the plain-text twin links |
| `cpt-template-site-actor-metadata-tooling` | Reads the same outlines, strings and data and writes the twins at the paths this feature links |

### 1.4 References

- **PRD**: [PRD.md](../../PRD.md)
- **Design**: [DESIGN.md](../../DESIGN.md), component "Content model", sequences "Render a content page" and "Change a content page", ADR [0001](../../ADR/0001-outline-content-model.md)
- **Dependencies**: `cpt-template-site-feature-site-links` (links render with the site link); the blocks of template-site-blocks, the kit candidates of template-kit-candidates and the brand art of template-site-brand, through their named packages

## 2. Actor Flows (CDSL)

### Read a Content Page

- [x] `p1` - **ID**: `cpt-template-site-flow-content-model-read-content-page`

**Use cases**: `cpt-template-site-usecase-read-guide`

**Actor**: `cpt-template-site-actor-visitor`

**Success Scenarios**:
- A content page renders its intro, its entries in order with numbered steps, its facts and its "On this page" rail with the plain-text twin link at its foot.
- A page with a key-files explorer renders in the template detail frame: the explorer across the column, the rest beside the facts, the twin link in the footer line.
- The home page, which opens with a hero, renders its entries one after another as full-width bands.

**Error Scenarios**:
- A text key the strings lack renders as the key itself, which the screen's outline test reports.
- A placeholder the data cannot fill stays in the text, which the screen's outline test reports.

**Steps**:
1. [x] - `p1` - Bind text resolution to the screen's strings and data (`cpt-template-site-algo-content-model-resolve-text`) - `inst-bind-text`
2. [x] - `p1` - Collect the headings of the side panel (`cpt-template-site-algo-content-model-page-anchors`) - `inst-collect-anchors`
3. [x] - `p1` - Number the steps in page order - `inst-number-steps`
4. [x] - `p1` - Arrange the page (`cpt-template-site-algo-content-model-arrange-entries`) and show the side panel only when the page asks for it, it takes the docs frame and it has headings - `inst-arrange-page`
5. [x] - `p1` - Bind links to the site link as the element a block or kit part renders: a text link with its arrow, a button-styled link with the kit's button recipe, and a block action with its label, filling the data placeholders of an external address - `inst-bind-links`
6. [x] - `p1` - Bind code: a step's code is a run of shell commands wrapped with a ` \` continuation (`cpt-template-site-algo-content-model-wrap-command`), with the copy labels from the screen's strings - `inst-bind-code`
7. [x] - `p1` - Build the plain-text twin link from the twin path relative to the host's document - `inst-twin-link`
8. [x] - `p1` - **FOR EACH** entry, render the block it is named after with its texts resolved and its links bound, or the kit part it names (text, link line, button links in the action row block, code block, checklist, linked item list, alert, collapsible details), the screen's own rendering of a data entry, and for the home entries the brand art, the live kit samples and the logo images the screen supplies (a metric with no bars gets no chart, and a logo whose image the screen does not supply is left out) - `inst-render-entries`
   1. [x] - `p1` - For an agent task, link its plain-text copy at the task twin path relative to the host's document - `inst-task-twin`
9. [x] - `p1` - Build the page's facts and its intro: title, lead, back link and meta facts with their icons - `inst-build-aside`
10. [x] - `p1` - **RETURN** the frame the page's shape asks for: the landing frame, the template detail frame with the explorer across and the facts beside, the docs frame with the rail, or the docs frame with the twin link in its footer line - `inst-return-frame`

## 3. Processes / Business Logic (CDSL)

### Check an Outline

- [x] `p1` - **ID**: `cpt-template-site-algo-content-model-parse-outline`

**Input**: The parsed JSON of an outline file.

**Output**: A typed outline; or an outline error that names the path of the first field that does not fit the model.

**Steps**:
1. [x] - `p1` - Check each field for its type (string, optional string, list, object, optional true or false) and fail with the field's path on a mismatch - `inst-check-types`
2. [x] - `p1` - Read a link target (optional on a map node and on an example's open link, and an example without screens is left out, as a pruned outline leaves them) as an external address, a heading anchor, another screen by its extension id with an optional show action (a type and a payload of strings), or a route inside the screen; fail on a screen named by its address token, on a route beside an extension, on a link naming more than one target and when it is none of them - `inst-read-link-target`
3. [x] - `p1` - Read the outline's screen token, strings file name and optional data file name - `inst-read-header`
4. [x] - `p1` - **FOR EACH** page, read its route, title, lead, optional meta facts, back link and side panel title, and its entries - `inst-read-pages`
5. [x] - `p1` - **FOR EACH** entry, read the fields of its type - `inst-read-entry`
   1. [x] - `p1` - **IF** the entry carries a drawing option (`layout`, `variant`, `tone`, `compact`, `ruled`, `numbered`, `prose`), names a figure the brand does not draw or a panel link kind the model does not know, fail - `inst-check-kinds`
   2. [x] - `p1` - **IF** the entry type is unknown, fail - `inst-unknown-type`
6. [x] - `p1` - **RETURN** the checked outline - `inst-return-outline`

### Read the Publishing Choices

- [x] `p1` - **ID**: `cpt-template-site-algo-content-model-site-publishing`

**Input**: The build variables: `VITE_SITE_HIDDEN_SCREENS` and `VITE_SITE_HIDDEN_ENTRIES`, each a JSON array of strings, which the site's production build sets from its site configuration.

**Output**: The screens the site leaves out, by extension id, and the outline entries it hides, by id; nothing hidden when the variables are absent, as in development and the tests.

**Steps**:
1. [x] - `p1` - Read each variable as a JSON array of strings, an empty list when it is absent or empty; fail naming the variable when it is not such an array - `inst-read-list`
2. [x] - `p1` - **RETURN** the hidden screens and the hidden entries - `inst-return-publishing`
3. [x] - `p1` - Read the choices once, from the build variables the bundle was built with - `inst-build-choices`
4. [x] - `p1` - A screen is published unless its extension id is hidden - `inst-is-published`

### Prune an Outline

- [x] `p1` - **ID**: `cpt-template-site-algo-content-model-prune-outline`

**Input**: The parsed JSON of an outline file and the publishing choices.

**Output**: The outline as a published page shows it, checked by the model. template-site-meta keeps a code-identical copy of the rule for the plain-text twins, so a twin shows what its page shows.

**Steps**:
1. [x] - `p1` - Name the publishing choices and the mark of a value that goes - `inst-publishing-types`
2. [x] - `p1` - Prune a value: a list keeps the items that do not go and goes itself when pruning empties it; in an object, a link target that names a hidden screen takes the object with it when the object is a list item (other than a screen node of an architecture map) or a labelled link, and only the link target otherwise (a map node, each screen node of the map included, or a source line stays as plain text); a property that goes takes a list item with it and is dropped from any other object - `inst-prune-value`
3. [x] - `p1` - **IF** the outline has no pages or nothing is hidden, **RETURN** it as it is - `inst-if-nothing-hidden`
4. [x] - `p1` - **FOR EACH** page, keep it with its entries list: drop the entries whose id is hidden, prune the others as list items, and drop a back link that names a hidden screen - `inst-foreach-page`
5. [x] - `p1` - **RETURN** the outline with the pruned pages - `inst-return-pruned`
6. [x] - `p1` - A screen reads its outline pruned by the build's choices, then checked - `inst-parse-pruned`

### Resolve a Text

- [x] `p1` - **ID**: `cpt-template-site-algo-content-model-resolve-text`

**Input**: A text, the screen's string lookup, and the screen's data variables.

**Output**: The displayed string.

**Steps**:
1. [x] - `p1` - **IF** the text starts with `t:`, look the rest up in the screen's strings; otherwise take the text as a literal - `inst-lookup-key`
2. [x] - `p1` - Replace every `{name}` placeholder whose name the variables hold, and keep any other placeholder as it is - `inst-fill-placeholders`
3. [x] - `p1` - **RETURN** the resolved string - `inst-return-text`

### List the String Keys of an Outline

- [x] `p2` - **ID**: `cpt-template-site-algo-content-model-outline-keys`

**Input**: A checked outline.

**Output**: The sorted, distinct `t:` keys its pages use, for the test that holds the strings file to its outline.

**Steps**:
1. [x] - `p2` - Walk every string, list and object of the outline's pages and collect the key of each text that starts with `t:` - `inst-collect-keys`
2. [x] - `p2` - **RETURN** the keys sorted - `inst-return-keys`

### Find a Page and Its Headings

- [x] `p1` - **ID**: `cpt-template-site-algo-content-model-page-anchors`

**Input**: An outline and a route; a page.

**Output**: The page at the route, if any; the headings of the page's side panel in order.

**Steps**:
1. [x] - `p1` - Find the page whose route equals the route - `inst-page-at`
2. [x] - `p1` - Collect the numbered steps of the page; **IF** there are any, **RETURN** them - `inst-numbered-steps`
3. [x] - `p1` - **ELSE** **RETURN** every section heading, closing heading, file explorer, troubleshooting list and link list of the page - `inst-section-headings`

### Arrange the Entries of a Page

- [x] `p2` - **ID**: `cpt-template-site-algo-content-model-arrange-entries`

**Input**: The page's entries.

**Output**: The frame the page takes (landing, explorer or docs), its facts, its explorer, the entries across the whole column and the entries of the main column.

**Steps**:
1. [x] - `p2` - **IF** the page opens with a hero, **RETURN** the landing frame with every entry in order - `inst-landing-page`
2. [x] - `p2` - Separate the page's facts, which go beside the body, from its body - `inst-split-facts`
3. [x] - `p2` - **IF** the body has a file explorer, **RETURN** the explorer frame with the explorer and, in the main column, the entries after it without its details, then the entries before it, then the details - `inst-explorer-page`
4. [x] - `p2` - **ELSE** **RETURN** the docs frame with the leading path cards, starting points and link lines across the column and the rest in the main column - `inst-plain-page`

### Twin Paths

- [x] `p1` - **ID**: `cpt-template-site-algo-content-model-twin-paths`

**Input**: The screen's route token, the page's route and, for an agent task, the task entry's id.

**Output**: The site-root path the metadata tooling publishes the twin at, and the link to it relative to the host's document.

**Steps**:
1. [x] - `p1` - **RETURN** `/<token>/index.md` for the screen root and `/<token><route>.md` for any other page - `inst-page-twin`
2. [x] - `p1` - **RETURN** `/<token>/<task>.md` for a task on the screen root and `/<token><route>/<task>.md` for a task on any other page - `inst-task-twin-path`
3. [x] - `p1` - Link a twin by its site-root path made relative to the host's document (`./<token>/<route>.md`), so it resolves at any mount point and from the screen's shadow root; fail on a path that is not site-root - `inst-document-relative`

### Wrap a Shell Command

- [x] `p1` - **ID**: `cpt-template-site-algo-content-model-wrap-command`

**Input**: A command line, or the lines of a block of commands, and the widest line (76 columns unless given).

**Output**: The lines a code block shows, each long command continued on the next line with a trailing ` \` that a POSIX shell reads as the same command.

**Steps**:
1. [x] - `p1` - Find the spaces a shell splits words at, skipping spaces inside quotes and after a backslash - `inst-word-breaks`
2. [x] - `p1` - **WHILE** the rest of the line, with its continuation indent, is wider than the width - `inst-while-too-long`
   1. [x] - `p1` - **IF** the rest has no word boundary, stop wrapping - `inst-if-no-break`
   2. [x] - `p1` - Pick the last boundary that keeps the line and its ` \` marker within the width, or the first boundary when none does - `inst-pick-break`
   3. [x] - `p1` - Emit the line up to the boundary with ` \`, and continue with the rest indented by two spaces - `inst-emit-line`
3. [x] - `p1` - **RETURN** the emitted lines and the rest - `inst-return-lines`
4. [x] - `p1` - For a block of commands, wrap each line and **RETURN** them in order - `inst-wrap-block`

### Bind the Key Files Explorer

- [x] `p2` - **ID**: `cpt-template-site-algo-content-model-key-files`

**Input**: An outline's file-explorer entry, the bound text function, the function that makes a link element, and the explorer's strings.

**Output**: The FileExplorer block with each key file's decoded content, its scope line, legal links, source line and Example tab.

**Steps**:
1. [x] - `p2` - Decode a key file's Base64 content to bytes and the bytes to UTF-8 text - `inst-decode-content`
2. [x] - `p2` - Map each key file to its path, resolved description, address, line count and decoded content, once per change of the files or the strings - `inst-map-files`
3. [x] - `p2` - **RETURN** the FileExplorer block with the scope line and its link, the legal links, the source line, and, when the entry has an example, the Example tab: a kit card whose screen badges and open link reach the screens through site links - `inst-render-explorer`
   1. [x] - `p2` - The source line: its label and the pinned commit or this repository's name - `inst-render-source`
   2. [x] - `p2` - The scope line: what the list is, and the link to the whole source when the template has one - `inst-render-scope`
   3. [x] - `p2` - The note on every file and the license and notice links - `inst-render-note-legal`
   4. [x] - `p2` - The Example tab when the entry has an example: a kit card whose screen badges and open link, when it has one, open the screens through site links - `inst-render-example`

## 4. States (CDSL)

### No Feature-Owned State Machine

Not applicable. The content model checks, resolves and renders outlines that do not change while a page is shown; it holds no entity with a lifecycle. Data loading and its loading and error states belong to the screens and the screen frame.

## 5. Definitions of Done

### Outlines Are Checked and Resolved

- [x] `p1` - **ID**: `cpt-template-site-dod-content-model-checked-outlines`

The system **MUST** prune every outline by the build's publishing choices before checking it, so a published page shows no link to a screen the site leaves out and no entry it hides, check every outline against the model and fail with the path of the first field that does not fit, resolve each text from the screen's strings or as a literal with its placeholders filled from the screen's data, and list the string keys an outline uses so that the screen's outline test can hold the strings file to it.

**Implements**:
- `cpt-template-site-algo-content-model-site-publishing`
- `cpt-template-site-algo-content-model-prune-outline`
- `cpt-template-site-algo-content-model-parse-outline`
- `cpt-template-site-algo-content-model-resolve-text`
- `cpt-template-site-algo-content-model-outline-keys`

**Touches**:
- API: the outline format of `src/content/outline.json` and `src/content/outline.generated.json`
- DB: none
- Entities: `Outline`, `Page`, `Entry`, `Text`

**Tests**: `site-docs-mfe/src/content/outline.test.ts` ("names a strings key that exists for every text it reads from the strings", "fills every placeholder of every text and command from the version data and the page address", "opens the get-started page with its starting points and link line across the whole column, the rest beside the rail", "reads each arrangement as its own entry type, with no drawing options", "refuses an unknown entry type, a retired drawing option and a figure the brand does not draw, naming the field", "reads a link to another screen as its extension id and an optional typed action, and refuses a screen named by its address token, a route beside an extension and a link with two targets"); `site-home-mfe/src/content/outline.test.ts` ("is one landing page whose entries are the home blocks, in the order of the page", "names only logo files the screen supplies", "names only samples the screen registry draws", "still parses, in every outline of the template, with every screen but those of the template left out and the logo strip hidden, and links none of the screens left out"); `site-home-mfe/src/screens/home/HomeScreen.test.tsx` ("shows no UI kit section, no logo strip and no link to the catalogue; the architecture map keeps the kit as plain text"); `site-libs-mfe/src/screens/libs/LibsPage.test.tsx` ("shows the UI kit card without its link to the catalogue"); `scripts/publish-prune.test.mjs` of the site repository (the two copies of the rule agree, and the build variables are read); `site-libs-mfe/src/content/outline.test.ts` and `site-templates-mfe/src/content/outline.test.ts` (the string-key cases).

### One Renderer for Every Content Page

- [x] `p1` - **ID**: `cpt-template-site-dod-content-model-page-renderer`

The system **MUST** render an outline page from the blocks of template-site-blocks, kit candidates and kit components only, each entry rendering the block it is named after or the kit part it names, in the frame the page's shape asks for, with numbered steps, the facts beside the body and the side panel of the page's headings, with no styling of its own; and **MUST** wrap a step's long shell commands so that the copied text stays the same commands.

**Implements**:
- `cpt-template-site-flow-content-model-read-content-page`
- `cpt-template-site-algo-content-model-page-anchors`
- `cpt-template-site-algo-content-model-arrange-entries`
- `cpt-template-site-algo-content-model-wrap-command`

**Touches**:
- API: none
- DB: none
- Entities: `Page`, `Entry`

**Tests**: `site-docs-mfe/src/screens/docs/DocsPage.test.tsx` ("renders the get-started steps with commands filled from the version data, one h1 and a link to its plain-text twin", "lists only the numbered steps in the side panel, one of them current, under the title the page names", "gives every region of a guide its own name, and wraps step commands instead of scrolling them"); `site-docs-mfe/src/content/wrapCommand.test.ts` ("keeps a long command one command for the shell, every line within the width but a lone long word", "never breaks inside quotes and leaves a short line alone"); `site-templates-mfe/src/screens/templates/TemplatesPage.test.tsx` ("puts a template's file explorer first, then what it gives as a list of items and its source buttons beside the facts"); `site-home-mfe/src/screens/home/HomeScreen.test.tsx` ("renders one level-one heading and every section of the landing page").

### Every Content Page Links Its Twin

- [x] `p2` - **ID**: `cpt-template-site-dod-content-model-twin-links`

The system **MUST** link each outline page's plain-text twin at `/<token>/<route>.md` (or `/<token>/index.md` for the screen root) relative to the host's document, from the foot of the side panel or, on a page without one, from the footer line under the content, and link an agent task's plain-text copy next to the page's twin.

**Implements**:
- `cpt-template-site-algo-content-model-twin-paths`
- `cpt-template-site-flow-content-model-read-content-page`

**Touches**:
- API: `GET /<token>/<route>.md`, `GET /<token>/index.md`
- DB: none
- Entities: `Page`

**Tests**: `site-docs-mfe/src/twinLinks.test.ts` ("writes the published plain-text twins relative to the shell document", "resolves a twin link inside a screen's shadow root against the shell document", "refuses a path that is not site-root"); `site-docs-mfe/src/screens/docs/DocsPage.test.tsx` ("links the twin of a page without a side panel from the line under its content", "collapses the agent task, with its full guide addresses and a link to its plain-text copy").

### Key Files Carried as Data

- [x] `p2` - **ID**: `cpt-template-site-dod-content-model-key-files`

The system **MUST** show a template's key files from the Base64 content the generated outline carries, decoded in the page, so that no source text that reads like an import sits in a bundled chunk.

**Implements**:
- `cpt-template-site-algo-content-model-key-files`

**Constraints**: `cpt-template-site-constraint-loader-rewrites`

**Touches**:
- API: none
- DB: none
- Entities: `Key file`

**Tests**: `site-templates-mfe/src/screens/templates/TemplatesPage.test.tsx` ("shows the key files with their content, the pinned source commit and a GitHub link to the file at that commit", "copies the text of the chosen file, finds files by path and shows a file the list is switched to", "opens the example tab with the screens of this site as links that open them through the screen domain").

## 6. Acceptance Criteria

- [x] A malformed outline (a field of the wrong type, an unknown entry type, a drawing option on an entry, a figure the brand does not draw) fails with the path of the field.
- [x] Every `t:` key of each content screen's outline exists in its strings, and every placeholder of every text is filled from its data.
- [x] Every content page renders exactly one top-level heading and links its plain-text twin, from the side panel or from the footer line.
- [x] A guide's side panel lists only its numbered steps.
- [x] A template page shows each key file's decoded content.
- [x] The home page is an outline of home entries, each rendering its home block.
- [x] A build that leaves screens out and hides entries shows no link to those screens and none of those entries on any page of the template: the home page loses the UI kit section and the logo strip and keeps the kit of its architecture map as plain text, the libraries page keeps the UI kit card without its catalogue link, and every pruned outline still passes the model. Without the build variables nothing is hidden.

Not applicable to this feature, with reasons: security (public, read-only pages with no visitor input beyond links), performance (key file decoding is memoized per file list), operations and data persistence (no runtime state or storage).
