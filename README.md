# FrontX site

The official FrontX site, the templates it is built from, its demos and the demos' templates. Working name `frontx-site`; the proposed repository name is `frontx-showcase`.

The site is itself a FrontX application: template-shell, template-mfe and template-design-guardrails from gears-frontx-templates are applied to `site/` by the FrontX CLI, and every page is a screen of an MFE package that lives in one of this repository's templates. The shell is rebuilt on React and `@gears-frontx/ui-kit` to the site's look (a header with the navigation and the Demos entry, a footer, no Tailwind); `npm run shell:changes` lists every shell file the site changed, the candidate for template-shell.

## Layout

| Path | What it is |
|---|---|
| `site/` | The FrontX application. Shell files are applied by the FrontX CLI; the rebuilt layout, themes and assets are the site's own (`scripts/shell-changes.mjs` lists them), every other file stays as the shell ships it, apart from the long-dash adaptation every applied text file carries; `site/.frontx/provenance.json` records where they came from. |
| `template-site/` | The site's own sections: home, templates (an index and a page per template), docs (get started, first change) and libs (the libraries, routing, MFEs, the screen domain), written as entries over the blocks of template-site-blocks. |
| `template-catalogue/` | The ui-kit catalogue screen. |
| `template-inbox/` | The inbox demo, 4 screens: "Inbox: contacts", "Inbox: dashboard", "Inbox: chat" and "Inbox: mail". |
| `template-mfe-demo/` | The MFE mechanics demo, 4 screens ("MFE mechanics: isolation", "data loading", "shared state", "nested widgets") and 2 widget packages. |
| `template-calendar-demo/` | The "Calendar: coming soon" screen, a placeholder until a calendar kit is released. |
| `template-site-meta/` | The page metadata pipeline as one tooling package (`src-app/verify_packages/site-meta/`): the generator of the head, the discovery files, the web manifest and the plain-text twins, its check, and the head-sync runtime. |
| `template-site-brand/` | The site's brand as one package (`src-app/verify_packages/site-brand/`): the brand values over the kit's tokens from one source (`brand.json`), the typeface, the brand assets, the generated theme variables and the brand check (`brand:check`), delivered to the document through the shell's document-entry convention. |
| `template-kit-candidates/` | The primitives the kit lacks, as one package (`src-app/verify_packages/kit-candidates/`) in the kit's own layout and APIs, proposed to `@gears-frontx/ui-kit` and deleted when the kit releases them. |
| `template-site-blocks/` | The site's blocks as one package (`src-app/verify_packages/site-blocks/`): section-level compositions of kit components, kit candidates, brand art and the layout tokens, with layout-only styles and content-only props, plus a showcase screen (`/?screen=blocks`, kept out of the search index) that renders each block's fixture on its own route. |
| `scripts/` | Repository guards, the composition step (`site:assemble`), the generated site data (`site:data`), the shell change list (`shell:changes`) and the Node server of the built site (`npm start`). |
| `deploy/` | The deploy stack of the container image built by `Dockerfile`: the image's server config, its smoke check, the compose file with the edge proxy and the signed deploy webhook (section "Deploy"). |
| `assets/` | The SVG source of the share image and `rasters.json`, the record that pins `site/public/og-image.png` to it (`seo:check` reads it). |
| `architecture/` | PRD and DESIGN of this repository. |

Screen code is committed only inside its template. `site/src-app/mfe_packages/` is produced by `npm run site:assemble` and is ignored by git, as template-shell's own `.gitignore` declares; so are the site copies of `site-meta`, `site-brand`, `kit-candidates` and `site-blocks` under `site/src-app/verify_packages/`, through the root `.gitignore`.

## Requirements

Node `>=24.14.0` (`.nvmrc` pins `25.1.0`) and npm `>=10`; lockfiles are written with npm 10.9.4 (the `packageManager` pin; install it with `npm install -g npm@10.9.4`). The npm registry is the public one (`.npmrc`), and every FrontX package is installed from it at an exact released version; a user-level npm config that routes `@gears-frontx` elsewhere must not apply, for example:

```bash
export NPM_CONFIG_USERCONFIG="$HOME/.config/frontx-site/npmrc"   # contains: registry=https://registry.npmjs.org/
```

