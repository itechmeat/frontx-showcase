import { createRootRoute, createRoute } from '@gears-frontx/routing-tanstack';
import { publishedOutline } from '@site-shared/content/sitePublishing';
import outlineJson from './content/outline.json';
import { LibsLayout } from './screens/libs/LibsLayout';
import { LibsPage } from './screens/libs/LibsPage';
import { NotFound } from './screens/libs/NotFound';

/** The libs pages, checked against the content model when the module loads. */
// @cpt-begin:cpt-template-site-flow-libraries-screen-read-page:p1:inst-build-routes
export const libsOutline = publishedOutline(outlineJson);
// @cpt-end:cpt-template-site-flow-libraries-screen-read-page:p1:inst-build-routes

// @cpt-begin:cpt-template-site-flow-libraries-screen-read-page:p1:inst-build-routes
// @cpt-begin:cpt-template-site-flow-libraries-screen-unknown-path:p2:inst-route-not-found
const rootRoute = createRootRoute({
  component: LibsLayout,
  notFoundComponent: NotFound,
});
// @cpt-end:cpt-template-site-flow-libraries-screen-unknown-path:p2:inst-route-not-found
// @cpt-end:cpt-template-site-flow-libraries-screen-read-page:p1:inst-build-routes

// @cpt-begin:cpt-template-site-flow-libraries-screen-read-page:p1:inst-build-routes
const pageRoutes = libsOutline.pages.map((page) =>
  createRoute({ getParentRoute: () => rootRoute, path: page.route, component: () => <LibsPage page={page} /> })
);
// @cpt-end:cpt-template-site-flow-libraries-screen-read-page:p1:inst-build-routes

/** The libs screen's routes: one per outline page; any other path renders the screen's not-found page. */
// @cpt-dod:cpt-template-site-dod-libraries-screen-registration:p1
export const libsRouteTree = rootRoute.addChildren(pageRoutes);
