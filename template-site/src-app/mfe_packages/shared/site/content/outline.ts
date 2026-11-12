/**
 * The page outline: the content model the site's screens render and the site's metadata tooling turns into plain-text twins.
 *
 * An outline is JSON: a list of pages, each an ordered list of typed entries. Each entry type is named after the block of `@gears-frontx/site-blocks` it renders (`path-cards`, `step`, `hero`), or after the kit part it renders directly (`paragraph`, `checklist`, `details`); an entry carries content only, never a layout or a variant, so a different arrangement is a different entry type. A text is either a key of the screen's English strings (`t:<key>`) or a literal, and both may carry `{name}` placeholders filled from the screen's data (versions, source-specs). The screen renders an outline with blocks and kit components; the site-meta package of template-site-meta renders the same outline, strings and data as Markdown. One source, two renderings, so the plain-text page cannot drift from the page.
 */

// @cpt-begin:cpt-template-site-algo-content-model-parse-outline:p1:inst-check-types
/** A text: `t:<key>` reads the screen's strings, anything else is a literal. */
export type Text = string;

/** An action a screen link sends to the screen it opens: an action type the receiving screen's entry declares, and its payload, one string per property the action's schema names. */
export interface ScreenAction {
  type: string;
  payload: Record<string, string>;
}

/** Another screen, named by its screen extension's id, and the typed action that shows a page of it; without an action the screen opens at its root. */
export interface ScreenTarget {
  extension: string;
  action?: ScreenAction;
}

/** A link target: another screen (`extension`, with an optional typed `action`), a path inside the current screen (`route`), a heading of the current page (`anchor`), or an external address (`url`, whose `{name}` placeholders are filled from the screen's data). */
export type Href = ScreenTarget | { route: string } | { anchor: string } | { url: string };

export interface Code {
  title: Text;
  lines: string[];
}

/** A labelled link. */
export interface Link {
  label: Text;
  href: Href;
}

/** A link drawn as a button; `primary` is the filled one. */
export interface Action extends Link {
  primary?: boolean;
}

/** A link card of a card arrangement. The card's picture comes from the screen, by the card's target. */
export interface CardItem {
  eyebrow?: Text;
  title: Text;
  text?: Text;
  href: Href;
  /** Marks the card of the path the reader is on. */
  current?: boolean;
}

/** A link in a panel; `button` renders as an outlined button, `link` as an inline link. */
export interface PanelLink {
  label: Text;
  href: Href;
  kind?: 'button' | 'link';
}

export interface Panel {
  /** A short label above the title, such as a package path. */
  label?: Text;
  title: Text;
  text: Text;
  links: PanelLink[];
}

/** A note under a step: a sentence, or a titled box of sentences. */
export type StepNote = Text | { title: Text; items: Text[] };

/** A file a step points at: its path in the project, what it is for, and the file at the pinned commit. */
export interface StepFile {
  path: string;
  /** The name the list shows, when the file's own name is not enough to find it, such as `i18n/en.json`; the file name otherwise. */
  name?: string;
  text: Text;
  href?: Href;
}

/** A drawing of what the reader should see: a caption, the menu entry that is chosen and the screen's title and text. */
export interface StepResult {
  caption: Text;
  menu: Text;
  title: Text;
  text: Text;
}

/**
 * One key file of a template: its path, what it is for, and its content as the template ships it, in Base64. The content is encoded because the MFE handler rewrites imports with regular expressions over a chunk's text, string literals included: source text that reads like an import inside a bundled data file would be rewritten or rejected when the screen loads. `url` is the file at the template's pinned commit, for a template that has a remote.
 */
export interface KeyFile {
  path: string;
  text: Text;
  lines: number;
  contentBase64: string;
  url?: string;
}

// @cpt-end:cpt-template-site-algo-content-model-parse-outline:p1:inst-check-types