## Quick start

```bash
npm ci           # repository tooling, including the FrontX CLI
npm run setup    # compose the templates into site/, then install the site
npm run dev      # host at http://localhost:5173/, which opens the home screen
```

Screens are addressed in the query string: `/?screen=<token>[;route=<path inside the screen>]`, for example `/?screen=docs;route=get-started`.

## Commands

| Command | Does |
|---|---|
| `npm run site:assemble` | Copy the templates' subtrees into `site/`; `-- --check` reports drift, `-- --watch` re-copies on edits |
| `npm run site:data` | Generate the templates screen's pages, the docs screen's version data and the libs screen's library data from their sources; `-- --check` reports drift |
| `npm run shell:changes` | List the site's changes to the files of the applied official templates; `-- --check` compares them and the long-dash adaptation with the pristine templates; `-- --adapt` writes the adaptation after a template upgrade |
| `npm run dev` | Build the MFE packages, serve them and start the host, which also serves the pages' plain-text twins |
| `npm run dev:smoke` | Run `npm run dev` until the host and every remote entry answer, then stop it |
| `npm run build` | Assemble, build the site, lay the MFE remotes out in `site/dist/mfe/` (`npm run site:dist`; the result works from any static server, at the root or under a sub-path), generate the SEO outputs, the web manifest and the plain-text twins, then check that no unpublished screen is left (`npm run site:publish-check`); builds for `origin` in `site.config.json` (https://frontx.cfabric.org), or for `SITE_ORIGIN` (`SITE_ORIGIN=http://localhost:4173 npm run build` for a local preview); `SITE_INDEXING=off` builds a copy no page of which may be indexed |
| `npm run site:publish-check` | After the build: fail when `site/dist` still carries a screen `unpublishedScreens` leaves out, a remote, a registration, an address or a link of it |
| `npm run seo:check` | Page metadata rules, and that the generated outputs in `site/dist/` match the sources |
| `npm run type-check`, `npm run lint`, `npm run test:unit`, `npm run arch:deps` | Checks over the tooling and the site |
| `npm run templates:validate` | `frontx validate` and the uniform-shape rules for every template |
| `npm run catalogue:generate`, `npm run catalogue:check` | Generate the UI Kit catalogue's demo files from the kit demo at the locked gears-frontx commit; `catalogue:check` regenerates them in memory and reports a hand edit or a stale pin |
| `npm run policy:pins`, `npm run policy:own-styles`, `npm run policy:text` | Exact pins in every MFE package, at the released versions the site's application installs; CSS Modules only in template code, no CSS in compositions, block and shell chrome stylesheets layout on tokens apart from the rows of their exemptions ledgers, and no colour literal outside the brand; no long dash, design-tool vendor name, internal company domain or former product name in repository files (`policy:own-styles` and `policy:text` also run in `lint`) |
| `npm run verify:ui` | After `npm run build`: the design-defect checker of template-design-guardrails over every manifest page, block showcase route and the not-found screen at 1440 and 390 pixels against `npm run dev`; only a finding `scripts/design-verify-baseline.json` does not carry fails (`-- --no-baseline` for a full report) |
| `npm run verify:ui:baseline` | `-- check`: every finding the baseline carries names its reason; `-- build <findings.json>`: rebuild the baseline from a run without it, refusing a finding no rule knows |
| `npm run preview` | Serve `site/dist` at `http://localhost:4173`, the host and every MFE remote |
| `npm start` | Install the site when it has no finished install from its current lockfile (`npm run setup`), build it when `site/dist` is not fresh: missing, built for another origin, or older than an input, a template, `site.config.json`, the root manifest, lockfile, scripts or assets, or a file of `site/`, added, changed or deleted (`npm run build`); then serve `site/dist` from Node on `$PORT` (8080 by default) and `$SERVE_HOST` (`0.0.0.0` by default; not `HOST`, which shells set to the hostname) with the headers, cache policy and content types of the image's server, uncompressed (`scripts/start.mjs`, `scripts/serve-dist.mjs`); `npm start -- --no-build` or `START_SKIP_BUILD=1` serves only |

See `CONTRIBUTING.md` for the development loop and `architecture/DESIGN.md` for the design.

## What the build publishes

`site.config.json` decides which screens the production build publishes. `unpublishedScreens` lists, by route token, the screens it leaves out: they have no remote in `site/dist/mfe/`, no registration in `generated-mfe-manifests.json`, no menu entry, no page in `sitemap.xml`, `llms.txt`, `seo-manifest.json` or the page map of `index.html`, and no plain-text twin, and no published page keeps a link to them (the home page drops its UI kit section, the libraries page its "Open UI Kit" link, the docs and templates pages their links to the catalogue and the demos). `hiddenEntries` lists outline entries the published pages do not show; this site hides the home page's "Teams using FrontX" logo strip (`home-teams`). Remove a token from the list, or the whole key, to publish the screen again; without the keys everything is published. `npm run dev`, the unit tests and `npm run verify:ui` always see every screen: only `npm run build` leaves screens out. `architecture/DESIGN.md` section 4.15 has the details.

## GitHub Pages and pull request previews

GitHub Pages serves the site at https://frontx.cfabric.org, and every pull request gets a preview at `https://constructorfabric.github.io/frontx-showcase-previews/pr-<number>/` that no search engine may index.

| Workflow | Runs on | Does |
|---|---|---|
| `pages.yml`, "Deploy site to GitHub Pages" | push to `main`, manual run | builds `site/dist` with `SITE_ORIGIN=https://frontx.cfabric.org` and `SITE_INDEXING=on`, checks it is indexable on that origin (`node scripts/indexing-check.mjs indexed <origin>`) and deploys it to the `github-pages` environment; one deployment at a time, never cancelled halfway |
| `preview-build.yml`, "Preview build" | pull request to `main` | builds the pull request for its preview address with `SITE_INDEXING=off`, read-only and without secrets, checks that no page may be indexed (`node scripts/indexing-check.mjs unindexed`) and uploads the artifact `site-preview` for 7 days with `preview-meta.json` (number and head commit) |
| `preview-publish.yml`, "Preview publish" | a successful "Preview build" of a pull request | without checking out or executing anything of the pull request, writes the artifact into the preview repository as `pr-<number>/` with the GitHub App's token and keeps one comment on the pull request with the address, the commit and the retention |
| `preview-remove.yml`, "Preview remove" | pull request closed | removes `pr-<number>/` from the preview repository, taking only the pull request's number from the event |

The preview repository `constructorfabric/frontx-showcase-previews` serves its `main` through Pages. Its starter files are in `.preview-repository/`: `.nojekyll` (required: Jekyll drops the build's files whose names start with `_`), a placeholder `index.html` with `noindex, nofollow`, a README, and `.github/workflows/cleanup-previews.yml`, which removes every day the previews older than `PREVIEW_RETENTION_DAYS`. They are copied there by hand once, before the first preview.

Who sets what:

| Setting | Where | Who |
|---|---|---|
| Pages source "GitHub Actions", the custom domain `frontx.cfabric.org`, "Enforce HTTPS" once the certificate is issued | this repository, Settings, Pages | a repository admin |
| The GitHub App: installed on `frontx-showcase` and `frontx-showcase-previews` with Contents read and write on the preview repository, Issues or Pull requests read and write on this repository (the comment), and Metadata read | the organization's settings | an organization admin |
| `AUTOMATION_APP_ID` (variable) and `AUTOMATION_APP_PRIVATE_KEY` (secret) of that app | this repository's Actions settings, or the organization's with access for this repository | an organization admin |
| `PREVIEW_REPOSITORY` (`owner/name`, `constructorfabric/frontx-showcase-previews` when unset; it must belong to the same owner, and another name also needs the address in `preview-build.yml`) and `PREVIEW_RETENTION_DAYS` (7 when unset) | Actions variables of this repository; `PREVIEW_RETENTION_DAYS` also in the preview repository, for its cleanup | a repository admin |

Until `AUTOMATION_APP_ID` is set, "Preview publish" and "Preview remove" end green with the summary line `Preview publishing is not configured: AUTOMATION_APP_ID is not set` and do nothing else; "Preview build" still builds and checks every pull request.

Switching the production site to the workflow:

1. The pull request that brings these workflows is green and reviewed.
2. Right before merging it, a repository admin switches the Pages source from the branch to "GitHub Actions" (Settings, Pages, Build and deployment, Source; or `gh api -X PUT repos/constructorfabric/frontx-showcase/pages -f build_type=workflow`). The custom domain stays in the settings.
3. Merge at once: the push to `main` runs "Deploy site to GitHub Pages", and the site is on the domain a few minutes later. What Pages serves between the switch and the first deployment of the workflow is not verified, so keep that gap short.
4. Check `https://frontx.cfabric.org/`, a few deep links (`/?screen=docs;route=get-started`), `robots.txt` and `sitemap.xml`, then enable "Enforce HTTPS" when the certificate is ready.

Rollback:

- A broken deployment: in Actions, re-run the last green run of "Deploy site to GitHub Pages", or run the workflow by hand on an earlier commit; Pages serves that build again.
- Back to serving the branch: switch the Pages source back to "Deploy from a branch", `main`, `/` (`gh api -X PUT repos/constructorfabric/frontx-showcase/pages -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/'`); the domain stays, and the `CNAME` file at the root of `main` holds it for the branch build. Then revert the pull request.
- Previews never touch the production site; a broken preview is replaced by the next push or removed with its `pr-<number>/` folder.

## Deploy

The site ships as one container image: `Dockerfile` builds `site/dist` on Node 24 with npm 10.9.4, and the image serves it with Caddy (`deploy/site/Caddyfile`) as a non-root user on port 8080, with a health check, compression, the security headers, the cache policy (hashed `assets/` files immutable, every other file revalidated) and the plain-text twins as `text/plain; charset=utf-8`. `SITE_ORIGIN` is a required build argument, baked into the sitemap, `robots.txt`, the canonical addresses and `llms.txt`, so an image serves one origin; the same image serves the site at the root or under a sub-path, since the proxy in front strips the prefix.

```bash
docker build --build-arg SITE_ORIGIN=http://localhost:8080 -t frontx-site:local .
docker run --rm -p 8080:8080 --read-only --tmpfs /data:uid=10001,gid=10001 --tmpfs /config:uid=10001,gid=10001 --cap-drop ALL --security-opt no-new-privileges frontx-site:local
```

A Node host such as DigitalOcean App Platform runs the same build without the image: it builds with `npm ci && npm run setup && npm run build` with `SITE_ORIGIN` set and runs `npm start`, which serves `site/dist` on `$PORT` with the image's headers, cache policy and content types (`scripts/serve-dist.mjs`, Node's standard library only). Set `SITE_ORIGIN` for the run too, or start with `START_SKIP_BUILD=1`: `npm start` checks the build against the origin it is given and rebuilds for another one. `npm start` does not compress: the host's CDN or proxy in front does, as the image's Caddy does for the image. The image stays the main deploy path.

### Run on a Node host (Vapp, DigitalOcean)

A host that installs the dependencies and runs only `npm start`, with no build phase (Virtuozzo Application Platform), gets the build from `npm start` itself: it runs `npm run setup` when the site has no finished install from its current lockfile, `npm run build` when `site/dist` is not fresh, then serves. Set `SITE_ORIGIN` to the site's address; without it (and without `origin` in `site.config.json`) `npm start` warns and builds with `http://localhost:$PORT` in the canonical links and the sitemap, and setting it later rebuilds. The first start installs and builds, about 12 to 13 minutes at 0.4 of a core and 1 GB (three clean runs with `NODE_ENV=production`); a later start with nothing changed serves in seconds. A finished `npm run build` counts too: it writes `site/.dist-stamp` with the origin by the same rule as `npm start` (`SITE_ORIGIN`, else `site.config.json`'s, else `http://localhost:$PORT`) and the input files, dated at the build's start, so a file changed during the build still counts as newer; a build that stops midway leaves no stamp. A failed `npm run setup` runs again on the next start, and `npm start` passes SIGINT, SIGTERM and SIGHUP on to the whole process tree of the setup or the build it runs (on Windows, a console Ctrl+C), with SIGKILL after 10 seconds; Ctrl+Z suspends only `npm start`, not the build, and a fatal signal `npm start` does not pass on, SIGKILL among them, leaves the tree running until its container stops.

