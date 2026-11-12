import { createRootRoute, createRoute, Outlet } from '@gears-frontx/routing-tanstack';
import { publishedOutline } from '@site-shared/content/sitePublishing';
import outlineJson from './content/outline.generated.json';
import { NotFound } from './screens/templates/NotFound';
import { TemplatesPage } from './screens/templates/TemplatesPage';

/** The templates pages' routes, read from the generated outline: the index and one route per template. The routes are static by design: the set of templates is fixed when the site is generated, and the screen's API service answers with the outline the routes were built from. */
// @cpt-begin:cpt-template-site-flow-templates-screen-open-page:p1:inst-build-routes
export const templatesOutline = publishedOutline(outlineJson);
// @cpt-end:cpt-template-site-flow-templates-screen-open-page:p1:inst-build-routes

// @cpt-begin:cpt-template-site-flow-templates-screen-unknown-path:p2:inst-route-not-found
const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFound,
});
// @cpt-end:cpt-template-site-flow-templates-screen-unknown-path:p2:inst-route-not-found

// @cpt-begin:cpt-template-site-flow-templates-screen-open-page:p1:inst-build-routes
const pageRoutes = templatesOutline.pages.map((page) =>
  createRoute({ getParentRoute: () => rootRoute, path: page.route, component: () => <TemplatesPage route={page.route} /> })
);
// @cpt-end:cpt-template-site-flow-templates-screen-open-page:p1:inst-build-routes

/** The templates screen's routes; any other path renders the screen's not-found page. */
// @cpt-dod:cpt-template-site-dod-templates-screen-registration:p1
export const templatesRouteTree = rootRoute.addChildren(pageRoutes);