// @cpt-algo:cpt-template-site-algo-content-model-key-files:p2
// @cpt-dod:cpt-template-site-dod-content-model-key-files:p2
/** The text of a key file. @param file - the key file */
export function keyFileContent(file: KeyFile): string {
  // @cpt-begin:cpt-template-site-algo-content-model-key-files:p1:inst-decode-content
  const bytes = Uint8Array.from(atob(file.contentBase64), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
  // @cpt-end:cpt-template-site-algo-content-model-key-files:p1:inst-decode-content
}

// @cpt-begin:cpt-template-site-algo-content-model-parse-outline:p1:inst-check-types
/** The key files of a template with an optional live example of it, shown as two tabs. */
export interface Explorer {
  id: string;
  title: Text;
  /** The commit the files are read at: a label, a value and, where the template has a remote, the tree at that commit. */
  source?: { label: Text; value: Text; href?: Href };
  files: KeyFile[];
  /** The line under the file list: what the list is, and a link to the whole source. */
  scope?: { text: Text; link?: Link };
  /** What the viewer's footer says about every file, such as that it is shown unmodified. */
  note?: Text;
  /** The license and notice links in the viewer's footer. */
  legal?: Link[];
  /** Absent when none of its screens is published; `open` is absent when the screen it opens is not. */
  example?: { title: Text; text: Text; screens: { title: Text; href: Href }[]; open?: { label: Text; href: Href } };
}

/** A numbered step of a guide; the renderer numbers the steps in page order. */
export interface Step {
  id: string;
  title: Text;
  lead?: Text;
  code?: Code;
  files?: StepFile[];
  result?: StepResult;
  expected?: Text;
  note?: StepNote;
  links?: Link[];
}

/** A figure of the brand's hairline figure family: which drawing a feature or a start step shows. */
export type Figure = 'hub' | 'riffle' | 'turntable' | 'rebuild' | 'loupe' | 'rest';

const FIGURES: readonly Figure[] = ['hub', 'riffle', 'turntable', 'rebuild', 'loupe', 'rest'];

/** A node of the architecture map that links somewhere: its title, an optional small note and its target. */
export interface MapNode {
  title: Text;
  note?: Text;
  /** Absent when the node's screen is not published: the node stays as plain text. */
  href?: Href;
}

/** One bar of a metric's chart: its label and its illustrative share (0 to 100); `featured` marks the FrontX bar. No figures are shown. */
export interface MetricBar {
  label: Text;
  share: number;
  featured?: boolean;
}

/** One metric of a comparison: its title and unit (empty for none), the headline in words (no figure) and what it is about, the bars (empty for no chart) and the explanation under them. */
export interface Metric {
  title: Text;
  unit: Text;
  statement: Text;
  benefit: Text;
  bars: MetricBar[];
  text: Text;
}

/** A company of a logo strip: its name, the logo file the screen supplies by its file name, the logo's size in pixels and the company's site. */
export interface Logo {
  name: Text;
  logo: string;
  width: number;
  height: number;
  href: Href;
}

export type Entry =
  | { type: 'section-heading'; id: string; title: Text; lead?: Text; label?: Text }
  | { type: 'guide-closing-heading'; id: string; title: Text; lead?: Text }
  | ({ type: 'step' } & Step)
  | { type: 'step-unnumbered'; id: string; title: Text; lead: Text; links?: Link[] }
  | { type: 'path-cards'; items: CardItem[] }
  | { type: 'start-paths'; items: CardItem[] }
  | { type: 'template-pair'; items: [CardItem, CardItem] }
  | { type: 'template-row'; items: CardItem[] }
  | { type: 'card-tiles'; items: CardItem[] }
  | { type: 'panels'; items: Panel[] }
  | { type: 'cta-box'; title: Text; text: Text; action: Link }
  | { type: 'cta-rule'; title: Text; text: Text; action: Link }
  | { type: 'facts'; title: Text; items: { label: Text; value: Text }[]; actions?: Link[] }
  | ({ type: 'file-explorer' } & Explorer)
  | { type: 'agent-task'; id: string; summary: Text; lead?: Text; code: Code; twin?: Text }
  | { type: 'troubleshooting'; id: string; title: Text; items: { summary: Text; text: Text }[] }
  | { type: 'package-list' }
  | { type: 'paragraph'; text: Text }
  | { type: 'fineprint'; text: Text }
  | { type: 'status'; text: Text }
  | { type: 'links'; lead: Text; items: Link[] }
  | { type: 'actions'; items: Action[] }
  | { type: 'code'; code: Code }
  | { type: 'checklist'; items: Text[] }
  | { type: 'list'; id: string; title: Text; items: CardItem[] }
  | { type: 'callout'; title?: Text; text: Text; link?: Link }
  | { type: 'details'; summary: Text; items: Text[] }
  | { type: 'hero'; actions: Action[]; art: Text }
  | { type: 'features'; id: string; title: Text; items: { figure: Figure; title: Text; text: Text; link: Link }[] }
  | {
      type: 'architecture-map';
      id: string;
      label: Text;
      title: Text;
      lead: Text;
      map: {
        /** The drawing's accessible description. */
        label: Text;
        kit: MapNode;
        rules: MapNode;
        shell: MapNode & { templates: Link };
        screens: (MapNode & { hint: Text })[];
        /** The labels on the wires from the kit and from the rules. */
        wires: { kit: Text; rules: Text };
      };
    }
  | {
      type: 'change-story';
      id: string;
      title: Text;
      lead: Text;
      link: Link;
      /** The prompt, with the part that is emphasised. */
      task: { before: Text; emphasis: Text; after: Text };
      diff: { path: Text; removed: Text; added: Text };
      result: { label: Text; nav: Text; title: Text; text: Text };
    }
  | {
      type: 'kit-showcase';
      id: string;
      label: Text;
      title: Text;
      lead: Text;
      link: Link;
      /** `sample` is a key of the screen's sample registry, a live kit sample. */
      groups: { title: Text; tiles: { title: Text; sample: string; href: Href }[] }[];
    }
  | { type: 'metric-comparison'; id: string; title: Text; lead: Text; note: Text; metrics: Metric[] }
  | { type: 'logo-strip'; id: string; title: Text; logos: Logo[] }
  | { type: 'get-started-steps'; id: string; title: Text; lead: Text; link: Link; steps: { figure: Figure; title: Text; text: Text; href: Href }[] }
  | { type: 'closing-cta'; id: string; title: Text; actions: Action[] };

export type EntryType = Entry['type'];

export interface Page {
  route: string;
  title: Text;
  lead: Text;
  /** Short facts shown under the lead, such as the toolchain versions. */
  meta?: Text[];
  back?: { label: Text; href: Href };
  /** The title of the page's side panel, when it is not the screen's "On this page". */
  rail?: Text;
  entries: Entry[];
}

export interface Outline {
  screen: string;
  strings: string;
  data?: string;
  pages: Page[];
}

export class OutlineError extends Error {}
// @cpt-end:cpt-template-site-algo-content-model-parse-outline:p1:inst-check-types

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);

