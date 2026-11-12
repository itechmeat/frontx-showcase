# Decomposition: FrontX Site Repository

<!-- toc -->

- [1. Overview](#1-overview)
- [2. Entries](#2-entries)
  - [2.1 Template composition - HIGH](#21-template-composition---high)
  - [2.2 Shell layout and navigation - HIGH](#22-shell-layout-and-navigation---high)
  - [2.3 Site data - MEDIUM](#23-site-data---medium)
  - [2.4 Shell change ledger - MEDIUM](#24-shell-change-ledger---medium)
  - [2.5 Template shape guard - MEDIUM](#25-template-shape-guard---medium)
  - [2.6 Production build layout - MEDIUM](#26-production-build-layout---medium)
  - [2.7 Repository policies - LOW](#27-repository-policies---low)
  - [2.8 Dev run - LOW](#28-dev-run---low)
- [3. Feature Dependencies](#3-feature-dependencies)

<!-- /toc -->

## 1. Overview

This decomposition breaks the root [DESIGN](DESIGN.md) into the features that specify the code this repository owns at its root: the repository tooling in `scripts/`, the shell layout and the template-shell files the site changed. The cut follows the root DESIGN's components: one feature per component, except the repository guards, whose template shape check and repository policies are two features because they check different things on different inputs (the guards component is covered by both, and each check script belongs to exactly one of them).

Each feature names its code scope, so the FEATURE specs and the code markers that follow know where the feature lives. A file belongs to exactly one feature; the shared modules of `scripts/` (`template-discovery.mjs`, `entry-point.mjs`) belong to the foundation feature, template composition, which every other feature of `scripts/` depends on. Test files, test helpers and build configuration files are listed with the feature they verify or configure, but carry no markers (the registry ignores them).

Several requirements of the root [PRD](PRD.md) are met mostly inside the templates: the screens, the catalogue, the demos, the page metadata pipeline and the links between screens. Each such requirement is assigned here to the root feature that holds the root's share of it (composition, the shell, the production build or the generated site data); the template's share is specified in that template's own artifact tree, linked by its document and never by its ids:

- [template-site DESIGN](../template-site/architecture/DESIGN.md): the home, templates, docs and Libraries screens and their links between screens.
- [template-catalogue DESIGN](../template-catalogue/architecture/DESIGN.md): the UI Kit screen and its generation from the kit demo.
- [template-site-meta DESIGN](../template-site-meta/architecture/DESIGN.md): the generated head, discovery files, plain-text twins and head-sync.
- [template-site-brand DESIGN](../template-site-brand/architecture/DESIGN.md): the brand values over the kit, the typeface and the brand check.
- [template-kit-candidates DESIGN](../template-kit-candidates/architecture/DESIGN.md): the primitives proposed to the kit, used by the screens until the kit releases them.
- [template-site-blocks DESIGN](../template-site-blocks/architecture/DESIGN.md): the site's blocks, their layout tokens and the blocks showcase screen.
- [template-inbox DESIGN](../template-inbox/architecture/DESIGN.md), [template-mfe-demo DESIGN](../template-mfe-demo/architecture/DESIGN.md) and [template-calendar-demo DESIGN](../template-calendar-demo/architecture/DESIGN.md): the demo screens.

Not decomposed into features, because they implement no behaviour a numbered instruction would specify: the CI workflow (`.github/workflows/main.yml`), which runs the features' commands in the order DESIGN section 4.9 describes; the root tooling configuration (`eslint.config.js`, `tsconfig.json`, `vitest.config.mjs`); the template-shell payload under `site/` that the site did not change (`site/packages/`, `site/src/` and the unchanged files of `site/src-app/app/`), which carries gears-frontx residue markers and is never registered; and the composed copies under `site/src-app/mfe_packages/` and `site/src-app/verify_packages/` (`site-meta`, `site-brand`, `kit-candidates`, `site-blocks`), whose code is specified by the templates they are copied from.

The root DESIGN has no database (section 3.7), so no feature covers a data entity.

## 2. Entries

**Overall implementation status:**

- [x] `p1` - **ID**: `cpt-site-status-overall`

### 2.1 [Template composition](features/template-composition/) - HIGH

- [x] `p1` - **ID**: `cpt-site-feature-template-composition`

- **Purpose**: Composes this repository's templates into `site/`, the only way screen code reaches the site, so every screen package is committed once, inside its template, and the site's copy is checked for drift. It also keeps the site application installable as its own npm project at the registry pins, the base every other feature builds on.

- **Depends On**: None

- **Scope**:
  - `scripts/site-assemble.mjs`: copies every subtree a template claims into the same path under `site/`, records each written file in `site/src-app/mfe_packages/.assembled.json`, removes what no template claims any more, refuses to overwrite a path it did not create, reports drift in both directions naming each drifted file (`--check`) and re-copies on template edits (`--watch`); never writes outside the composed packages, the claimed tooling packages and the templates' AI bundles in `site/`.
  - `scripts/template-discovery.mjs`: a directory is a template exactly when it holds `frontx-template.json`; the one discovery every script that walks templates uses.
  - `scripts/entry-point.mjs`: the check every repository script uses to tell a command run from an import by a test.
  - The composition order of the site application (DESIGN section 4.3.3): template-shell seeded and template-mfe and template-design-guardrails added through the FrontX CLI, template-mfe's demo packages removed, the registry pins applied to `site/package.json` and to the framework and react workspaces (`site/packages/framework/package.json`, `site/packages/react/package.json`), `site/.npmrc`, the site lockfile written once with the pinned npm; afterwards every install is a clean install of `site/` (`npm run setup`).
  - The repository tooling root: the root `package.json` and lockfile with the Node floor and the pinned package manager, installed with `npm ci`.
  - The root share of the catalogue routes: template-catalogue's screen is composed into the site like every template's screens.
  - Tests: `scripts/site-assemble.test.mjs`, `scripts/template-discovery.test.mjs`, `scripts/entry-point.test.mjs`.

- **Out of scope**:
  - The content of each template and the catalogue's routes, pages and generation (each template's own tree; for the catalogue, [template-catalogue DESIGN](../template-catalogue/architecture/DESIGN.md)).
  - The shape rules a template must meet (template shape guard) and the pin rules a package must meet (repository policies).
  - The shell files the site changed (shell layout and navigation) and the record of them (shell change ledger).
  - The production layout of the build (production build layout).

- **Requirements Covered**:

  - [x] `p1` - `cpt-site-fr-single-copy`
  - [x] `p1` - `cpt-site-fr-catalogue-routes`
  - [x] `p1` - `cpt-site-nfr-toolchain`

- **Design Principles Covered**:

  - [x] `p1` - `cpt-site-principle-single-source`

- **Design Constraints Covered**:

  - [x] `p1` - `cpt-site-constraint-site-own-project`
  - [x] `p1` - `cpt-site-constraint-toolchain`

- **Domain Model Entities**:
  - Template
  - Screen MFE package
  - Assembly record
  - Provenance record
  - Ecosystem package

- **Design Components**:

  - [x] `p1` - `cpt-site-component-site-assemble`
  - [x] `p1` - `cpt-site-component-site-app`

- **API**:
  - `npm ci`
  - `npm run setup`
  - `npm run site:assemble`, `npm run site:assemble -- --check`, `npm run site:assemble -- --watch`

- **Sequences**:

  - `cpt-site-seq-compose-build`

- **Data**:
  - None: the site has no database (DESIGN section 3.7).

### 2.2 [Shell layout and navigation](features/shell-layout-navigation/) - HIGH

- [x] `p1` - **ID**: `cpt-site-feature-shell-layout-navigation`

- **Purpose**: Gives the site one look around its screens: the template-shell application rebuilt in place on React and the ui-kit, with a header whose navigation comes from the registered screens, a home page at the bare address, a footer, and a visible error state when a screen cannot load. Every FrontX mechanic (the screen domain, MFE loading, Shadow DOM isolation, the framework router, query addressing, the theme and language shared properties) stays as template-shell ships it.

- **Depends On**: `cpt-site-feature-template-composition`

- **Scope**:
  - `site/src-app/app/layout/`: the layout and its landmarks (skip link, sticky header, main landmark with the screen domain's slot and the right sidebar domain, footer in its two variants), the header's Constructor Fabric lockup, the navigation built from the registered screen extensions with a group only where a screen's `presentation.group` names a nav group the host defines (`navGroups.ts`, instances of the shell's nav group type) and the groups `site.config.json` hides left out, every entry a real link to its canonical address, the language select shown only for more than one language, the popup and overlay layers, the layout's strings in the FrontX i18n registry, the home screen choice (`home.ts`, `site.ts`) and the shell components of `layout/ui/`, built on kit candidates with layout-only CSS and an exemptions ledger (`layout/styles-exemptions.json`).
  - `site/packages/react/src/mfe/ThemeAwareReactLifecycle.tsx`: the base resets of every screen and widget shadow host read the theme's `--font-sans`, so a widget nested in a screen renders in the site typeface (G54).
  - `site/src/gts/`, `site/src/index.ts`: the screen extension type's optional `presentation.group` (`schemas/extension_screen.v1.json`), the id of an instance of the nav group type (`schemas/nav_group.v1.json`, exported as `navGroupSchema`); the host's instances and their registration with the type system are in `site/src-app/app/layout/navGroups.ts`.
  - `site/src-app/app/mfe/MfeScreenContainer.tsx` and `site/src-app/app/mfe/screenLoadFailure.ts`: the home screen mounted at the bare address with the `replace` intent after the address is read through the shell app's navigation facade; the per-page store of a failed screen load and the kit-built error state whose retry keeps the original history intent; the bootstrap failure state whose retry reloads the page.
  - `site/src-app/app/App.tsx` and `site/src-app/app/main.tsx`: the application entry with the light theme applied, the kit's tokens, the delivered document stylesheets and the document styles imported once, and the development overlay loaded in development only.
  - `site/src-app/app/documentEntries.ts`: the document-entry convention that loads every installed verify package's `src/document.css` (template-site-brand's brand tokens and typeface, template-site-blocks' layout tokens) between the kit's tokens and the document styles, naming no template.
  - `site/src-app/app/mfe/hostTheme.ts`: the host theme stamp that sets the current theme's appearance on every screen host in the screen slot, wired through the slot's attach and detach in the screen container.
  - `site/src-app/app/themes/`: the light and dark themes selecting the kit's own token sets.
  - The document styles and assets the shell layout uses: `site/src-app/app/globals.css`, `site/index.html`, `site/public/brand/` (the head icons; the lockup's logo is template-site-brand's asset) and `site/public/og-image.png`.
  - `site.config.json`: the site's settings file (home screen, footer screens, hidden header groups, languages and the site-level metadata values); the shell reads it at run time, and the production build's metadata step reads it too.
  - `site/vite.config.ts`: the development server's plain-text twin middleware that serves the twins template-site-meta's renderer produces, and the relative build base, which production build layout specifies (one configuration file carries both, and it carries no markers).
  - The changed shell documentation and test base: `site/README.md`, `site/QUICK_START.md`, `site/src-app/vitest.mfe.base.ts`.
  - The screen actions (`cpt-site-interface-screen-actions`): `mount_ext` for another screen and the show action a receiving screen declares for its pages; the root defines the contract that the templates' links send and their screens declare and handle, and the shell's header lists the demos group.
  - Tests: the suites under `site/src-app/app/layout/`, `site/src-app/app/mfe/MfeScreenContainer.test.tsx` and `site/src-app/app/mfe/hostTheme.test.ts`.

- **Out of scope**:
  - The registration bootstrap in `site/src-app/app/mfe/bootstrap.ts`, including the mount handler's report of a failed load to this feature's store (production build layout).
  - The screens themselves, each template's links to other screens and each receiving screen's show action and handler (each template's own tree, for example [template-site DESIGN](../template-site/architecture/DESIGN.md)).
  - The generated head, discovery files and the twins' content ([template-site-meta DESIGN](../template-site-meta/architecture/DESIGN.md)).
  - The record of which shell files changed (shell change ledger) and the styling and text checks over them (repository policies).

- **Requirements Covered**:

  - [x] `p1` - `cpt-site-fr-site-navigation`
  - [x] `p1` - `cpt-site-fr-screen-pages`
  - [x] `p1` - `cpt-site-fr-cross-screen-links`
  - [x] `p1` - `cpt-site-fr-demo-screens`
  - [x] `p1` - `cpt-site-fr-screen-load-failure`
  - [x] `p1` - `cpt-site-fr-plain-text-twins`
  - [x] `p1` - `cpt-site-nfr-semantics`

- **Design Principles Covered**:

  - None beyond the principles assigned to other features; the rebuild's rule that every other shell file stays as it ships is the shell change ledger's principle.

- **Design Constraints Covered**:

  - [x] `p1` - `cpt-site-constraint-query-addressing`

- **Domain Model Entities**:
  - Page
  - Screen extension
  - Site config

- **Design Components**:

  - [x] `p1` - `cpt-site-component-shell-layout`

- **API**:
  - `GET /?screen=<token>[;route=<path>]` (a page by canonical address)
  - `mount_ext` on the screen domain followed by the receiving screen's show action
  - `npm run dev` (the development server's plain-text twins)

- **Sequences**:

  - `cpt-site-seq-visit-page`
  - `cpt-site-seq-follow-link`

- **Data**:
  - None: the site has no database (DESIGN section 3.7).

### 2.3 [Site data](features/site-data/) - MEDIUM

- [x] `p2` - **ID**: `cpt-site-feature-site-data`

- **Purpose**: Generates the facts the site's own pages show about templates, versions and libraries from their sources, so no template description, version or source-spec is copied by hand, and fails when the generated files and their sources disagree.

- **Depends On**: `cpt-site-feature-template-composition`

- **Scope**:
  - `scripts/site-data.mjs`: writes the templates screen's outline, the docs screen's version data and the Libraries screen's data into template-site from every template's manifest and files, template-site's hand-written guide, the root and site pins and lockfiles, the installed packages, the registry's `gitHead` of each pinned release, the provenance, `.nvmrc` and the npm pin; installs a missing official template into the FrontX CLI inventory through the pinned CLI; fails on any inconsistency between these sources; `--check` regenerates in memory and fails on any difference.
  - The root share of the site's own sections: the generated data the home, templates, docs and Libraries screens render.
  - Tests: `scripts/site-data.test.mjs`.

- **Out of scope**:
  - The screens that render the data and the hand-written guide ([template-site DESIGN](../template-site/architecture/DESIGN.md)).
  - The header that lists the site's sections (shell layout and navigation).

- **Requirements Covered**:

  - [x] `p2` - `cpt-site-fr-site-sections`

- **Design Principles Covered**:

  - None: the decision this feature implements is a root ADR the component cites, not a design principle.

- **Design Constraints Covered**:

  - None: the constraints its inputs meet (the pins, the toolchain) are covered by the features that hold them.

- **Domain Model Entities**:
  - Template
  - Ecosystem package
  - Provenance record

- **Design Components**:

  - [x] `p2` - `cpt-site-component-site-data`

- **API**:
  - `npm run site:data`, `npm run site:data -- --check`

- **Sequences**:
  - None: the generation runs before the compose and build sequence and is not a sequence of its own.

- **Data**:
  - None: the site has no database (DESIGN section 3.7); the three generated files are template-site sources.

### 2.4 [Shell change ledger](features/shell-change-ledger/) - MEDIUM

- [x] `p2` - **ID**: `cpt-site-feature-shell-change-ledger`

- **Purpose**: Keeps the exact list of every template-shell file the site changed, added or removed against template-shell at the pinned source-spec, so the shell rebuild can be carried upstream and the repository policies know which shell files are site-owned code.

- **Depends On**: `cpt-site-feature-template-composition`, `cpt-site-feature-site-data`

- **Scope**:
  - `scripts/shell-changes.mjs`: the lists of changed, added and removed files of template-shell, template-mfe and template-design-guardrails; the long-dash adaptation every other applied text file carries; printing the site's changes; `--adapt` writes the adaptation; `--check` compares the lists and the adaptation with `site/` and the pristine templates in the FrontX CLI inventory (installed there by site data) and fails on any difference; the list of site-owned applied files it exports to the policies.
  - The rule that every applied file not on a list stays as its template ships it, apart from the adaptation.
  - Tests: `scripts/shell-changes.test.mjs`.

- **Out of scope**:
  - What the changed shell files do (shell layout and navigation, production build layout, dev run).
  - The styling and text checks over the listed files (repository policies).

- **Requirements Covered**:

  - None: the ledger serves the shell rebuild decision and the policies' scope; the requirements the changed files meet are covered by the features that own those files.

- **Design Principles Covered**:

  - [x] `p2` - `cpt-site-principle-shell-as-is`

- **Design Constraints Covered**:

  - None beyond the constraints assigned to other features.

- **Domain Model Entities**:
  - Shell change ledger
  - Provenance record

- **Design Components**:

  - [x] `p2` - `cpt-site-component-shell-change-ledger`

- **API**:
  - `npm run shell:changes`, `npm run shell:changes -- --check`, `npm run shell:changes -- --adapt`

- **Sequences**:
  - None: the ledger takes part in no runtime or build sequence.

- **Data**:
  - None: the site has no database (DESIGN section 3.7).

### 2.5 [Template shape guard](features/template-shape-guard/) - MEDIUM

- [x] `p2` - **ID**: `cpt-site-feature-template-shape-guard`

- **Purpose**: Holds every template of the repository to the one documented template shape, so a template consumer and a site developer can rely on it, and fails the repository's checks when a template does not follow it.

- **Depends On**: `cpt-site-feature-template-composition`

- **Scope**:
  - `scripts/validate-templates.mjs`: the FrontX CLI's own template validation (manifest contract and content self-containment), then the template shape rules of DESIGN section 4.2.1: overlay only, the identity prefix, claims only screen packages, non-screen packages and the template's own AI bundle, the README sections in their order, and the root `.gitignore` listing exactly the AI bundles of the existing templates and the site copies of their non-screen packages.
  - The template territory traceability rule as part of the template shape: each template's documents and markers carry only its own ids and no gears-frontx id; the validator keeps all ids in one set, so the shape check reports what a script can read and review holds the rest.
  - Tests: `scripts/validate-templates.test.mjs`.

- **Out of scope**:
  - The pin, styling and text rules (repository policies).
  - The package shape rules each package's own manifest test holds (each template's own tree).

- **Requirements Covered**:

  - [x] `p2` - `cpt-site-fr-uniform-shape`

- **Design Principles Covered**:

  - [x] `p2` - `cpt-site-principle-uniform-shape`

- **Design Constraints Covered**:

  - [x] `p2` - `cpt-site-constraint-template-territory`

- **Domain Model Entities**:
  - Template
  - Screen MFE package

- **Design Components**:

  - [x] `p2` - `cpt-site-component-guards`

- **API**:
  - `npm run templates:validate`

- **Sequences**:
  - None: the check takes part in no runtime or build sequence.

- **Data**:
  - None: the site has no database (DESIGN section 3.7).

### 2.6 [Production build layout](features/production-build-layout/) - MEDIUM

- [x] `p2` - **ID**: `cpt-site-feature-production-build-layout`

- **Purpose**: Makes the production build one self-contained static folder that holds the host, every screen package and the generated metadata outputs, and works unchanged at the root of an origin or under any sub-path.

- **Depends On**: `cpt-site-feature-template-composition`, `cpt-site-feature-shell-layout-navigation`

- **Scope**:
  - `scripts/site-dist.mjs`: copies every remote the manifest aggregate names from its package's build into `site/dist/mfe/<package>/` and rewrites each remote's `publicPath` relative to the aggregate; refuses an unknown manifest id or a missing aggregate before it writes; idempotent.
  - `site/src-app/app/mfe/bootstrap.ts`: the registration bootstrap of the host: the manifest aggregate fetched from the build base resolved against the document, a relative `publicPath` resolved against the aggregate's address before registration, and the screen domain's mount handler, which reports a failed load or mount to the shell layout's failure store.
  - The relative build base of the host (set in `site/vite.config.ts`, a file shell layout and navigation owns).
  - The build sequence: compose, the shell build, the production layout, then the metadata outputs generated by template-site-meta's command line with this repository's site config and raster record (`assets/og-image.svg`, `assets/rasters.json`).
  - The root share of the page metadata: the site-level values declared once in `site.config.json` and every output derived from them and from the screens' `seo` blocks in the build.
  - `scripts/serve-dist.mjs` (`npm start`): serves `site/dist/` from Node with the image server's headers, cache policy and content types, uncompressed, for a Node host whose CDN or proxy compresses.
  - `scripts/start.mjs` (`npm start`, temporary: remove once FrontX templates share the UI kit across MFEs and the build fits the default heap): installs the site when it has no finished install from its current lockfile, builds it when `site/dist/` is missing, built for another origin, or older than its inputs (a file added, changed or deleted), with a heap sized from the memory limit and one MFE build at a time, then serves it with `scripts/serve-dist.mjs`.
  - Tests: `scripts/site-dist.test.mjs`, `scripts/serve-dist.test.mjs`, `scripts/start.test.mjs`, `site/src-app/app/mfe/bootstrap.test.ts`.

- **Out of scope**:
  - The generator, its outputs, head-sync and the metadata check ([template-site-meta DESIGN](../template-site-meta/architecture/DESIGN.md)).
  - The failure store and the error state (shell layout and navigation).
  - Edge head injection (deferred, DESIGN section 4.11).

- **Requirements Covered**:

  - [x] `p2` - `cpt-site-fr-static-build`
  - [x] `p2` - `cpt-site-fr-metadata-single-source`
  - [x] `p2` - `cpt-site-fr-discovery-files`

- **Design Principles Covered**:

  - [x] `p2` - `cpt-site-principle-metadata-once`

- **Design Constraints Covered**:

  - None beyond the constraints assigned to other features.

- **Domain Model Entities**:
  - SEO block
  - Site config
  - Screen MFE package

- **Design Components**:

  - [x] `p2` - `cpt-site-component-deploy-layout`

- **API**:
  - `npm run build`
  - `npm run site:dist`
  - `npm run preview`
  - `npm start`
  - `npm run seo:generate`, `npm run seo:check`

- **Sequences**:

  - `cpt-site-seq-crawl`

- **Data**:
  - None: the site has no database (DESIGN section 3.7).

### 2.7 [Repository policies](features/repository-policies/) - LOW

- [x] `p3` - **ID**: `cpt-site-feature-repository-policies`

- **Purpose**: Holds the code the site owns to the styling rule, every template package to the exact registry pins the site installs, and every file of the repository to the brand and text rules, and checks the rules that hold across templates.

- **Depends On**: `cpt-site-feature-template-composition`, `cpt-site-feature-shell-change-ledger`

- **Scope**:
  - `scripts/policy-pins.mjs`: every screen and non-screen package of every template pins the FrontX ecosystem at the site application's registry versions, the shell's workspace packages at the applied shell's versions, a package another template delivers at that package's own version and the shared toolchain at the shell's own versions, exactly.
  - `scripts/policy-own-styles.mjs` and `scripts/style-rules.mjs`: CSS Modules on the kit's tokens only, no Tailwind in any form, in every template and in the shell files the ledger lists, and the layer rules of DESIGN section 4.2.3: every file classified (kit candidate, brand, layout tokens, block, screen frame, shell chrome, test, composition), compositions without stylesheets, `style` props or foreign class names, block and chrome stylesheets layout-only except the rows of their exemptions ledgers, every ledger row current and reasoned, colour literals only where the brand keeps them; the generated catalogue demo files are exempt by path.
  - `scripts/policy-text.mjs`: no long dash, design-tool vendor name, internal company domain or former product name in any file git would record.
  - The repository tests that hold rules across templates: `scripts/twin-paths.test.mjs` (the plain-text twin path rule's two copies give one answer), `scripts/mock-plugin-order.test.mjs`, `scripts/kit-theme-helpers.test.mjs` (every template's copy of template-mfe's kit theme helpers equals template-mfe's) and `scripts/site-languages.test.mjs` (the site's language list).
  - Tests: `scripts/policy-pins.test.mjs`, `scripts/policy-own-styles.test.mjs`, `scripts/style-rules.test.mjs`, `scripts/policy-text.test.mjs`.

- **Out of scope**:
  - The template shape (template shape guard).
  - Rewriting a template or a shell file: the policies only report.

- **Requirements Covered**:

  - [x] `p3` - `cpt-site-nfr-styling`
  - [x] `p3` - `cpt-site-nfr-content-rules`

- **Design Principles Covered**:

  - [x] `p3` - `cpt-site-principle-registry-shaped`

- **Design Constraints Covered**:

  - [x] `p3` - `cpt-site-constraint-no-tailwind`
  - [x] `p3` - `cpt-site-constraint-content-rules`

- **Domain Model Entities**:
  - Template
  - Screen MFE package
  - Ecosystem package
  - Shell change ledger

- **Design Components**:

  - [x] `p3` - `cpt-site-component-guards`

- **API**:
  - `npm run policy:pins`
  - `npm run policy:own-styles`
  - `npm run policy:text`
  - `npm run lint` (runs the styling and text policies)

- **Sequences**:
  - None: the policies take part in no runtime or build sequence.

- **Data**:
  - None: the site has no database (DESIGN section 3.7).

### 2.8 [Dev run](features/dev-run/) - LOW

- [x] `p3` - **ID**: `cpt-site-feature-dev-run`

- **Purpose**: Gives a developer and CI one local run of the whole site in which the host and every screen and widget package answer, with no interactive prompt and no unpinned download, and a smoke check that proves the run starts.

- **Depends On**: `cpt-site-feature-template-composition`, `cpt-site-feature-shell-layout-navigation`

- **Scope**:
  - `scripts/dev-smoke.mjs`: starts the documented development run, waits until the host and every remote entry the host's served manifests name answer, then stops every process it started; fails first when a tool the shell runs through `npx` is missing from the site's install, when npx starts a download or when a development port is taken.
  - `site/scripts/dev-all.ts`: the shell's development script, changed to preview every remote on its fixed port with a strict port, so a taken port stops the run with the port's name.
  - The development tool the shell runs through `npx` declared in the site's install.
  - `scripts/verify-ui.mjs` and `scripts/design-verify-baseline.mjs`: the design check of template-design-guardrails over the development run, on every page of every composed screen, the unpublished ones included, every block showcase route and the not-found address at 1440 and 390 pixels, failing only on a finding the root baseline `scripts/design-verify-baseline.json` does not carry; the baseline built from a run's findings and checked so that every carried finding names its reason.
  - Tests: `scripts/dev-smoke.test.mjs`, `scripts/verify-ui.test.mjs`, `scripts/design-verify-baseline.test.mjs`.

- **Out of scope**:
  - The plain-text twins the development server serves (shell layout and navigation).
  - The production build (production build layout).

- **Requirements Covered**:

  - [x] `p3` - `cpt-site-fr-local-run`

- **Design Principles Covered**:

  - None beyond the principles assigned to other features.

- **Design Constraints Covered**:

  - None beyond the constraints assigned to other features.

- **Domain Model Entities**:
  - Screen MFE package

- **Design Components**:

  - [x] `p3` - `cpt-site-component-dev-run`

- **API**:
  - `npm run dev`
  - `npm run dev:smoke`
  - `npm run verify:ui`, `npm run verify:ui:baseline`

- **Sequences**:
  - None: the local run is not one of the DESIGN's sequences.

- **Data**:
  - None: the site has no database (DESIGN section 3.7).

---

## 3. Feature Dependencies

```text
cpt-site-feature-template-composition
    ↓
    ├─→ cpt-site-feature-shell-layout-navigation
    │       ├─→ cpt-site-feature-production-build-layout
    │       └─→ cpt-site-feature-dev-run
    ├─→ cpt-site-feature-site-data
    │       └─→ cpt-site-feature-shell-change-ledger
    │               └─→ cpt-site-feature-repository-policies
    └─→ cpt-site-feature-template-shape-guard
```

**Dependency Rationale**:

- `cpt-site-feature-shell-layout-navigation` requires `cpt-site-feature-template-composition`: the shell lays out and navigates the screens that composition brings into the site and installs at the registry pins.
- `cpt-site-feature-site-data` requires `cpt-site-feature-template-composition`: it finds the templates through the shared template discovery and reads the site's install and provenance.
- `cpt-site-feature-template-shape-guard` requires `cpt-site-feature-template-composition`: it finds the templates through the shared template discovery.
- `cpt-site-feature-shell-change-ledger` requires `cpt-site-feature-template-composition` and `cpt-site-feature-site-data`: it runs through the shared entry check, and its check compares the site with the pristine template-shell in the FrontX CLI inventory, which the site data generation installs.
- `cpt-site-feature-production-build-layout` requires `cpt-site-feature-template-composition` and `cpt-site-feature-shell-layout-navigation`: it lays out the remotes composition builds, reports a failed load to the shell layout's failure store, and reads the site config and the build base held in files the shell layout owns.
- `cpt-site-feature-repository-policies` requires `cpt-site-feature-template-composition` and `cpt-site-feature-shell-change-ledger`: the pin and styling policies find the templates through the shared discovery, and the styling and text policies take the site-owned shell files from the ledger.
- `cpt-site-feature-dev-run` requires `cpt-site-feature-template-composition` and `cpt-site-feature-shell-layout-navigation`: the run starts the composed remotes and the rebuilt shell's host.
- `cpt-site-feature-template-shape-guard`, `cpt-site-feature-site-data` and `cpt-site-feature-shell-layout-navigation` are independent of each other and can be developed in parallel; so are `cpt-site-feature-production-build-layout` and `cpt-site-feature-dev-run`.
