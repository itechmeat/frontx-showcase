# template-site-meta contract

What the site-meta package does, how a project configures it, and what never to edit by hand.

## What it does

- Package `@gears-frontx/site-meta`, directory `src-app/verify_packages/site-meta/`: a Node tool, TypeScript run by Node's type stripping, no build step. It contributes no screen.
- `generate` runs after the project's build and writes into `dist/`: the head block of `index.html` (site-level tags, the page map as an inert JSON script and the bundled head-sync script, between `<!-- site-meta:start -->` and `<!-- site-meta:end -->`), `sitemap.xml`, `robots.txt`, `llms.txt`, `seo-manifest.json`, `site.webmanifest` and a Markdown twin of every outline page (`<token>/<route>.md`).
- `check` holds the metadata rules (a `seo` block on every screen extension, a title, a 50 to 160 character description, no two pages with one title or one canonical URL, a share image with its alternative text, `llmsSections` entries of a one-line heading and one-line items, head-sync bundled with the project's routing version, the raster record) and, when `dist/` holds generated outputs and the configuration has no error, that they equal what the sources generate now (a configuration error stands alone and the outputs are not compared).
- head-sync runs in the browser before the app boots and keeps the head equal to the page the address shows; it writes the head only, never the URL.
- `src/dev.ts` renders a twin for the dev server from the current sources, for a project whose `vite.config.ts` serves `.md` requests through it, with the content type to send (`TWIN_CONTENT_TYPE`, `text/plain; charset=utf-8`, which a browser shows in the tab). A static host serves the generated twins with the same type; `text/markdown` or `application/octet-stream` makes a click on a twin link a download.

## Configuration

- Page metadata lives once, in the `seo` block of each screen extension in the packages' `mfe.json` (`title`, `description`, `indexable`, `ogImage`, `routes` for the static and pattern routes inside a screen). A screen never writes `document.title` or head tags.
- Site-level values live in a site config, `site.config.json` in the project unless `--config` names another file: `origin` (required for `generate`, or `SITE_ORIGIN` for a local preview), `siteName`, `shortName`, `titleTemplate`, `defaultDescription`, `locale`, `homeScreen`, `ogImage` with `ogImageAlt`, `twitterCard`, `themeColor`, `backgroundColor`, and the optional `llmsSections`: `[{ "heading": "...", "items": ["..."] }]`, sections written at the end of `llms.txt` after the packages, each as `## <heading>` and one `- <item>` line per item (one line each, no item list empty); absent or empty leaves `llms.txt` unchanged. Two optional lists decide what the site publishes: `unpublishedScreens`, route tokens of screens left out of every output (no page in the map, the sitemap, `llms.txt` or `seo-manifest.json`, no twin; a token no screen declares and the home screen are refused), and `hiddenEntries`, ids of outline entries the twins leave out. The twins prune every link to a left-out screen with what holds it, by the rule template-site's screens apply (`src/publish.ts`, a code-identical copy); the dev twin renders every screen.
- `SITE_INDEXING` (environment, `on` by default) set to `off` makes a build no search engine may index: every page `noindex` in the static head and in the page map, `robots.txt` `User-agent: *` and `Disallow: /` with no sitemap line, `sitemap.xml` with no address, no `llms.txt` (and one an earlier generation left is removed). Any other value fails `generate`. `seo-manifest.json` records the indexing, and `check` compares the outputs in that mode and names an `llms.txt` in a build that may not be indexed.
- `--rasters <file>` names a record that pins hand-rendered PNGs to their SVG sources (paths relative to the record's folder); without it no raster is checked.
- The head and the web manifest link the icon set under `public/brand/` (`favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`); `generate` fails when the build lacks one.
- The command line is `node src-app/verify_packages/site-meta/src/cli.ts generate|check [--project <dir>] [--config <file>] [--rasters <file>]`; paths resolve against the working directory and the project defaults to the one the package sits in.

## Never by hand

- Never edit the generated files in `dist/`, the block between the `site-meta` markers in `dist/index.html`, or a twin: change the `seo` block, the outline, its strings or the site config, then run `generate` again. `check` names every output that drifted.
- Never edit the copy of this package in a composed project; edit the template.

## Dependencies

- `@gears-frontx/routing` at the project's version: head-sync bundles it and reads the realm's navigation history through it, so a second version would not share the history. `check` fails when the tool's own copy differs from the project's.
- The package references nothing outside its own directory; it reads the project only through the paths it is given.