// @cpt-begin:cpt-template-site-algo-content-model-parse-outline:p1:inst-check-types
function str(value: unknown, at: string): string {
  if (typeof value !== 'string') throw new OutlineError(`${at}: expected a string`);
  return value;
}

function optStr(value: unknown, at: string): string | undefined {
  return value === undefined ? undefined : str(value, at);
}

function num(value: unknown, at: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new OutlineError(`${at}: expected a number`);
  return value;
}

function list<T>(value: unknown, at: string, item: (entry: unknown, at: string) => T): T[] {
  if (!Array.isArray(value)) throw new OutlineError(`${at}: expected a list`);
  return value.map((entry, index) => item(entry, `${at}[${index}]`));
}

function optList<T>(value: unknown, at: string, item: (entry: unknown, at: string) => T): T[] | undefined {
  return value === undefined ? undefined : list(value, at, item);
}

function obj(value: unknown, at: string): Json {
  if (!isObject(value)) throw new OutlineError(`${at}: expected an object`);
  return value;
}

function optBool(value: unknown, at: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new OutlineError(`${at}: expected true or false`);
  return value;
}
// @cpt-end:cpt-template-site-algo-content-model-parse-outline:p1:inst-check-types

// @cpt-begin:cpt-template-site-algo-content-model-parse-outline:p1:inst-read-link-target
function href(value: unknown, at: string): Href {
  const target = obj(value, at);
  if ('screen' in target) throw new OutlineError(`${at}: a link names another screen by its extension id, never by its address token`);
  if ('extension' in target && 'route' in target) throw new OutlineError(`${at}: a link to another screen names a page by its show action, never by a route`);
  const kinds = ['url', 'anchor', 'extension', 'route'].filter((kind) => kind in target);
  if (kinds.length > 1) throw new OutlineError(`${at}: a link has one target, not ${kinds.join(' and ')}`);
  if (typeof target.url === 'string') return { url: target.url };
  if (typeof target.anchor === 'string') return { anchor: target.anchor };
  if (typeof target.extension === 'string') return target.action === undefined ? { extension: target.extension } : { extension: target.extension, action: screenAction(target.action, `${at}.action`) };
  if (typeof target.route === 'string') return { route: target.route };
  throw new OutlineError(`${at}: a link needs url, anchor, extension or route`);
}

function screenAction(value: unknown, at: string): ScreenAction {
  const action = obj(value, at);
  const payload = obj(action.payload, `${at}.payload`);
  return { type: str(action.type, `${at}.type`), payload: Object.fromEntries(Object.entries(payload).map(([name, item]) => [name, str(item, `${at}.payload.${name}`)])) };
}

