/**
 * The templates data, answered by the service's mock plugin. The site is static and has no backend: the generated outline is the source, bundled with the package, and the plugin serves it at the service's address.
 */
import type { MockMap } from '@gears-frontx/react';
import { publishedOutline } from '@site-shared/content/sitePublishing';
import outline from '../content/outline.generated.json';
import type { GetCatalogueResponse } from './types';

// @cpt-flow:cpt-template-site-flow-data-services-answer-query:p1
export const templatesMockMap: MockMap = {
  // @cpt-begin:cpt-template-site-flow-data-services-answer-query:p1:inst-answer-from-bundle
  // The outline goes through the content model's parser, so the answer is a checked outline rather than whatever the file holds.
  'GET /api/site-templates/catalogue': (): GetCatalogueResponse => publishedOutline(outline),
  // @cpt-end:cpt-template-site-flow-data-services-answer-query:p1:inst-answer-from-bundle
};
