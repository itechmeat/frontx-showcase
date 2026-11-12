import type { ChildMfeBridge } from '@gears-frontx/react';
import { OutlinePage } from '@site-shared/content/OutlinePage';
import { publishedOutline } from '@site-shared/content/sitePublishing';
import { PageLoading } from '@site-shared/content/PageStates';
import { logoImage } from '../../content/logos';
import outlineJson from '../../content/outline.json';
import { kitSample } from '../../samples/kitSamples';
import { useScreenTranslations } from '../../shared/useScreenTranslations';

// Hoisted to module level: a new map per render would reload the translations on every render.
const languageModules = import.meta.glob('./i18n/*.json') as Record<string, () => Promise<{ default: Record<string, string> }>>;

// @cpt-begin:cpt-template-site-flow-home-screen-open-landing:p1:inst-read-outline
/** The home page's outline: one landing page whose entries are the home blocks, pruned by the build's publishing choices and checked when the module loads. */
const OUTLINE = publishedOutline(outlineJson);
const HOME = OUTLINE.pages[0];
// @cpt-end:cpt-template-site-flow-home-screen-open-landing:p1:inst-read-outline

export interface HomeScreenProps {
  bridge: ChildMfeBridge;
}

/**
 * The site's home page, the FrontX landing: the home outline rendered by the outline renderer, entry by entry, each a home block (hero, groundwork, architecture map, first change, UI kit, comparison, logo strip, steps, closing band), with the kit showcase's live samples from the screen's sample registry and the logo strip's images from the screen's logo files. Every link to another screen opens it through the screen domain, and a link to a page of it sends that screen's show action.
 */
// @cpt-flow:cpt-template-site-flow-home-screen-open-landing:p1
// @cpt-dod:cpt-template-site-dod-home-screen-landing-page:p1
export function HomeScreen({ bridge }: HomeScreenProps) {
  // @cpt-begin:cpt-template-site-flow-home-screen-open-landing:p1:inst-load-strings
  const { t, loading } = useScreenTranslations(languageModules, bridge);
  // @cpt-end:cpt-template-site-flow-home-screen-open-landing:p1:inst-load-strings

  // @cpt-begin:cpt-template-site-flow-home-screen-open-landing:p1:inst-if-loading
  // @cpt-begin:cpt-template-site-flow-home-screen-open-landing:p1:inst-return-loading
  if (loading || !HOME) return <PageLoading />;
  // @cpt-end:cpt-template-site-flow-home-screen-open-landing:p1:inst-return-loading
  // @cpt-end:cpt-template-site-flow-home-screen-open-landing:p1:inst-if-loading

  // @cpt-begin:cpt-template-site-flow-home-screen-open-landing:p1:inst-render-outline
  return <OutlinePage page={HOME} translate={t} bridge={bridge} samples={(sample) => kitSample(sample, t)} logos={logoImage} />;
  // @cpt-end:cpt-template-site-flow-home-screen-open-landing:p1:inst-render-outline
}