function link(value: unknown, at: string): Link {
  const target = obj(value, at);
  return { label: str(target.label, `${at}.label`), href: href(target.href, `${at}.href`) };
}

function action(value: unknown, at: string): Action {
  return { ...link(value, at), primary: optBool(obj(value, at).primary, `${at}.primary`) };
}
// @cpt-end:cpt-template-site-algo-content-model-parse-outline:p1:inst-read-link-target

// @cpt-begin:cpt-template-site-algo-content-model-parse-outline:p1:inst-read-entry
function cardItem(entry: unknown, at: string): CardItem {
  const card = obj(entry, at);
  return { eyebrow: optStr(card.eyebrow, `${at}.eyebrow`), title: str(card.title, `${at}.title`), text: optStr(card.text, `${at}.text`), href: href(card.href, `${at}.href`), current: optBool(card.current, `${at}.current`) };
}

function stepNote(value: unknown, at: string): StepNote | undefined {
  if (value === undefined || typeof value === 'string') return value;
  const note = obj(value, at);
  return { title: str(note.title, `${at}.title`), items: list(note.items, `${at}.items`, str) };
}

function code(value: unknown, at: string): Code {
  const block = obj(value, at);
  return { title: str(block.title, `${at}.title`), lines: list(block.lines, `${at}.lines`, str) };
}

// @cpt-end:cpt-template-site-algo-content-model-parse-outline:p1:inst-read-entry

// @cpt-begin:cpt-template-site-algo-content-model-parse-outline:p1:inst-check-kinds
/** The drawing options entries no longer carry: an arrangement that differs is its own entry type. */
const RETIRED_FIELDS = ['layout', 'variant', 'tone', 'compact', 'ruled', 'numbered', 'prose'] as const;

function noDrawingOptions(raw: Json, at: string): void {
  const field = RETIRED_FIELDS.find((name) => name in raw);
  if (field) throw new OutlineError(`${at}.${field}: a drawing option; an arrangement that differs is its own entry type`);
}

function figure(value: unknown, at: string): Figure {
  const found = FIGURES.find((entry) => entry === value);
  if (!found) throw new OutlineError(`${at}: expected one of ${FIGURES.join(', ')}`);
  return found;
}

function panelLink(value: unknown, at: string): PanelLink {
  const target = obj(value, at);
  if (target.kind !== undefined && target.kind !== 'button' && target.kind !== 'link') throw new OutlineError(`${at}.kind: expected button or link`);
  return { label: str(target.label, `${at}.label`), href: href(target.href, `${at}.href`), kind: target.kind };
}
// @cpt-end:cpt-template-site-algo-content-model-parse-outline:p1:inst-check-kinds

// @cpt-begin:cpt-template-site-algo-content-model-parse-outline:p1:inst-read-entry
function mapNode(value: unknown, at: string): MapNode {
  const node = obj(value, at);
  return { title: str(node.title, `${at}.title`), note: optStr(node.note, `${at}.note`), href: node.href === undefined ? undefined : href(node.href, `${at}.href`) };
}

function explorer(raw: Json, at: string): Explorer {
  const source = raw.source === undefined ? undefined : obj(raw.source, `${at}.source`);
  const example = raw.example === undefined ? undefined : obj(raw.example, `${at}.example`);
  const scope = raw.scope === undefined ? undefined : obj(raw.scope, `${at}.scope`);
  return {
    id: str(raw.id, `${at}.id`),
    title: str(raw.title, `${at}.title`),
    source: source && { label: str(source.label, `${at}.source.label`), value: str(source.value, `${at}.source.value`), href: source.href === undefined ? undefined : href(source.href, `${at}.source.href`) },
    scope: scope && { text: str(scope.text, `${at}.scope.text`), link: scope.link === undefined ? undefined : link(scope.link, `${at}.scope.link`) },
    note: optStr(raw.note, `${at}.note`),
    legal: optList(raw.legal, `${at}.legal`, link),
    files: list(raw.files, `${at}.files`, (entry, itemAt) => {
      const file = obj(entry, itemAt);
      return { path: str(file.path, `${itemAt}.path`), text: str(file.text, `${itemAt}.text`), lines: num(file.lines, `${itemAt}.lines`), contentBase64: str(file.contentBase64, `${itemAt}.contentBase64`), url: optStr(file.url, `${itemAt}.url`) };
    }),
    example:
      example && example.screens !== undefined
        ? {
            title: str(example.title, `${at}.example.title`),
            text: str(example.text, `${at}.example.text`),
            screens: list(example.screens, `${at}.example.screens`, (entry, itemAt) => {
              const screen = obj(entry, itemAt);
              return { title: str(screen.title, `${itemAt}.title`), href: href(screen.href, `${itemAt}.href`) };
            }),
            open: example.open === undefined ? undefined : link(example.open, `${at}.example.open`),
          }
        : undefined,
  };
}

