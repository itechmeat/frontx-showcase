/**
 * The outlines as a site publishes them: a site that leaves screens out of its build (`unpublishedScreens` in its config) shows no link to them, and a site that hides outline entries (`hiddenEntries`) shows none of them. The plain-text twins render the outlines pruned this way, so a twin shows what its page shows.
 *
 * The rule is the one template-site's shared content folder applies before it renders a page (`shared/site/content/publish.ts`); the two copies stay code-identical, and `scripts/publish-prune.test.mjs` of the site repository holds them to the same results.
 */

// @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-prune-outline:p2:inst-publishing-types
/** The screens a site leaves out, by screen extension id, and the outline entries it hides, by entry id. */
export interface Publishing {
  readonly hiddenScreens: readonly string[];
  readonly hiddenEntries: readonly string[];
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);

/** The mark of a value the pruning removes. */
const GONE = Symbol('gone');
// @cpt-end:cpt-template-site-meta-algo-plain-text-twins-prune-outline:p2:inst-publishing-types

/**
 * One value of an outline with every link to a hidden screen taken out. A link target (`href`) that names a hidden screen takes out what holds it: a list item, a labelled link (`label` and `href`), or, on a node that is neither (a map node, the architecture map's screen nodes included, a source line), only the `href`, so the node stays as plain text. A list emptied that way goes as a whole. What goes from a list item takes the item with it; what goes from any other object is dropped from it, and that object stays.
 * @param value - the raw value
 * @param element - whether the value is an item of a list
 * @param screens - the hidden screen extension ids
 * @param key - the name the value sits under; a name under an architecture map reads `map.<name>`, so the items of `map.screens` are map nodes, not list items
 */
// @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-prune-outline:p2:inst-prune-value
function prune(value: unknown, element: boolean, screens: ReadonlySet<string>, key = ''): unknown {
  if (Array.isArray(value)) {
    const kept = value.map((item) => prune(item, key !== 'map.screens', screens)).filter((item) => item !== GONE);
    return value.length > 0 && kept.length === 0 ? GONE : kept;
  }
  if (!isObject(value)) return value;
  const out: Json = {};
  for (const [name, child] of Object.entries(value)) {
    if (name === 'href' && isObject(child) && typeof child.extension === 'string' && screens.has(child.extension)) {
      if (element || typeof value.label === 'string') return GONE;
      continue;
    }
    const next = prune(child, false, screens, key === 'map' ? `map.${name}` : name);
    if (next === GONE) {
      if (element) return GONE;
      continue;
    }
    out[name] = next;
  }
  return out;
}
// @cpt-end:cpt-template-site-meta-algo-plain-text-twins-prune-outline:p2:inst-prune-value

// @cpt-algo:cpt-template-site-meta-algo-plain-text-twins-prune-outline:p2
/**
 * The outline a published page shows: each page keeps its place; its entries lose the hidden ones (by id) and every link to a hidden screen, with what holds it; a page's back link to a hidden screen is dropped. The result is raw outline JSON, as the twins read it.
 * @param value - the parsed outline JSON
 * @param publishing - the site's publishing choices
 */
export function pruneOutline(value: unknown, publishing: Publishing): unknown {
  // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-prune-outline:p2:inst-if-nothing-hidden
  if (!isObject(value) || !Array.isArray(value.pages) || (publishing.hiddenScreens.length === 0 && publishing.hiddenEntries.length === 0)) return value;
  // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-prune-outline:p2:inst-if-nothing-hidden
  // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-prune-outline:p2:inst-foreach-page
  const screens = new Set(publishing.hiddenScreens);
  const entries = new Set(publishing.hiddenEntries);
  const pages = value.pages.map((page: unknown) => {
    if (!isObject(page)) return page;
    const { back, entries: list, ...rest } = page;
    const kept = Array.isArray(list) ? list.filter((entry) => !(isObject(entry) && typeof entry.id === 'string' && entries.has(entry.id))).map((entry) => prune(entry, true, screens)).filter((entry) => entry !== GONE) : list;
    const shownBack = back === undefined ? undefined : prune(back, false, screens);
    return { ...rest, ...(shownBack === undefined || shownBack === GONE ? {} : { back: shownBack }), entries: kept };
  });
  // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-prune-outline:p2:inst-foreach-page
  // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-prune-outline:p2:inst-return-pruned
  return { ...value, pages };
  // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-prune-outline:p2:inst-return-pruned
}
