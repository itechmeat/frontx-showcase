import { createRootRoute, createRoute } from '@gears-frontx/routing-tanstack';
import { publishedOutline } from '@site-shared/content/sitePublishing';
import outlineJson from './content/outline.json';
import { DocsLayout } from './screens/docs/DocsLayout';
import { DocsPage } from './screens/docs/DocsPage';
import { NotFound } from './screens/docs/NotFound';

/** The docs pages, checked against the content model when the module loads. */
// @cpt-begin:cpt-template-site-flow-docs-screen-read-page:p1:inst-build-routes
export const docsOutline = publishedOutline(outlineJson);
// @cpt-end:cpt-template-site-flow-docs-screen-read-page:p1:inst-build-routes

// @cpt-begin:cpt-template-site-flow-docs-screen-read-page:p1:inst-build-routes
// @cpt-begin:cpt-template-site-flow-docs-screen-unknown-path:p2:inst-route-not-found
const rootRoute = createRootRoute({
  component: DocsLayout,
  notFoundComponent: NotFound,
});
// @cpt-end:cpt-template-site-flow-docs-screen-unknown-path:p2:inst-route-not-found
// @cpt-end:cpt-template-site-flow-docs-screen-read-page:p1:inst-build-routes

// @cpt-begin:cpt-template-site-flow-docs-screen-read-page:p1:inst-build-routes
const pageRoutes = docsOutline.pages.map((page) =>
  createRoute({ getParentRoute: () => rootRoute, path: page.route, component: () => <DocsPage page={page} /> })
);
// @cpt-end:cpt-template-site-flow-docs-screen-read-page:p1:inst-build-routes

/** The docs screen's routes: one per outline page; any other path renders the screen's not-found page. */
// @cpt-dod:cpt-template-site-dod-docs-screen-registration:p1
export const docsRouteTree = rootRoute.addChildren(pageRoutes);