function step(raw: Json, at: string): Step {
  const result = raw.result === undefined ? undefined : obj(raw.result, `${at}.result`);
  return {
    id: str(raw.id, `${at}.id`),
    title: str(raw.title, `${at}.title`),
    lead: optStr(raw.lead, `${at}.lead`),
    code: raw.code === undefined ? undefined : code(raw.code, `${at}.code`),
    files: optList(raw.files, `${at}.files`, (entry, itemAt) => {
      const file = obj(entry, itemAt);
      return { path: str(file.path, `${itemAt}.path`), name: optStr(file.name, `${itemAt}.name`), text: str(file.text, `${itemAt}.text`), href: file.href === undefined ? undefined : href(file.href, `${itemAt}.href`) };
    }),
    result: result && { caption: str(result.caption, `${at}.result.caption`), menu: str(result.menu, `${at}.result.menu`), title: str(result.title, `${at}.result.title`), text: str(result.text, `${at}.result.text`) },
    expected: optStr(raw.expected, `${at}.expected`),
    note: stepNote(raw.note, `${at}.note`),
    links: optList(raw.links, `${at}.links`, link),
  };
}

// @cpt-end:cpt-template-site-algo-content-model-parse-outline:p1:inst-read-entry

// @cpt-begin:cpt-template-site-algo-content-model-parse-outline:p1:inst-read-entry
function entry(value: unknown, at: string): Entry {
  const raw = obj(value, at);
  // @cpt-begin:cpt-template-site-algo-content-model-parse-outline:p1:inst-check-kinds
  noDrawingOptions(raw, at);
  // @cpt-end:cpt-template-site-algo-content-model-parse-outline:p1:inst-check-kinds
  const id = () => str(raw.id, `${at}.id`);
  const title = () => str(raw.title, `${at}.title`);
  const cards = () => list(raw.items, `${at}.items`, cardItem);
  switch (raw.type) {
    case 'section-heading':
      return { type: 'section-heading', id: id(), title: title(), lead: optStr(raw.lead, `${at}.lead`), label: optStr(raw.label, `${at}.label`) };
    case 'guide-closing-heading':
      return { type: 'guide-closing-heading', id: id(), title: title(), lead: optStr(raw.lead, `${at}.lead`) };
    case 'step':
      return { type: 'step', ...step(raw, at) };
    case 'step-unnumbered':
      return { type: 'step-unnumbered', id: id(), title: title(), lead: str(raw.lead, `${at}.lead`), links: optList(raw.links, `${at}.links`, link) };
    case 'path-cards':
      return { type: 'path-cards', items: cards() };
    case 'start-paths':
      return { type: 'start-paths', items: cards() };
    case 'template-pair': {
      const items = cards();
      const [first, second] = items;
      if (items.length !== 2 || !first || !second) throw new OutlineError(`${at}.items: expected two cards`);
      return { type: 'template-pair', items: [first, second] };
    }
    case 'template-row':
      return { type: 'template-row', items: cards() };
    case 'card-tiles':
      return { type: 'card-tiles', items: cards() };
    case 'panels':
      return {
        type: 'panels',
        items: list(raw.items, `${at}.items`, (item, itemAt) => {
          const panel = obj(item, itemAt);
          return { label: optStr(panel.label, `${itemAt}.label`), title: str(panel.title, `${itemAt}.title`), text: str(panel.text, `${itemAt}.text`), links: list(panel.links, `${itemAt}.links`, panelLink) };
        }),
      };
    case 'cta-box':
    case 'cta-rule':
      return { type: raw.type, title: title(), text: str(raw.text, `${at}.text`), action: link(raw.action, `${at}.action`) };
    case 'facts':
      return {
        type: 'facts',
        title: title(),
        items: list(raw.items, `${at}.items`, (item, itemAt) => {
          const fact = obj(item, itemAt);
          return { label: str(fact.label, `${itemAt}.label`), value: str(fact.value, `${itemAt}.value`) };
        }),
        actions: optList(raw.actions, `${at}.actions`, link),
      };
    case 'file-explorer':
      return { type: 'file-explorer', ...explorer(raw, at) };
    case 'agent-task':
      return { type: 'agent-task', id: id(), summary: str(raw.summary, `${at}.summary`), lead: optStr(raw.lead, `${at}.lead`), code: code(raw.code, `${at}.code`), twin: optStr(raw.twin, `${at}.twin`) };
    case 'troubleshooting':
      return {
        type: 'troubleshooting',
        id: id(),
        title: title(),
        items: list(raw.items, `${at}.items`, (item, itemAt) => {
          const question = obj(item, itemAt);
          return { summary: str(question.summary, `${itemAt}.summary`), text: str(question.text, `${itemAt}.text`) };
        }),
      };
    case 'package-list':
      return { type: 'package-list' };
    case 'paragraph':
    case 'fineprint':
    case 'status':
      return { type: raw.type, text: str(raw.text, `${at}.text`) };
    case 'links':
      return { type: 'links', lead: str(raw.lead, `${at}.lead`), items: list(raw.items, `${at}.items`, link) };
    case 'actions':
      return { type: 'actions', items: list(raw.items, `${at}.items`, action) };
    case 'code':
      return { type: 'code', code: code(raw.code, `${at}.code`) };
    case 'checklist':
      return { type: 'checklist', items: list(raw.items, `${at}.items`, str) };
    case 'list':
      return { type: 'list', id: id(), title: title(), items: cards() };
    case 'callout':
      return { type: 'callout', title: optStr(raw.title, `${at}.title`), text: str(raw.text, `${at}.text`), link: raw.link === undefined ? undefined : link(raw.link, `${at}.link`) };
    case 'details':
      return { type: 'details', summary: str(raw.summary, `${at}.summary`), items: list(raw.items, `${at}.items`, str) };
    case 'hero':
      return { type: 'hero', actions: list(raw.actions, `${at}.actions`, action), art: str(raw.art, `${at}.art`) };
    case 'features':
      return {
        type: 'features',
        id: id(),
        title: title(),
        items: list(raw.items, `${at}.items`, (item, itemAt) => {
          const feature = obj(item, itemAt);
          return { figure: figure(feature.figure, `${itemAt}.figure`), title: str(feature.title, `${itemAt}.title`), text: str(feature.text, `${itemAt}.text`), link: link(feature.link, `${itemAt}.link`) };
        }),
      };
    case 'architecture-map': {
      const map = obj(raw.map, `${at}.map`);
      const shell = obj(map.shell, `${at}.map.shell`);
      const wires = obj(map.wires, `${at}.map.wires`);
      return {
        type: 'architecture-map',
        id: id(),
        label: str(raw.label, `${at}.label`),
        title: title(),
        lead: str(raw.lead, `${at}.lead`),
        map: {
          label: str(map.label, `${at}.map.label`),
          kit: mapNode(map.kit, `${at}.map.kit`),
          rules: mapNode(map.rules, `${at}.map.rules`),
          shell: { ...mapNode(shell, `${at}.map.shell`), templates: link(shell.templates, `${at}.map.shell.templates`) },
          screens: list(map.screens, `${at}.map.screens`, (item, itemAt) => ({ ...mapNode(item, itemAt), hint: str(obj(item, itemAt).hint, `${itemAt}.hint`) })),
          wires: { kit: str(wires.kit, `${at}.map.wires.kit`), rules: str(wires.rules, `${at}.map.wires.rules`) },
        },
      };
    }
    case 'change-story': {
      const task = obj(raw.task, `${at}.task`);
      const diff = obj(raw.diff, `${at}.diff`);
      const result = obj(raw.result, `${at}.result`);
      return {
        type: 'change-story',
        id: id(),
        title: title(),
        lead: str(raw.lead, `${at}.lead`),
        link: link(raw.link, `${at}.link`),
        task: { before: str(task.before, `${at}.task.before`), emphasis: str(task.emphasis, `${at}.task.emphasis`), after: str(task.after, `${at}.task.after`) },
        diff: { path: str(diff.path, `${at}.diff.path`), removed: str(diff.removed, `${at}.diff.removed`), added: str(diff.added, `${at}.diff.added`) },
        result: { label: str(result.label, `${at}.result.label`), nav: str(result.nav, `${at}.result.nav`), title: str(result.title, `${at}.result.title`), text: str(result.text, `${at}.result.text`) },
      };
    }
    case 'kit-showcase':
      return {
        type: 'kit-showcase',
        id: id(),
        label: str(raw.label, `${at}.label`),
        title: title(),
        lead: str(raw.lead, `${at}.lead`),
        link: link(raw.link, `${at}.link`),
        groups: list(raw.groups, `${at}.groups`, (item, itemAt) => {
          const group = obj(item, itemAt);
          return {
            title: str(group.title, `${itemAt}.title`),
            tiles: list(group.tiles, `${itemAt}.tiles`, (tile, tileAt) => {
              const raw = obj(tile, tileAt);
              return { title: str(raw.title, `${tileAt}.title`), sample: str(raw.sample, `${tileAt}.sample`), href: href(raw.href, `${tileAt}.href`) };
            }),
          };
        }),
      };
    case 'metric-comparison':
      return {
        type: 'metric-comparison',
        id: id(),
        title: title(),
        lead: str(raw.lead, `${at}.lead`),
        note: str(raw.note, `${at}.note`),
        metrics: list(raw.metrics, `${at}.metrics`, (item, itemAt) => {
          const metric = obj(item, itemAt);
          return {
            title: str(metric.title, `${itemAt}.title`),
            unit: str(metric.unit, `${itemAt}.unit`),
            statement: str(metric.statement, `${itemAt}.statement`),
            benefit: str(metric.benefit, `${itemAt}.benefit`),
            bars: list(metric.bars, `${itemAt}.bars`, (bar, barAt) => {
              const raw = obj(bar, barAt);
              return { label: str(raw.label, `${barAt}.label`), share: num(raw.share, `${barAt}.share`), featured: optBool(raw.featured, `${barAt}.featured`) };
            }),
            text: str(metric.text, `${itemAt}.text`),
          };
        }),
      };
    case 'logo-strip':
      return {
        type: 'logo-strip',
        id: id(),
        title: title(),
        logos: list(raw.logos, `${at}.logos`, (item, itemAt) => {
          const logo = obj(item, itemAt);
          return { name: str(logo.name, `${itemAt}.name`), logo: str(logo.logo, `${itemAt}.logo`), width: num(logo.width, `${itemAt}.width`), height: num(logo.height, `${itemAt}.height`), href: href(logo.href, `${itemAt}.href`) };
        }),
      };
    case 'get-started-steps':
      return {
        type: 'get-started-steps',
        id: id(),
        title: title(),
        lead: str(raw.lead, `${at}.lead`),
        link: link(raw.link, `${at}.link`),
        steps: list(raw.steps, `${at}.steps`, (item, itemAt) => {
          const raw = obj(item, itemAt);
          return { figure: figure(raw.figure, `${itemAt}.figure`), title: str(raw.title, `${itemAt}.title`), text: str(raw.text, `${itemAt}.text`), href: href(raw.href, `${itemAt}.href`) };
        }),
      };
    case 'closing-cta':
      return { type: 'closing-cta', id: id(), title: title(), actions: list(raw.actions, `${at}.actions`, action) };
    // @cpt-begin:cpt-template-site-algo-content-model-parse-outline:p1:inst-unknown-type
    default:
      throw new OutlineError(`${at}: unknown entry type ${String(raw.type)}`);
    // @cpt-end:cpt-template-site-algo-content-model-parse-outline:p1:inst-unknown-type
  }
}
// @cpt-end:cpt-template-site-algo-content-model-parse-outline:p1:inst-read-entry

