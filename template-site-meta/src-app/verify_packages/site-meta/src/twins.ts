/**
 * Plain-text twins: the pages a screen declares as an outline (`src/content/outline.json` or `outline.generated.json` in its package), rendered as Markdown from the same outline, strings and data the screen renders. Each twin is published at `/<screen token>/<route>.md` (`/<token>/index.md` for the screen root), the path the page links, and listed in `llms.txt`.
 *
 * The outline model is the one template-site's shared content folder defines (`shared/site/content/outline.ts`); this module reads it as data and checks only what it renders.
 */
import fs from 'node:fs';
import path from 'node:path';
import { screenAddress, type ScreenPages, type SiteMetaMap } from './page-map.ts';
import { readJson } from './site.ts';

/** The outline files a package may carry, in the order they are looked for. */
// @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-read-outlines:p2:inst-outline-files
export const OUTLINE_FILES = ['src/content/outline.json', 'src/content/outline.generated.json'];
// @cpt-end:cpt-template-site-meta-algo-plain-text-twins-read-outlines:p2:inst-outline-files

type Json = Record<string, unknown>;

interface Library {
  package: string;
  version: string;
  description: string;
  sourceUrl: string;
}

interface ShellPackage {
  package: string;
  version: string;
  description: string;
}

/** One screen's outline with what it reads: the English strings and the data variables. */
export interface ScreenOutline {
  readonly screen: string;
  readonly pages: readonly Json[];
  readonly strings: Readonly<Record<string, string>>;
  readonly vars: Readonly<Record<string, string>>;
  readonly libraries: readonly Library[];
  readonly shellPackages: readonly ShellPackage[];
}

/** One twin: its path under `dist/`, its address path, and its content. */
export interface Twin {
  readonly file: string;
  readonly path: string;
  readonly screen: string;
  readonly route: string;
  readonly content: string;
  /** The title llms.txt lists the twin under, when it is not its page's title (an agent task's copy). */
  readonly title?: string;
}

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);
const asString = (value: unknown): string => (typeof value === 'string' ? value : '');
const asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

// @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-resolve-text:p2:inst-fence-language
const LANGUAGES: Readonly<Record<string, string>> = { ts: 'ts', tsx: 'tsx', js: 'js', mjs: 'js', json: 'json', md: 'md', css: 'css', html: 'html', yml: 'yaml', yaml: 'yaml' };

/** The fence language of a file, by its extension. */
function languageOf(path: string): string {
  const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  return Object.hasOwn(LANGUAGES, extension) ? (LANGUAGES[extension] ?? '') : '';
}
// @cpt-end:cpt-template-site-meta-algo-plain-text-twins-resolve-text:p2:inst-fence-language

/**
 * Where a page's twin is published.
 * @param screen - the screen's route token
 * @param route - the page's route inside the screen
 */
// @cpt-algo:cpt-template-site-meta-algo-plain-text-twins-paths:p2
// @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-paths:p2:inst-twin-path
export function twinPath(screen: string, route: string): string {
  return route === '/' ? `/${screen}/index.md` : `/${screen}${route}.md`;
}
// @cpt-end:cpt-template-site-meta-algo-plain-text-twins-paths:p2:inst-twin-path

/**
 * Where the plain-text copy of an agent task is published: next to its page's twin, named after the task entry's id.
 * @param screen - the screen's route token
 * @param route - the page's route inside the screen
 * @param id - the task entry's id
 */
// @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-paths:p2:inst-task-path
export function taskTwinPath(screen: string, route: string, id: string): string {
  return route === '/' ? `/${screen}/${id}.md` : `/${screen}${route}/${id}.md`;
}
// @cpt-end:cpt-template-site-meta-algo-plain-text-twins-paths:p2:inst-task-path

/**
 * The outlines of the composed packages: every package directory (the shell scanners' rules: no `shared`, no dot-directories) that carries an outline file.
 * @param packagesDir - `site/src-app/mfe_packages`
 */
