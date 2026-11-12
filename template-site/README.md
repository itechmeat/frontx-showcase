# template-site

The FrontX site's own sections, as a FrontX template: home, templates, docs and libs.

## What it contributes

Four screen MFE packages and the folder they share:

- `src-app/mfe_packages/site-home-mfe/`: the home page, written as the home outline (`src/content/outline.json`) with its live kit samples in `src/samples/kitSamples.tsx` and the logo files of the teams using FrontX in `src/content/logos/`. What FrontX is, the three templates that give an application its structure, the architecture in one diagram, a worked first change, live UI kit samples that link to the catalogue, the teams using FrontX, the three steps to a running application and a closing call to action.
- `src-app/mfe_packages/site-templates-mfe/`: an index of the templates, grouped by what they are for, and a page per template (its description, what it gives, the "Before you start" card, a Files tab with its key files and their content and an Example tab with the screens of the site built from it). The pages are generated from each template's manifest and source at the version the site uses.
- `src-app/mfe_packages/site-docs-mfe/`: an overview and two guides (run a shell and its first MFE, make a first change) with a tab bar across them.
- `src-app/mfe_packages/site-libs-mfe/`: the FrontX packages with their versions and install commands, and short technical summaries of routing, microfrontends and the screen domain, with a tab bar across the four pages.
- `src-app/mfe_packages/shared/site/`: the content model every page is written in (`content/outline.ts`, with `content/twins.ts` for the paths of the plain-text twins) and its renderer (`content/OutlinePage.tsx`, with the key-files explorer binding in `content/Explorer.tsx`, the command wrapping in `content/wrapCommand.ts`, the choice of brand art in `content/brandArt.tsx` and the page loading, error and not-found states in `content/PageStates.tsx`), the links between screens (`navigation/`: `SiteLink`, `openScreen.ts` with the screen domain's mount action and the show action handler, `siteScreens.ts` with the template's screen ids and the docs and templates screens' show actions), and the theme helpers the four lifecycles and screen frames share (`theme/`: the kit's tokens re-anchored on the shadow host, the host theme mapped to the kit's scope). The folder holds no stylesheet: the renderer composes the blocks of `@gears-frontx/site-blocks`, the kit candidates of `@gears-frontx/kit-candidates`, the brand art of `@gears-frontx/site-brand` and `@gears-frontx/ui-kit` components.

It also contributes its AI bundle, `.frontx/ai/@gears-frontx/frontx-template-site/`, with three guidelines: `site-contract` (the site screens), `site-styling` (how every part of the site is styled, in place of the Tailwind passages of template-shell's `mfe-package-contract`) and `menu-groups` (the nav groups the header menu reads and how a screen names one).

## Prerequisites

A project with template-shell, template-site-brand, template-kit-candidates and template-site-blocks applied (template-site-brand delivers the brand tokens and the typeface to the host's document, and every screen receives them in its shadow root with the adopted head styles, plus the brand art; template-kit-candidates and template-site-blocks deliver the kit candidates and the blocks the pages are composed from, as the named packages `@gears-frontx/kit-candidates` and `@gears-frontx/site-blocks`; the shell supplies the host, the screen domain, `src-app/vitest.mfe.base.ts`, `src-app/__test-utils__/`, the `frontxMfGts()` build plugin and the `RestMockPlugin` the API services use). The packages pin `@gears-frontx/site-blocks`, `@gears-frontx/kit-candidates` and `@gears-frontx/site-brand` at the versions their templates deliver (`0.1.0-alpha.0`), `@gears-frontx/ui-kit` `0.4.0`, `@gears-frontx/routing` `0.3.0`, `@gears-frontx/routing-tanstack` `0.3.0`, `lucide-react` `1.33.0` and the shell's workspace versions exactly.

## Screens and routes

| Token | Package | Internal routes | Menu order | Port |
|---|---|---|---|---|
| `home` | `site-home-mfe` | `/` | 10 | 3050 |
| `templates` | `site-templates-mfe` | `/`, `/<template>` (one per template) | 20 | 3051 |
| `docs` | `site-docs-mfe` | `/`, `/get-started`, `/first-change` | 40 | 3052 |
| `libs` | `site-libs-mfe` | `/`, `/routing`, `/mfes`, `/screen-domain` | 50 | 3053 |

Addresses: `/?screen=home`, `/?screen=templates;route=template-shell`, `/?screen=docs;route=get-started`, `/?screen=libs;route=routing`. Each screen's other paths render its own not-found page.

The site's own sections use bare tokens (`home`, `templates`, `docs`); the `<scope>-<screen>` token rule is for demo templates.

## Content and data

The home, templates, docs and libs pages are outlines in the model of `shared/site/content/outline.ts`: ordered entries, each named after the block of template-site-blocks it renders (hero and the other home sections, section headings, numbered guide steps with a titled command block and an expected result, path cards, start paths, template pair and rows, card tiles, panels, the key-files explorer with an example tab, facts, troubleshooting, the box and rule calls to action, the package list) or the kit part it renders directly (paragraphs, checklists, linked lists, code, callouts, collapsible details), carrying content only, whose texts are keys of the screen's English strings and whose `{name}` placeholders are filled from the screen's data. The home, docs and libs outlines are written by hand (`site-home-mfe/src/content/outline.json`, `site-docs-mfe/src/content/outline.json`, `site-libs-mfe/src/content/outline.json`); the templates outline (`site-templates-mfe/src/content/outline.generated.json`), the docs version data (`site-docs-mfe/src/data/versions.generated.json`) and the libs data (`site-libs-mfe/src/data/libraries.generated.json`) are written by `npm run site:data` from their sources, and `npm run site:data -- --check` fails when they are out of date. Each content screen reads its data through an `@gears-frontx/api` service whose mock plugin answers from the bundled file (the site has no backend).

A site's production build may leave screens out and hide outline entries (`unpublishedScreens` and `hiddenEntries` in the site config, passed as the build variables `VITE_SITE_HIDDEN_SCREENS` and `VITE_SITE_HIDDEN_ENTRIES`). Each screen reads its outline pruned by them (`content/publish.ts`, `content/sitePublishing.ts`): a link to a hidden screen goes with the card, link or section that holds it, a node of the architecture map keeps its title without a link, and the libraries page leaves out its "Open UI Kit" link when the catalogue is hidden. Without the variables every screen and entry is shown.

The repository's metadata tooling renders the same outlines as Markdown twins of the pages (`/docs/get-started.md`, `/templates/template-shell.md`, ...), which the pages link and `llms.txt` lists; the build writes them as files and the development server renders them per request.

## SEO metadata

Declared once per package, in the `seo` block of the screen extension in its `mfe.json` (`title`, `description`, and `seo.routes` for every internal route). Each package's manifest test holds the declaration to the route tree.

## Develop

Edit the files here, never the copies under `site/`. From the repository root:

```bash
npm run site:data                 # after changing a template manifest, the guide or the pins
npm run site:assemble             # copy into site/
npm install --prefix site         # once, after adding or renaming a package
npm run dev                       # http://localhost:5173/?screen=home
```

`npm run site:assemble -- --check` reports any difference between this template and the site copy.

## Moving into another project

Copy the four package directories, `src-app/mfe_packages/shared/site/` and `.frontx/ai/@gears-frontx/frontx-template-site/` into a project that has template-shell, template-site-brand, template-kit-candidates and template-site-blocks applied, then run `npm install` there. Pick other ports if 3050 to 3053 are taken (`package.json` scripts and `mfe.json` `remoteEntry`). The packages reference nothing outside the template's directories but the named packages of those templates; the generated data files are regenerated by the repository's `scripts/site-data.mjs`, which a project without it replaces by its own data.