// @cpt-algo:cpt-template-site-algo-content-model-parse-outline:p1
// @cpt-dod:cpt-template-site-dod-content-model-checked-outlines:p1
/**
 * Checks a parsed JSON outline against the model, so a typo in a content file fails the screen's tests instead of rendering an empty entry.
 * @param value - the parsed JSON
 */
export function parseOutline(value: unknown): Outline {
  // @cpt-begin:cpt-template-site-algo-content-model-parse-outline:p1:inst-read-header
  const raw = obj(value, 'outline');
  // @cpt-end:cpt-template-site-algo-content-model-parse-outline:p1:inst-read-header
  // @cpt-begin:cpt-template-site-algo-content-model-parse-outline:p1:inst-return-outline
  return {
    // @cpt-begin:cpt-template-site-algo-content-model-parse-outline:p1:inst-read-header
    screen: str(raw.screen, 'outline.screen'),
    strings: str(raw.strings, 'outline.strings'),
    data: optStr(raw.data, 'outline.data'),
    // @cpt-end:cpt-template-site-algo-content-model-parse-outline:p1:inst-read-header
    // @cpt-begin:cpt-template-site-algo-content-model-parse-outline:p1:inst-read-pages
    pages: list(raw.pages, 'outline.pages', (item, at) => {
      const page = obj(item, at);
      return {
        route: str(page.route, `${at}.route`),
        title: str(page.title, `${at}.title`),
        lead: str(page.lead, `${at}.lead`),
        meta: optList(page.meta, `${at}.meta`, str),
        back: page.back === undefined ? undefined : link(page.back, `${at}.back`),
        rail: optStr(page.rail, `${at}.rail`),
        entries: list(page.entries, `${at}.entries`, entry),
      };
    }),
    // @cpt-end:cpt-template-site-algo-content-model-parse-outline:p1:inst-read-pages
  };
  // @cpt-end:cpt-template-site-algo-content-model-parse-outline:p1:inst-return-outline
}