// @cpt-algo:cpt-template-site-meta-algo-plain-text-twins-read-outlines:p2
export function readOutlines(packagesDir: string): ScreenOutline[] {
  // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-read-outlines:p2:inst-if-no-packages
  if (!fs.existsSync(packagesDir)) return [];
  // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-read-outlines:p2:inst-if-no-packages
  const outlines: ScreenOutline[] = [];
  // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-read-outlines:p2:inst-foreach-entry
  for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-read-outlines:p2:inst-skip-non-package
    if (!entry.isDirectory() || entry.name === 'shared' || entry.name.startsWith('.')) continue;
    // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-read-outlines:p2:inst-skip-non-package
    // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-read-outlines:p2:inst-find-outline
    const dir = path.join(packagesDir, entry.name);
    const file = OUTLINE_FILES.map((name) => path.join(dir, name)).find((candidate) => fs.existsSync(candidate));
    if (!file) continue;
    // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-read-outlines:p2:inst-find-outline
    // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-read-outlines:p2:inst-if-no-strings
    const outline = readJson<Json>(file);
    const stringsFile = asString(outline.strings);
    if (!stringsFile) throw new Error(`${path.relative(packagesDir, file)}: the outline names no strings file`);
    // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-read-outlines:p2:inst-if-no-strings
    // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-read-outlines:p2:inst-read-data
    const data = outline.data ? readJson<{ vars?: Record<string, string>; libraries?: Library[]; shellPackages?: ShellPackage[] }>(path.join(dir, asString(outline.data))) : {};
    // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-read-outlines:p2:inst-read-data
    // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-read-outlines:p2:inst-collect-outline
    outlines.push({
      screen: asString(outline.screen),
      pages: asList(outline.pages).filter(isObject),
      strings: readJson<Record<string, string>>(path.join(dir, stringsFile)),
      vars: data.vars ?? {},
      libraries: data.libraries ?? [],
      shellPackages: data.shellPackages ?? [],
    });
    // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-read-outlines:p2:inst-collect-outline
  }
  // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-read-outlines:p2:inst-foreach-entry
  // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-read-outlines:p2:inst-return-outlines
  return outlines;
  // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-read-outlines:p2:inst-return-outlines
}

/** Renders a page or a whole outline to Markdown, resolving texts and links the way the screen does. */
class TwinRenderer {
  private readonly outline: ScreenOutline;
  private readonly map: SiteMetaMap;

  constructor(outline: ScreenOutline, map: SiteMetaMap) {
    this.outline = outline;
    this.map = map;
  }