Temporary: remove once FrontX templates share the UI kit across MFEs and the build fits the default heap. Until then a start-triggered build gets a heap of 75% of the memory limit (`--max-old-space-size`, printed at the start; the limit is the smaller of `process.constrainedMemory()` and the host's total memory) since Node's default heap runs out of memory at 1 GB; a heap in `NODE_OPTIONS` (`--max-old-space-size` or `--max_old_space_size`) wins. It builds the MFEs one at a time (`FRONTX_BUILD_CONCURRENCY=1`) unless the environment sets `FRONTX_BUILD_CONCURRENCY`, as a heap cap, its own or the host's, is per process. Measured at 0.4 of a core: 1 GB builds, 768 MB does not.

`npm run setup` installs the site with `npm ci --include=dev`, so the site's build tools (its devDependencies) install even when the host sets `NODE_ENV=production`.

The MFE packages build several at once, half the cores up to 6; `FRONTX_BUILD_CONCURRENCY=<n>` sets the number, and `1` builds them one after another, for a host with little memory. A value above the default trades memory for speed: each build is a full Vite run.

`deploy/` holds the stack for a host: `docker-compose.yml` runs the image behind an edge Caddy (`deploy/Caddyfile`) and, later, the deploy webhook (`deploy/webhook/`), which takes GitHub's signed `workflow_run` delivery of a successful push run of the image workflow for a version tag and pulls and restarts the site. Without a domain the stack runs locally: `docker compose -f deploy/docker-compose.yml up -d --build` serves `http://localhost:8080/` and the sub-path `http://localhost:8080/frontx/` (with `SITE_ORIGIN=http://localhost:8080/frontx` the canonical addresses match the sub-path). `.github/workflows/docker.yml` builds the image on every pull request to `main`, every push to `main` and every version tag, and checks it with `deploy/smoke.sh <image> <origin>`, which also runs locally. Only a version tag publishes the image.

A release is a tag `vX.Y.Z` on a commit of `main`, pushed with git (`git tag v0.1.0 <commit> && git push origin v0.1.0`) or created as a GitHub release; either needs write access to the repository. Push release tags one at a time: GitHub creates no push event when more than three tags are pushed at once, so such a push publishes nothing. A tag run fails on a tag that is not a plain `vX.Y.Z` or points at a commit outside `main`, whether or not `SITE_ORIGIN` is set. `deploy/release-tags.sh` checks the tag and lists the image tags; the `publish` job pushes the image as `X.Y.Z` and the commit sha, as `X.Y` when the tag is the highest patch of its line and as `latest` when it is the highest release, counting only the `vX.Y.Z` tags on `main`; a patch to an older line or a re-run of an older release moves neither back. Publishes run one at a time; a tag pushed while another waits replaces the waiting run, which then needs a re-run from the Actions tab. The compose file pulls `latest`, so a deploy follows the newest release; a deploy pinned to a release names `X.Y.Z` instead.

What is commented out or gated, and the information that enables each part:

| Part | Enabled by |
|---|---|
| Publishing the image to GHCR from a version tag, the `publish` job of `.github/workflows/docker.yml` | The production origin as the repository variable `SITE_ORIGIN` (`https://<domain>`, with the sub-path if any); the job runs once it is set |
| The published image in `deploy/docker-compose.yml` (`site` service) | The image published as above, `ghcr.io/<owner>/<repository>` of the repository the workflow runs in |
| Public ports 80 and 443 (`edge` service) | The host: a server that runs the stack, with a DNS record of the domain pointing at it |
| The domain block with automatic TLS in `deploy/Caddyfile`, and the certificate notice address | The domain name and the operator's address; a sub-path variant (with `robots.txt` at the origin's root) is there too |
| The `webhook` service and its `/deploy-hook` route | The host, the domain, the published image, `DEPLOY_WEBHOOK_SECRET` in `deploy/.env` (`deploy/.env.example`) and the GitHub webhook registration: payload URL `https://<domain>/deploy-hook`, content type `application/json`, the same secret, the "Workflow runs" event only |
| The webhook's registry credentials | A private GHCR package: a Docker config with a token that can read packages, mounted read-only into the webhook, since its own Docker CLI pulls and a host login does not reach it |

## License

Apache-2.0, see `LICENSE` and `NOTICE`.