// @cpt-algo:cpt-template-site-algo-content-model-resolve-text:p1
/**
 * Resolves a text: a `t:` key through the screen's strings, then every `{name}` placeholder from the variables. An unknown key comes back as the key itself, which the screen's tests catch.
 * @param value - the text
 * @param translate - the screen's string lookup
 * @param vars - the screen's data variables
 */
export function resolveText(value: Text, translate: (key: string) => string, vars: Readonly<Record<string, string>> = {}): string {
  // @cpt-begin:cpt-template-site-algo-content-model-resolve-text:p1:inst-lookup-key
  const base = value.startsWith('t:') ? translate(value.slice(2)) : value;
  // @cpt-end:cpt-template-site-algo-content-model-resolve-text:p1:inst-lookup-key
  // @cpt-begin:cpt-template-site-algo-content-model-resolve-text:p1:inst-return-text
  // @cpt-begin:cpt-template-site-algo-content-model-resolve-text:p1:inst-fill-placeholders
  return base.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (match, name: string) => (Object.prototype.hasOwnProperty.call(vars, name) ? (vars[name] ?? match) : match));
  // @cpt-end:cpt-template-site-algo-content-model-resolve-text:p1:inst-fill-placeholders
  // @cpt-end:cpt-template-site-algo-content-model-resolve-text:p1:inst-return-text
}

