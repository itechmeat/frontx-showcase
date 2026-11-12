import { parseOutline, type Outline } from './outline';
import { pruneOutline, sitePublishing } from './publish';

// @cpt-begin:cpt-template-site-algo-content-model-site-publishing:p1:inst-build-choices
/** The publishing choices this build was made with; empty in development and in the tests. */
export const SITE_PUBLISHING = sitePublishing(import.meta.env);
// @cpt-end:cpt-template-site-algo-content-model-site-publishing:p1:inst-build-choices

/**
 * A screen's outline as its published pages show it: pruned by the build's publishing choices, then checked.
 * @param value - the parsed outline JSON
 */
export function publishedOutline(value: unknown): Outline {
  // @cpt-begin:cpt-template-site-algo-content-model-prune-outline:p1:inst-parse-pruned
  return parseOutline(pruneOutline(value, SITE_PUBLISHING));
  // @cpt-end:cpt-template-site-algo-content-model-prune-outline:p1:inst-parse-pruned
}
