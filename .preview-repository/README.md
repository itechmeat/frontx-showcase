# frontx-showcase-previews

Temporary previews of pull requests to [constructorfabric/frontx-showcase](https://github.com/constructorfabric/frontx-showcase), the FrontX site at https://frontx.cfabric.org/. GitHub Pages serves this repository from `main` at https://constructorfabric.github.io/frontx-showcase-previews/.

- Each pull request's build sits in `pr-<number>/` and is served at `https://constructorfabric.github.io/frontx-showcase-previews/pr-<number>/`. frontx-showcase's "Preview publish" workflow writes it after every successful "Preview build" of the pull request and comments the address on the pull request; its "Preview remove" workflow deletes it when the pull request closes.
- `.github/workflows/cleanup-previews.yml` removes, every day and on demand, each `pr-<number>/` whose last commit is older than `PREVIEW_RETENTION_DAYS` (a repository variable, 7 days when unset).
- Previews are not indexed. Every page of a preview carries `noindex` in its head, in the static document and in the page map that keeps the head in step with the address, its `robots.txt` disallows every path and its sitemap lists no address. A `robots.txt` in this repository would not help: crawlers read it only at the root of the host, `constructorfabric.github.io/robots.txt`. The placeholder `index.html` at the root carries `noindex, nofollow` too.
- `.nojekyll` must stay at the root: without it Pages runs Jekyll, which drops every file whose name starts with `_`, and the site's build has such files among its scripts.
- Write access: the GitHub App frontx-showcase's workflows use (`AUTOMATION_APP_ID`) needs Contents read and write here. Nothing in this repository is edited by hand; a preview is rebuilt from its pull request.

The starter files of this repository are kept in frontx-showcase under `.preview-repository/`.