// @cpt-algo:cpt-template-site-algo-content-model-outline-keys:p2
/** Every `t:` key an outline uses, for the test that holds the strings file to its outline. */
export function outlineKeys(outline: Outline): string[] {
  // @cpt-begin:cpt-template-site-algo-content-model-outline-keys:p1:inst-collect-keys
  const keys = new Set<string>();
  const visit = (value: unknown): void => {
    if (typeof value === 'string') {
      if (value.startsWith('t:')) keys.add(value.slice(2));
    } else if (Array.isArray(value)) value.forEach(visit);
    else if (isObject(value)) Object.values(value).forEach(visit);
  };
  visit(outline.pages);
  // @cpt-end:cpt-template-site-algo-content-model-outline-keys:p1:inst-collect-keys
  // @cpt-begin:cpt-template-site-algo-content-model-outline-keys:p1:inst-return-keys
  return [...keys].sort();
  // @cpt-end:cpt-template-site-algo-content-model-outline-keys:p1:inst-return-keys
}

// @cpt-algo:cpt-template-site-algo-content-model-page-anchors:p1
// @cpt-dod:cpt-template-site-dod-content-model-page-renderer:p1
/** The page of an outline at a route, if any. */
export function pageAt(outline: Outline, route: string): Page | undefined {
  // @cpt-begin:cpt-template-site-algo-content-model-page-anchors:p1:inst-page-at
  return outline.pages.find((page) => page.route === route);
  // @cpt-end:cpt-template-site-algo-content-model-page-anchors:p1:inst-page-at
}

/** The headings of a page's side panel, in order: the numbered steps of a guide, or every titled entry of a page without steps. */
export function pageAnchors(page: Page): { id: string; title: Text }[] {
  // @cpt-begin:cpt-template-site-algo-content-model-page-anchors:p1:inst-numbered-steps
  const steps = page.entries.flatMap((item) => (item.type === 'step' ? [{ id: item.id, title: item.title }] : []));
  if (steps.length > 0) return steps;
  // @cpt-end:cpt-template-site-algo-content-model-page-anchors:p1:inst-numbered-steps
  // @cpt-begin:cpt-template-site-algo-content-model-page-anchors:p1:inst-section-headings
  return page.entries.flatMap((item) => (item.type === 'section-heading' || item.type === 'guide-closing-heading' || item.type === 'file-explorer' || item.type === 'troubleshooting' || item.type === 'list' ? [{ id: item.id, title: item.title }] : []));
  // @cpt-end:cpt-template-site-algo-content-model-page-anchors:p1:inst-section-headings
}
