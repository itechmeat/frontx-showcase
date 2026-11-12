# Feature: Generate and Check

- [x] `p1` - **ID**: `cpt-template-site-meta-featstatus-generate-and-check`

<!-- toc -->

- [1. Feature Context](#1-feature-context)
  - [1.1 Overview](#11-overview)
  - [1.2 Purpose](#12-purpose)
  - [1.3 Actors](#13-actors)
  - [1.4 References](#14-references)
- [2. Actor Flows (CDSL)](#2-actor-flows-cdsl)
  - [Generate After the Build](#generate-after-the-build)
  - [Check in the Project's Checks](#check-in-the-projects-checks)
  - [Run the Command Line](#run-the-command-line)
- [3. Processes / Business Logic (CDSL)](#3-processes--business-logic-cdsl)
  - [Parse the Command Line](#parse-the-command-line)
  - [Load the Site](#load-the-site)
  - [Metadata Rules](#metadata-rules)
  - [Routing Version](#routing-version)
  - [Render the Outputs](#render-the-outputs)
  - [Linked Assets](#linked-assets)
  - [Raster Record](#raster-record)
- [4. States (CDSL)](#4-states-cdsl)
  - [No Feature-Owned State Machine](#no-feature-owned-state-machine)
- [5. Definitions of Done](#5-definitions-of-done)
  - [Generation](#generation)
  - [Check and Drift](#check-and-drift)
  - [One Routing Version](#one-routing-version)
  - [Raster Record](#raster-record-1)
  - [Command Line](#command-line)
- [6. Acceptance Criteria](#6-acceptance-criteria)

<!-- /toc -->

## 1. Feature Context

- [x] `p1` - `cpt-template-site-meta-feature-generate-and-check`

### 1.1 Overview

Runs the pipeline as the project's two commands. `generate`, after the project's build, applies every rule and writes every output and twin into the build output. `check`, in the project's checks, applies the same rules and, when generated outputs exist, generates them again on the recorded origin and names each that differs. Both share one loading, rule and rendering path, bundle head-sync with esbuild, check the routing version, check the raster record and run from one command line.

### 1.2 Purpose

Published metadata must never go stale silently. Generation refuses to write anything while a rule fails or a linked asset is missing, and the check fails on every output that no longer equals what the sources produce, so a change is made in a source and generated again rather than edited in the output.

**Requirements**: `cpt-template-site-meta-fr-linked-assets`, `cpt-template-site-meta-fr-metadata-rules`, `cpt-template-site-meta-fr-output-drift`, `cpt-template-site-meta-fr-routing-version`, `cpt-template-site-meta-fr-raster-record`, `cpt-template-site-meta-nfr-deterministic-outputs` (shared with the outputs feature: this feature keeps the bundled runtime deterministic and compares bytes; that feature keeps the rendered outputs pure)

**Principles**: `cpt-template-site-meta-principle-regenerate-never-edit`

### 1.3 Actors

| Actor | Role in Feature |
|-------|-----------------|
| `cpt-template-site-meta-actor-project-build` | Runs generation after the production build and the check in continuous integration |
| `cpt-template-site-meta-actor-project-developer` | Runs the check and the command line, and reads the failures that name the screen, route or output at fault |

### 1.4 References

- **PRD**: [PRD.md](../../PRD.md)
- **Design**: [DESIGN.md](../../DESIGN.md), components `cpt-template-site-meta-component-generator`, `cpt-template-site-meta-component-raster-check` and `cpt-template-site-meta-component-command-line`, sequences `cpt-template-site-meta-seq-generate` and `cpt-template-site-meta-seq-check`
- **Decomposition**: [DECOMPOSITION.md](../../DECOMPOSITION.md)
- **Dependencies**: `cpt-template-site-meta-feature-page-map`, `cpt-template-site-meta-feature-head-sync`, `cpt-template-site-meta-feature-plain-text-twins`, `cpt-template-site-meta-feature-seo-outputs`
- **Code**: `template-site-meta/src-app/verify_packages/site-meta/src/generate.ts`, `template-site-meta/src-app/verify_packages/site-meta/src/rasters.ts`, `template-site-meta/src-app/verify_packages/site-meta/src/cli.ts`, `template-site-meta/src-app/verify_packages/site-meta/src/args.ts`

## 2. Actor Flows (CDSL)

**Use cases**: `cpt-template-site-meta-usecase-generate`, `cpt-template-site-meta-usecase-check`

### Generate After the Build

- [x] `p1` - **ID**: `cpt-template-site-meta-flow-generate-and-check-generate`

**Actor**: `cpt-template-site-meta-actor-project-build`

**Success Scenarios**:
- The build runs generation with an origin, every rule holds and every linked asset exists: every output and twin is written into the build output and listed.
- The build runs generation with `SITE_INDEXING=off`: no page is indexable, robots.txt disallows every path, the sitemap lists no address and no `llms.txt` is written, nor kept from an earlier generation.

**Error Scenarios**:
- No origin: generation stops with the message naming `site.config.json.origin`.
- `SITE_INDEXING` is neither `on` nor `off`, or `unpublishedScreens` names a screen the site does not have or its home screen: generation stops naming it.
- A rule fails: generation stops listing every failure, and nothing is written.
- The build output has no built document: generation stops asking for the build first.
- A linked asset is missing from the build output: generation stops naming each missing file.

**Steps**:
1. [x] - `p1` - Show a path in a message relative to the project - `inst-shown-path`
2. [x] - `p1` - The build runs generation; resolve the indexing and load the site on the origin resolved from the preview override or the configuration - `inst-load-on-origin`
3. [x] - `p1` - Apply the configuration rule, the metadata rules, the routing version check and the raster record check; **IF** any fails, stop listing every failure - `inst-if-rules-fail`
4. [x] - `p1` - **IF** the build output has no `index.html`, stop asking for the build first - `inst-if-no-build`
5. [x] - `p1` - Read the built document; **IF** a linked asset is missing, stop naming each one - `inst-if-missing-assets`
6. [x] - `p1` - Render every output and twin, with the site's publishing choices and the build's indexing - `inst-render`
   1. [x] - `p1` - **IF** the indexing is `off`, remove any `llms.txt` the build output holds - `inst-if-indexing-off`
7. [x] - `p1` - **FOR EACH** output, create its folder and write it into the build output - `inst-write-outputs`
8. [x] - `p1` - **RETURN** the written files relative to the project - `inst-return-written`

### Check in the Project's Checks

- [x] `p1` - **ID**: `cpt-template-site-meta-flow-generate-and-check-check`

**Actor**: `cpt-template-site-meta-actor-project-developer`

**Success Scenarios**:
- Without generated outputs: the rules hold and the result says no outputs were compared.
- With generated outputs: the rules hold and every output equals what the sources generate on the recorded origin and with the recorded indexing.

**Error Scenarios**:
- A rule fails: each failure is reported.
- A linked asset is missing from the build output: each missing file is named.
- An output differs from what the sources generate or is missing: each is named with the command that generates it again.
- A build recorded as not indexable holds an `llms.txt`: it is named.

**Steps**:
1. [x] - `p1` - The developer or continuous integration runs the check; read the origin and the indexing recorded in the build output's page map manifest, when there is one (a manifest that records no indexing was generated indexable) - `inst-read-recorded-origin`
2. [x] - `p1` - Load the site on the recorded origin, or on a placeholder origin that enters no rule - `inst-load-site`
3. [x] - `p1` - Apply the configuration rule, the metadata rules, the routing version check and the raster record check - `inst-apply-rules`
4. [x] - `p1` - **IF** generated outputs exist - `inst-if-outputs-exist`
   1. [x] - `p1` - Read the built document and report every missing linked asset - `inst-check-assets`
   2. [x] - `p1` - **IF** the configuration rule reported an error, its messages stand alone and the outputs are not compared; **ELSE** render every output again and, **FOR EACH** output, **IF** its file is missing or differs, report it with the command to generate again - `inst-compare-outputs`
      1. [x] - `p1` - **IF** the recorded indexing is `off` and the build output holds an `llms.txt`, report it - `inst-if-llms-unindexed`
5. [x] - `p1` - **RETURN** the failures and whether outputs were compared - `inst-return-result`

### Run the Command Line

- [x] `p2` - **ID**: `cpt-template-site-meta-flow-generate-and-check-command-line`

**Actor**: `cpt-template-site-meta-actor-project-developer`

**Success Scenarios**:
- `generate` prints the written files relative to the working directory and exits 0.
- `check` prints that the rules hold and whether the outputs are in sync or none were compared, and exits 0.

**Error Scenarios**:
- A usage error prints the usage and exits 2.
- A failed check prints each failure and exits 1.
- A thrown failure prints its message and exits 1.

**Steps**:
1. [x] - `p2` - Take the project the package sits in, four levels above its source folder, as the default project - `inst-default-project`
2. [x] - `p2` - The developer runs the command; parse the arguments; **IF** they are invalid, print the message and **RETURN** exit code 2 - `inst-if-usage-error`
3. [x] - `p2` - **IF** the command is `generate`, run generation, print the written files relative to the working directory and **RETURN** exit code 0 - `inst-if-generate`
4. [x] - `p2` - Run the check; **IF** it reports failures, print each and **RETURN** exit code 1 - `inst-if-check-fails`
5. [x] - `p2` - Print that the rules hold and that the outputs are in sync, or that there were none to compare; **RETURN** exit code 0 - `inst-report-check`
6. [x] - `p2` - Set the process exit code from the result; **IF** the run throws, print its message and set exit code 1 - `inst-exit-code`

## 3. Processes / Business Logic (CDSL)

### Parse the Command Line

- [x] `p2` - **ID**: `cpt-template-site-meta-algo-generate-and-check-parse-args`

**Input**: The arguments after the script, the working directory and the default project.

**Output**: The command, the project paths and the raster record, or a failure carrying the usage.

**Steps**:
1. [x] - `p2` - Name the usage line and the two commands, `generate` and `check` - `inst-usage`
2. [x] - `p2` - **IF** the first argument is not a command, fail with the usage - `inst-if-unknown-command`
3. [x] - `p2` - **FOR EACH** option and value pair: **IF** the option is not `--project`, `--config` or `--rasters`, fail; **IF** the value is missing or is an option, fail; **ELSE** resolve the value against the working directory - `inst-foreach-option`
4. [x] - `p2` - Take the project from `--project` or the default, and the raster record from `--rasters` when given - `inst-take-project`
5. [x] - `p2` - **RETURN** the command, the project paths with the configuration from `--config` or the default, and the raster record - `inst-return-args`

### Load the Site

- [x] `p1` - **ID**: `cpt-template-site-meta-algo-generate-and-check-load-site`

**Input**: The project paths, the way to resolve the origin and the build's indexing.

**Output**: The configuration, the published screen extensions, the page map and what the site leaves out.

**Steps**:
1. [x] - `p1` - Read the site configuration - `inst-read-config`
2. [x] - `p1` - Read the screen domain - `inst-read-domain`
3. [x] - `p1` - Read the screen extensions of the composed packages - `inst-read-extensions`
4. [x] - `p1` - Split the extensions into the published ones and the ones `unpublishedScreens` leaves out (`cpt-template-site-meta-algo-page-map-published-screens`), and take the hidden screens' extension ids and tokens with `hiddenEntries` - `inst-published-screens`
5. [x] - `p1` - Build the page map of the published screens on the resolved origin with the build's indexing - `inst-build-map`
6. [x] - `p1` - **RETURN** the configuration, the published extensions, the map and the publishing choices - `inst-return-site`

### Metadata Rules

- [x] `p1` - **ID**: `cpt-template-site-meta-algo-generate-and-check-rules`

**Input**: The site configuration, the screen extensions and the page map.

**Output**: One message per broken rule; none when the sources hold the rules.

**Steps**:
1. [x] - `p1` - **IF** a share image is configured without alternative text, an `llmsSections` entry lacks a one-line heading or a non-empty list of one-line items, or `unpublishedScreens` or `hiddenEntries` is not a list of non-empty strings, report it - `inst-config-rule`
2. [x] - `p1` - Check a place's fields: a title is required; a description is required where asked and, when present, is 50 to 160 characters - `inst-describe-rule`
3. [x] - `p1` - **FOR EACH** screen extension - `inst-foreach-extension`
   1. [x] - `p1` - Name it by its package and route - `inst-name-place`
   2. [x] - `p1` - **IF** it has no metadata block, report it and go to the next one - `inst-if-no-block`
   3. [x] - `p1` - Check the screen's fields with a required description - `inst-check-screen`
   4. [x] - `p1` - **FOR EACH** declared route: **IF** its key is not a path inside the screen other than `/`, report it; check its fields, with a required description unless it is a pattern or not indexable - `inst-foreach-route`
4. [x] - `p1` - Report every document title and every canonical address that more than one static page shares - `inst-unique-values`
5. [x] - `p1` - **RETURN** the messages - `inst-return-rules`

### Routing Version

- [x] `p1` - **ID**: `cpt-template-site-meta-algo-generate-and-check-routing-version`

**Input**: The project paths and the package's own directory.

**Output**: A message when the routing copy head-sync bundles is another version than the project's; none otherwise.

**Steps**:
1. [x] - `p1` - Take the package's own directory, where npm puts its own copy of a dependency whose version differs from the project's - `inst-tool-dir`
2. [x] - `p1` - **IF** the project has no routing install or the package has no own copy, **RETURN** no message (esbuild then bundles the project's copy) - `inst-if-single-copy`
3. [x] - `p1` - **RETURN** a message naming both versions when they differ, none when they are equal - `inst-compare-versions`

### Render the Outputs

- [x] `p1` - **ID**: `cpt-template-site-meta-algo-generate-and-check-render-outputs`

**Input**: The project paths, the configuration, the page map, the built document, the site's publishing choices and the build's indexing.

**Output**: Every output and twin keyed by its path in the build output.

**Steps**:
1. [x] - `p1` - Name the documented packages, `@gears-frontx/ui-kit` and `@gears-frontx/api` - `inst-documented-packages`
2. [x] - `p1` - Bundle head-sync's browser entry with esbuild into one minified IIFE for the browser, with no legal comments and no file written - `inst-bundle`
3. [x] - `p1` - **IF** esbuild produced no output, fail; **ELSE** **RETURN** its text - `inst-if-no-bundle`
4. [x] - `p1` - **FOR EACH** documented package installed in the project with an `llms.txt`, link its published `llms.txt` on unpkg at the installed version with its description; a package without one is left out; nothing is fetched - `inst-find-published-llms`
5. [x] - `p1` - Render the twins of the published outlines (`cpt-template-site-meta-algo-plain-text-twins-published-outlines`) - `inst-render-twins`
6. [x] - `p1` - **RETURN** the head block of the built document with the bundle, the page map manifest with the indexing, the sitemap, the robots file for the indexing, `llms.txt` only when the indexing is `on`, the web manifest and every twin by its file - `inst-return-outputs`

### Linked Assets

- [x] `p2` - **ID**: `cpt-template-site-meta-algo-generate-and-check-linked-assets`

**Input**: The project paths, the page map and the built document.

**Output**: One message per linked asset the build output lacks.

**Steps**:
1. [x] - `p2` - Read every site-relative icon link of the built document (a `rel` ending in `icon`, not a protocol or protocol-relative address) as a path in the build output - `inst-linked-icons`
2. [x] - `p2` - Take the icon set and the icons the document links - `inst-asset-files`
3. [x] - `p2` - **IF** the share image is on the site's own origin, add its path - `inst-if-own-share-image`
4. [x] - `p2` - **RETURN** a message for each file the build output lacks - `inst-return-missing`

### Raster Record

- [x] `p2` - **ID**: `cpt-template-site-meta-algo-generate-and-check-rasters`

**Input**: The raster record file, or none.

**Output**: One message per difference between the record and the files; none without a record.

**Steps**:
1. [x] - `p2` - Require a field to be a non-empty string, failing with its place in the record - `inst-require-field`
2. [x] - `p2` - Require an entry to be an object, failing with its place in the record - `inst-require-entry`
3. [x] - `p2` - **IF** the record has no `rasters` and `copies` lists, fail naming the record - `inst-if-no-lists`
4. [x] - `p2` - Parse each raster (file, size, source, source hash, hash) and each copy (file, source) strictly - `inst-parse-entries`
5. [x] - `p2` - **IF** no record is given, **RETURN** no message - `inst-if-no-record`
6. [x] - `p2` - Parse the record and resolve its paths against the record's folder - `inst-parse-record`
7. [x] - `p2` - Report a file that does not exist - `inst-report-missing`
8. [x] - `p2` - **FOR EACH** raster whose file and source exist: **IF** the source's hash changed, report it with the size to render again; **IF** the raster's hash is not the recorded one, report it - `inst-foreach-raster`
9. [x] - `p2` - **FOR EACH** copy whose file and source exist: **IF** the bytes differ, report it - `inst-foreach-copy`
10. [x] - `p2` - **RETURN** the messages - `inst-return-raster-messages`

## 4. States (CDSL)

### No Feature-Owned State Machine

Not applicable because each command is one run from sources to files or messages; the only persisted result is the build output, which the next generation replaces and the check compares, with no lifecycle of its own.

## 5. Definitions of Done

### Generation

- [x] `p1` - **ID**: `cpt-template-site-meta-dod-generate-and-check-generate`

The system **MUST** generate only after every rule holds, the built document exists and every linked asset is in the build output, bundle head-sync deterministically, link the documented packages' published `llms.txt` without fetching it, write every output and twin into the build output only and return the written files.

**Implements**:
- `cpt-template-site-meta-flow-generate-and-check-generate`
- `cpt-template-site-meta-algo-generate-and-check-load-site`
- `cpt-template-site-meta-algo-generate-and-check-render-outputs`
- `cpt-template-site-meta-algo-generate-and-check-linked-assets`

**Touches**:
- Component: `cpt-template-site-meta-component-generator`
- Entities: `SitePaths`, `SiteMetaMap`

### Check and Drift

- [x] `p1` - **ID**: `cpt-template-site-meta-dod-generate-and-check-check`

The system **MUST** apply the configuration and metadata rules in the check as in generation and, when generated outputs exist, generate them again on the recorded origin with the recorded indexing and name each output that differs or is missing, and an `llms.txt` of a build that may not be indexed; without outputs it **MUST** say that none were compared.

**Implements**:
- `cpt-template-site-meta-flow-generate-and-check-check`
- `cpt-template-site-meta-algo-generate-and-check-rules`

**Touches**:
- Component: `cpt-template-site-meta-component-generator`
- Entities: `SiteConfig`, `ScreenExtension`

### One Routing Version

- [x] `p1` - **ID**: `cpt-template-site-meta-dod-generate-and-check-routing-version`

The system **MUST** fail generation and the check when the routing copy esbuild resolves for head-sync is another version than the one the project runs.

**Implements**:
- `cpt-template-site-meta-algo-generate-and-check-routing-version`

**Constraints**: `cpt-template-site-meta-constraint-routing-version`

**Touches**:
- Component: `cpt-template-site-meta-component-generator`

### Raster Record

- [x] `p2` - **ID**: `cpt-template-site-meta-dod-generate-and-check-rasters`

The system **MUST** parse the raster record strictly, resolve its paths against the record's folder, and report a missing file, a source changed since its raster was drawn, a raster that is not the recorded one and a copy that differs from its source; without a record it **MUST** check nothing.

**Implements**:
- `cpt-template-site-meta-algo-generate-and-check-rasters`

**Touches**:
- Component: `cpt-template-site-meta-component-raster-check`
- Entities: `RastersRecord`

### Command Line

- [x] `p2` - **ID**: `cpt-template-site-meta-dod-generate-and-check-command-line`

The system **MUST** run `generate` or `check` with the `--project`, `--config` and `--rasters` options resolved against the working directory, the project defaulting to the one the package sits in and the configuration to `site.config.json` in the project, print failures and written files relative to the working directory, and exit 0 on success, 1 on failure and 2 on a usage error.

**Implements**:
- `cpt-template-site-meta-flow-generate-and-check-command-line`
- `cpt-template-site-meta-algo-generate-and-check-parse-args`

**Touches**:
- Component: `cpt-template-site-meta-component-command-line`
- Entities: `SitePaths`

## 6. Acceptance Criteria

- [x] The check reports the rules alone when the build output has no generated outputs.
- [x] The check holds right after generation and names every output that drifts from the sources.
- [x] Generation writes a twin per outline page from its strings and data, lists it in `llms.txt` and the check holds it to its sources.
- [x] Generation is refused when the build lacks an icon the head links, or an icon the built page links, the main favicon among them.
- [x] The check fails when a share image is configured without its alternative text.
- [x] With `SITE_INDEXING=off`, generation writes noindex heads, a sitemap without addresses, a robots.txt that disallows everything and no `llms.txt`, removing one an earlier generation left; the check holds on that build and names a planted `llms.txt`.
- [x] A screen `unpublishedScreens` names is in no output: no page, sitemap line, `llms.txt` line or twin; the published outlines' links to it are pruned with what holds them; the entries `hiddenEntries` names are in no twin; the check holds on that build.
- [x] A missing metadata block, a missing title, a description outside 50 to 160 characters, two pages with one title, two route keys naming one address and a route key that is not a path inside the screen are each refused.
- [x] The routing version check holds when the tool bundles the project's copy, when both copies are one version or when the project has no install, and fails when the tool resolves its own copy of another version.
- [x] The raster check does nothing without a record, holds while every raster and copy matches, and names an edited source with its stale copy, a replaced raster and a missing recorded file.
- [x] The command line takes the command, the project the package sits in and the configuration inside it by default, resolves the options against the working directory, and refuses an unknown command, an unknown option and an option without its value.

**Test scenarios** (all in `template-site-meta/src-app/verify_packages/site-meta/src/`, the project fixture in `test-support/project.ts`):
- `check.test.ts`: the `check` cases ("reports the rules alone when site/dist has no generated outputs"; "holds right after generation, and names every output that drifts from the sources"; "writes a plain-text twin per outline page from its strings and data, lists it in llms.txt and holds it to its sources"; "refuses to generate when the build lacks an icon the head links"; "refuses to generate when the built page links an icon the build lacks, the main favicon among them"; "fails the check when a share image is configured without its alternative text"); the `checkConfig`, `linkedIcons`, `checkRoutingVersion`, `checkRasters` cases and "the duplicate canonical rule".
- `generate.test.ts`: "seo rules hold for well-formed metadata"; "require a seo block, a title and a 50 to 160 character description"; "refuse two pages with one title, and a route key that is not a path inside the screen".
- `args.test.ts`: the three `parseArgs` cases.
- `publishing.test.ts`: "generates noindex heads, a sitemap without addresses, a robots.txt that disallows everything and no llms.txt; check holds and refuses a planted llms.txt"; "leaves an indexing-on build as it was"; "leaves an unpublished screen out of every output and prunes the links published outlines hold to it"; "publishes every screen when the list is absent"; "refuses a token no screen declares, the home screen, and a list that is not one of strings".
