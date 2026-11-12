# template-site contract

What the site's own screens guarantee and how to change them without breaking the site.

## The screens

- `site-home-mfe` (port 3050): token `home`, menu label "Home", order 10.
- `site-templates-mfe` (port 3051): token `templates`, menu label "Templates", order 20.
- `site-docs-mfe` (port 3052): token `docs`, menu label "Docs", order 40.
- `site-libs-mfe` (port 3053): token `libs`, menu label "Libraries", order 35: the FrontX packages and the technical summaries of routing, microfrontends and the screen domain.
- Every page has exactly one `<h1>`, headed sections, and links announced as links: other screens through the screen domain (see below), paths inside the screen through routing-tanstack `Link`.

## Metadata

- Page metadata lives only in the `seo` block of each screen extension in `mfe.json`: `title`, `description` (50 to 160 characters), and `seo.routes` for every internal route other than `/`.
- A new page of the home, docs, libs or templates screen is a new outline page; its route and its `seo.routes` entry follow, and the manifest test reads the pages from the route tree and fails until the two agree.

## Content

- Home, templates, docs and libs pages are outlines of entries (`shared/site/content/outline.ts`). Each entry type is named after the block of `@gears-frontx/site-blocks` it renders (`path-cards`, `step`, `file-explorer`, `hero`) or the kit part it renders directly (`paragraph`, `checklist`, `details`), and carries content only: never `layout`, `variant`, `tone`, `compact`, `ruled`, `numbered` or `prose`; an arrangement that differs is another entry type, which needs its block first. Texts are `t:<key>` references to the screen's `i18n/en.json`; each package's outline test fails on a key the strings file lacks and on a `{name}` placeholder its data cannot fill, and the parser refuses an unknown entry type or a drawing option. The home page's live kit samples come from `site-home-mfe/src/samples/kitSamples.tsx` by the sample key a tile names; brand art is chosen only in `shared/site/content/brandArt.tsx`.
- `site-templates-mfe/src/content/outline.generated.json`, `site-docs-mfe/src/data/versions.generated.json` and `site-libs-mfe/src/data/libraries.generated.json` are generated: never edit them; change `src/content/guide.json`, a template manifest or the pins, then run `npm run site:data`.
- The libs summaries are written only from the packages' READMEs, type declarations and design documents and from template-shell's sources at the pinned commits; a statement that no such file supports does not belong on a page. The screen domain page shows the Libraries screen's extension from `mfe.json`, and its test holds the two equal.
- Commands on the get-started and first-change pages are run in a clean directory with the same CLI release before they are published.
- A template page's key files carry their content, read from the template's source at the commit the site pins; `npm run site:data` bounds their size and fails above the limit.

## Links to other screens

- A screen never writes, builds or renders the host's address: no `serializeGrammar`, no `href` to another screen, no read of `generated-mfe-manifests.json` or of any list of registered screens, and no knowledge of another screen's routes. The address is the host router's byproduct of actions.
- What a site publishes reaches a screen as build variables only: `VITE_SITE_HIDDEN_SCREENS` (screen extension ids the production build leaves out) and `VITE_SITE_HIDDEN_ENTRIES` (outline entry ids it hides), each a JSON array, read once in `shared/site/content/sitePublishing.ts`. A screen reads its outline through `publishedOutline`, which prunes every link to a hidden screen with what holds it before the model checks it, and gates any link it writes in code with `isPublished` (`shared/site/content/publish.ts`). Without the variables nothing is hidden, as in development and the tests. template-site-meta keeps a code-identical copy of the pruning rule for the twins; change both together.
- In content, name another screen by its screen extension id (`{ "extension": "<id>" }`) and a page of it by the show action that screen declares (`{ "extension": "<id>", "action": { "type": "<action id>", "payload": { "<property>": "<page>" } } }`). In code, take the ids from `shared/site/navigation/siteScreens.ts`, which the manifest tests hold to the manifests.
- `SiteLink` renders a link to another screen as an element with the link role, in the tab order and with no address; a primary click or Enter calls `openScreen()` (`shared/site/navigation/openScreen.ts`): the screen domain's `mount_ext` action on the screen's bridge, and for a page a `next` step with the target's show action. One history entry; Back returns to the previous screen.
- A screen whose pages other screens open declares one show action: docs `show_guide` (`{ guide }`), templates `show_template` (`{ template }`). Its entry lists the action in `actions`, its `mfe.json` carries the closed schema in `schemas` (target: its own extension; payload: an enum of its pages, held by the manifest test to the route tree), and its lifecycle's `mount()` calls `registerShowPageHandler(bridge, <action>, new ShowPageHandler(mfeApp, <property>, <page to path>))` after the base mount and before returning. The handler moves the screen's own router through `app.mfeRouter.navigation().replace(path)`. Home and libs declare no action.

## Data

- Each screen reads its data through its `@gears-frontx/api` service (`src/api/`); the service's mock plugin answers from the bundled data, and `init.ts` switches mocks on by default because the site has no backend.

## Styling

- The screens are compositions and carry no CSS: no stylesheet import, no `style` prop, no class name other than a kit part's documented recipe (such as `buttonVariants`). They render blocks from `@gears-frontx/site-blocks/<Block>`, kit candidates from `@gears-frontx/kit-candidates` and `@gears-frontx/ui-kit` components; a missing arrangement is a new block in template-site-blocks, a missing primitive a kit candidate. A link styled as a button uses the kit's button recipe on the link itself, so it keeps the link role. The `site-styling` guideline holds the rules for the whole site.
- Theme and language come from the shell's shared properties through `ScreenFrame`; a package never writes `data-theme` or `dir` on `<html>`.

## Build

- `vite.config.ts` keeps template-mfe's form: `shared: {}` and the site's one shared set in `sharedDeps`, externalized. `@gears-frontx/routing` and `@gears-frontx/routing-tanstack` are in it next to `@gears-frontx/react`: `<ExtensionRouter>` comes from `@gears-frontx/react`, and a bundled second copy of the router would leave the route tree without its router context. `mfe.json` declares no shared dependencies.
- The shared folder is reached through the `@site-shared` alias (`vite.config.ts`, `vitest.config.ts`, `tsconfig.json`), with the kit, `lucide-react` and the routing packages deduplicated. Code of other templates is reached only through their named packages (`@gears-frontx/site-blocks`, `@gears-frontx/kit-candidates`, `@gears-frontx/site-brand`), each a `dependencies` entry at the exact version its template delivers; never a path, alias or tsconfig `paths` entry into another template.