  // @cpt-algo:cpt-template-site-meta-algo-plain-text-twins-resolve-text:p2
  // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-resolve-text:p2:inst-resolve-text
  text(value: unknown, vars: Readonly<Record<string, string>> = { ...this.outline.vars, siteOrigin: this.map.origin }): string {
    const raw = asString(value);
    const base = raw.startsWith('t:') ? (this.outline.strings[raw.slice(2)] ?? raw.slice(2)) : raw;
    return base.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (match, name: string) => (Object.hasOwn(vars, name) ? (vars[name] ?? match) : match));
  }
  // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-resolve-text:p2:inst-resolve-text

  // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-resolve-text:p2:inst-one-line
  /** A text that must stay on one line (a heading, a link label, a bold title): its authored line breaks become spaces. */
  line(value: unknown): string {
    return this.text(value).replace(/[ \t]*\n[ \t]*/g, ' ');
  }
  // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-resolve-text:p2:inst-one-line

  // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-resolve-text:p2:inst-resolve-link
  href(value: unknown): string {
    const target = isObject(value) ? value : {};
    const url = asString(target.url);
    if (url) return this.text(url);
    const anchor = asString(target.anchor);
    if (anchor) return `#${anchor}`;
    if ('screen' in target) throw new Error(`the ${this.outline.screen} outline names a link's screen by its address token; a link names another screen by its extension id`);
    const extension = asString(target.extension);
    if (extension && 'route' in target) throw new Error(`the ${this.outline.screen} outline links the screen extension ${extension} with a route; a page of another screen is named by its show action`);
    if (!extension) return `${this.map.origin}${screenAddress(this.map.domainKey, this.map.routeParam, this.outline.screen, asString(target.route) || '/')}`;
    const [screen, pages] = Object.entries(this.map.screens).find(([, candidate]) => candidate.extension === extension) ?? [];
    if (!screen || !pages) throw new Error(`the ${this.outline.screen} outline links the screen extension ${extension}, which the site does not have`);
    const action = isObject(target.action) ? target.action : undefined;
    return `${this.map.origin}${screenAddress(this.map.domainKey, this.map.routeParam, screen, action ? this.shownPage(screen, pages, action) : '/')}`;
  }

  /**
   * The page a typed show action names: the one page of the target screen whose path ends with the action's payload value.
   * @param screen - the target screen's token
   * @param pages - the target screen's pages
   * @param action - the link's action, a type and a payload of one string
   */
  shownPage(screen: string, pages: ScreenPages, action: Record<string, unknown>): string {
    const values = Object.values(isObject(action.payload) ? action.payload : {});
    const value = values.length === 1 ? asString(values[0]) : '';
    const matches = Object.keys(pages.pages).filter((route) => route !== '/' && route.split('/').pop() === value);
    if (matches.length !== 1) throw new Error(`the ${this.outline.screen} outline links a page of ${screen} by ${asString(action.type)} with "${value}", which names ${matches.length === 0 ? 'no page' : 'more than one page'} of that screen`);
    return matches[0] as string;
  }
  // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-resolve-text:p2:inst-resolve-link

  // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-render-code
  code(value: unknown): string[] {
    const source = isObject(value) ? value : {};
    return [`**${this.line(source.title)}**`, '', '```', ...asList(source.lines).map((line) => this.text(line)), '```'];
  }
  // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-render-code

  /** The key files with their content as fenced code, then the example screens as links, then the pinned source. */
  // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-render-explorer
  explorer(entry: Json): string[] {
    const out = [`## ${this.line(entry.title)}`];
    for (const file of asList(entry.files).filter(isObject)) {
      const path = asString(file.path);
      const url = asString(file.url);
      const content = Buffer.from(asString(file.contentBase64), 'base64').toString('utf8').replace(/\n+$/, '');
      const fence = '`'.repeat(Math.max(3, ...[...content.matchAll(/`+/g)].map((run) => run[0].length + 1)));
      out.push('', `### ${path}`, '', `${this.text(file.text)}${typeof file.lines === 'number' ? ` (${file.lines} lines)` : ''}`, ...(url ? ['', `File at the pinned commit: ${url}`] : []), '', `${fence}${languageOf(path)}`, content, fence);
    }
    // An example whose screens the site does not publish has no screens left, and is not shown; nor is a link that opens such a screen.
    const example = isObject(entry.example) && Array.isArray(entry.example.screens) ? entry.example : undefined;
    if (example) {
      out.push('', `### ${this.line(example.title)}`, '', this.text(example.text), '');
      for (const screen of asList(example.screens).filter(isObject)) out.push(`- [${this.line(screen.title)}](${this.href(screen.href)})`);
      if (isObject(example.open)) out.push('', `[${this.line(example.open.label)}](${this.href(example.open.href)})`);
    }
    const source = isObject(entry.source) ? entry.source : undefined;
    if (source) {
      const target = isObject(source.href) ? this.href(source.href) : '';
      out.push('', `${this.text(source.label)}: ${this.text(source.value)}${target ? ` (${target})` : ''}`);
    }
    return out;
  }
  // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-render-explorer

  // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-render-links
  links(value: unknown): string[] {
    return asList(value)
      .filter(isObject)
      .map((item) => `- [${this.line(item.label)}](${this.href(item.href)})`);
  }
  // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-render-links

  /** A guide step: a heading numbered in page order (an unnumbered step keeps no number), then its lead, code, files, expected screen, expected result, note and links. */
  // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-render-step
  step(entry: Json, number: number | undefined): string[] {
    const out = [number === undefined ? `## ${this.line(entry.title)}` : `## ${number}. ${this.line(entry.title)}`];
    if (entry.lead) out.push('', this.text(entry.lead));
    if (entry.code) out.push('', ...this.code(entry.code));
    const files = asList(entry.files).filter(isObject);
    if (files.length > 0) out.push('', ...files.map((file) => `- \`${asString(file.path)}\`: ${this.text(file.text)}${isObject(file.href) ? ` (${this.href(file.href)})` : ''}`));
    if (isObject(entry.result)) {
      const result = entry.result;
      out.push('', `${this.text(result.caption)}: the menu entry ${this.text(result.menu)} shows the title "${this.text(result.title)}" and the text "${this.text(result.text)}"`);
    }
    if (entry.expected) out.push('', `Expected result: ${this.text(entry.expected)}`);
    if (typeof entry.note === 'string') out.push('', this.text(entry.note));
    else if (isObject(entry.note)) out.push('', `**${this.line(entry.note.title)}**`, '', ...asList(entry.note.items).map((item) => this.text(item)));
    if (entry.links) out.push('', ...this.links(entry.links));
    return out;
  }
  // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-render-step

  /** Linked cards or nodes as list items: `- [title](address): text`; a node without a link (its screen is not published) as `- title: text`. */
  // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-render-cards
  cards(value: unknown, textKey = 'text'): string[] {
    return asList(value)
      .filter(isObject)
      .map((item) => `- ${isObject(item.href) ? `[${this.line(item.title)}](${this.href(item.href)})` : this.line(item.title)}${item[textKey] ? `: ${this.text(item[textKey])}` : ''}`);
  }
  // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-render-cards

  entry(entry: Json, step: { n: number }): string[] {
    // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-render-entry
    switch (entry.type) {
      // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-headings
      case 'section-heading':
      case 'guide-closing-heading':
        return [`## ${this.line(entry.title)}`, ...(entry.lead ? ['', this.text(entry.lead)] : [])];
      // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-headings
      // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-steps
      case 'step':
        step.n += 1;
        return this.step(entry, step.n);
      case 'step-unnumbered':
        return this.step(entry, undefined);
      // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-steps
      // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-text
      case 'paragraph':
      case 'fineprint':
      case 'status':
        return [this.text(entry.text)];
      // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-text
      // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-links
      case 'links':
        return [this.text(entry.lead), '', ...this.links(entry.items)];
      case 'actions':
        return this.links(entry.items);
      // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-links
      // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-task
      case 'agent-task':
        return [`## ${this.line(entry.summary)}`, ...(entry.lead ? ['', this.text(entry.lead)] : []), '', ...this.code(entry.code)];
      // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-task
      // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-questions-list
      case 'troubleshooting':
        return [
          `## ${this.line(entry.title)}`,
          ...asList(entry.items)
            .filter(isObject)
            .flatMap((item) => ['', `**${this.line(item.summary)}**`, '', this.text(item.text)]),
        ];
      case 'list':
        return [`## ${this.line(entry.title)}`, '', ...this.cards(entry.items)];
      // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-questions-list
      // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-code-cards
      case 'code':
        return this.code(entry.code);
      case 'checklist':
        return asList(entry.items).map((item) => `- ${this.text(item)}`);
      case 'path-cards':
      case 'start-paths':
      case 'template-pair':
      case 'template-row':
      case 'card-tiles':
        return this.cards(entry.items);
      // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-code-cards
      // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-explorer
      case 'file-explorer':
        return this.explorer(entry);
      // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-explorer
      // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-panels-callouts
      case 'panels':
        return asList(entry.items)
          .filter(isObject)
          .flatMap((panel) => [`### ${this.line(panel.title)}`, '', this.text(panel.text), '', ...asList(panel.links).filter(isObject).map((link) => `- [${this.line(link.label)}](${this.href(link.href)})`), '']);
      case 'cta-box':
      case 'cta-rule': {
        const action = isObject(entry.action) ? entry.action : {};
        return [`## ${this.line(entry.title)}`, '', this.text(entry.text), '', `- [${this.line(action.label)}](${this.href(action.href)})`];
      }
      case 'facts':
        return [
          `## ${this.line(entry.title)}`,
          '',
          ...asList(entry.items)
            .filter(isObject)
            .map((item) => `- ${this.text(item.label)}: ${this.text(item.value)}`),
          ...this.links(entry.actions),
        ];
      case 'details':
        return [`**${this.line(entry.summary)}**`, '', ...asList(entry.items).map((item) => `- ${this.text(item)}`)];
      case 'callout':
        return [...(entry.title ? [`**${this.line(entry.title)}**`, ''] : []), this.text(entry.text), ...(isObject(entry.link) ? ['', `- [${this.line(entry.link.label)}](${this.href(entry.link.href)})`] : [])];
      // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-panels-callouts
      // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-packages
      case 'package-list':
        return [
          ...this.outline.libraries.flatMap((library) => [
            `## ${library.package} ${library.version}`,
            '',
            library.description,
            '',
            '```',
            `npm install ${library.package}@${library.version}`,
            '```',
            '',
            `Source: ${library.sourceUrl}`,
            '',
          ]),
          ...(this.outline.shellPackages.length === 0
            ? []
            : [`## ${this.line('t:libraries.shell.title')}`, '', this.text('t:libraries.shell.lead'), '', ...this.outline.shellPackages.map((pkg) => `- ${pkg.package} ${pkg.version}: ${pkg.description}`), '']),
        ];
      // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-packages
      // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-home
      // The page's title and lead are the hero's; the hero adds its actions (its drawing's name is not content).
      case 'hero':
        return this.links(entry.actions);
      case 'features':
        return [
          `## ${this.line(entry.title)}`,
          ...asList(entry.items)
            .filter(isObject)
            .flatMap((item) => ['', `### ${this.line(item.title)}`, '', this.text(item.text), '', ...this.links([item.link])]),
        ];
      case 'architecture-map': {
        const map = isObject(entry.map) ? entry.map : {};
        const shell = isObject(map.shell) ? map.shell : {};
        return [
          `## ${this.line(entry.title)}`,
          '',
          this.text(entry.lead),
          '',
          this.text(map.label),
          '',
          ...this.cards([map.kit, map.rules, shell], 'note'),
          ...this.links([shell.templates]),
          ...this.cards(map.screens, 'hint'),
        ];
      }
      case 'change-story': {
        const task = isObject(entry.task) ? entry.task : {};
        const diff = isObject(entry.diff) ? entry.diff : {};
        const result = isObject(entry.result) ? entry.result : {};
        return [
          `## ${this.line(entry.title)}`,
          '',
          this.text(entry.lead),
          '',
          `Task: ${this.text(task.before)}${this.text(task.emphasis)}${this.text(task.after)}`,
          '',
          `**${this.line(diff.path)}**`,
          '',
          '```diff',
          `- ${this.text(diff.removed)}`,
          `+ ${this.text(diff.added)}`,
          '```',
          '',
          `${this.text(result.label)}: the menu entry ${this.text(result.nav)} shows the title "${this.text(result.title)}" and the text "${this.text(result.text)}"`,
          '',
          ...this.links([entry.link]),
        ];
      }
      case 'kit-showcase':
        return [
          `## ${this.line(entry.title)}`,
          '',
          this.text(entry.lead),
          ...asList(entry.groups)
            .filter(isObject)
            .flatMap((group) => ['', `### ${this.line(group.title)}`, '', ...this.cards(group.tiles)]),
          '',
          ...this.links([entry.link]),
        ];
      // A comparison's bars carry no figures, so the twin names none; an empty unit or note is left out.
      case 'metric-comparison': {
        const note = this.text(entry.note);
        return [
          `## ${this.line(entry.title)}`,
          '',
          this.text(entry.lead),
          ...asList(entry.metrics)
            .filter(isObject)
            .flatMap((metric) => {
              const unit = this.text(metric.unit);
              return ['', unit ? `### ${this.line(metric.title)} (${unit})` : `### ${this.line(metric.title)}`, '', `${this.text(metric.statement)} ${this.text(metric.benefit)}`, '', this.text(metric.text)];
            }),
          ...(note ? ['', note] : []),
        ];
      }
      // A logo strip names each company with a link to its site; the logos themselves are pictures.
      case 'logo-strip':
        return [`## ${this.line(entry.title)}`, '', ...this.links(asList(entry.logos).filter(isObject).map((logo) => ({ label: logo.name, href: logo.href })))];
      case 'get-started-steps':
        return [`## ${this.line(entry.title)}`, '', this.text(entry.lead), '', ...this.cards(entry.steps), '', ...this.links([entry.link])];
      case 'closing-cta':
        return [`## ${this.line(entry.title)}`, '', ...this.links(entry.actions)];
      // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-home
      // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-unknown
      default:
        return [];
      // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-entry-unknown
    }
    // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-render-entry
  }

  /** The plain-text copy of an agent task: its text alone, for pasting into a coding agent. */
  // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-render-task-copy
  task(entry: Json): string {
    const code = isObject(entry.code) ? entry.code : {};
    return `${asList(code.lines).map((line) => this.text(line)).join('\n').replace(/\n+$/, '')}\n`;
  }
  // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-render-task-copy

  // @cpt-algo:cpt-template-site-meta-algo-plain-text-twins-render-page:p2
  page(page: Json): string {
    // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-render-sections
    const route = asString(page.route);
    const step = { n: 0 };
    const sections = asList(page.entries)
      .filter(isObject)
      .map((entry) => this.entry(entry, step).join('\n'))
      .filter((section) => section.trim() !== '');
    // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-render-sections
    // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-return-page
    const canonical = `${this.map.origin}${screenAddress(this.map.domainKey, this.map.routeParam, this.outline.screen, route)}`;
    const meta = asList(page.meta).map((item) => this.text(item));
    const lines = [`# ${this.line(page.title)}`, '', this.text(page.lead), '', ...(meta.length > 0 ? [meta.join(' | '), ''] : []), `Page: ${canonical}`, '', ...sections.flatMap((section) => [section, ''])];
    return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '')}\n`;
    // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-page:p2:inst-return-page
  }
}

/**
 * The twins of every outline page that is a page of the site (a screen root or a declared static route).
 * @param outlines - the composed packages' outlines
 * @param map - the site's page map
 */
// @cpt-algo:cpt-template-site-meta-algo-plain-text-twins-render-twins:p2
// @cpt-dod:cpt-template-site-meta-dod-plain-text-twins-render:p2
export function renderTwins(outlines: readonly ScreenOutline[], map: SiteMetaMap): Twin[] {
  const twins: Twin[] = [];
  // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-twins:p2:inst-foreach-outline
  for (const outline of outlines) {
    // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-twins:p2:inst-if-unknown-screen
    const screen = Object.hasOwn(map.screens, outline.screen) ? map.screens[outline.screen] : undefined;
    if (!screen) throw new Error(`an outline names the screen "${outline.screen}", which the site does not have`);
    // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-twins:p2:inst-if-unknown-screen
    const renderer = new TwinRenderer(outline, map);
    // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-twins:p2:inst-foreach-page
    for (const page of outline.pages) {
      // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-twins:p2:inst-if-undeclared-page
      const route = asString(page.route);
      if (!Object.hasOwn(screen.pages, route)) throw new Error(`the ${outline.screen} outline has a page at ${route}, which the screen's seo block does not declare`);
      // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-twins:p2:inst-if-undeclared-page
      // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-twins:p2:inst-add-page-twin
      const address = twinPath(outline.screen, route);
      twins.push({ file: address.slice(1), path: address, screen: outline.screen, route, content: renderer.page(page) });
      // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-twins:p2:inst-add-page-twin
      // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-twins:p2:inst-add-task-twins
      // An agent task that offers a plain-text copy gets one next to the page's twin.
      for (const entry of asList(page.entries).filter(isObject)) {
        if (entry.type !== 'agent-task' || !entry.twin) continue;
        const task = taskTwinPath(outline.screen, route, asString(entry.id));
        twins.push({ file: task.slice(1), path: task, screen: outline.screen, route, content: renderer.task(entry), title: renderer.text(entry.summary) });
      }
      // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-twins:p2:inst-add-task-twins
    }
    // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-twins:p2:inst-foreach-page
  }
  // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-twins:p2:inst-foreach-outline
  // @cpt-begin:cpt-template-site-meta-algo-plain-text-twins-render-twins:p2:inst-return-twins
  return twins;
  // @cpt-end:cpt-template-site-meta-algo-plain-text-twins-render-twins:p2:inst-return-twins
}
