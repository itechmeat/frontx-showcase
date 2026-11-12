import { createElement, Fragment, type ReactElement, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Layers, Terminal } from 'lucide-react';
import type { ChildMfeBridge } from '@gears-frontx/react';
import {
  Alert,
  AlertAction,
  AlertDescription,
  Badge,
  Button,
  buttonVariants,
  Card,
  CardDescription,
  CardHeader,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  ItemContent,
  ItemDescription,
  ItemGroup,
  Item,
  ItemMedia,
  ItemTitle,
} from '@gears-frontx/ui-kit';
import { AlertTitle, CardTitle, CodeBlock, CodeBlockCopyButton, CodeBlockHeader, CodeBlockTitle, Heading, Link, Text } from '@gears-frontx/kit-candidates';
import { ActionRow } from '@gears-frontx/site-blocks/ActionRow';
import { AgentTask } from '@gears-frontx/site-blocks/AgentTask';
import { ArchitectureMap } from '@gears-frontx/site-blocks/ArchitectureMap';
import { CardTiles } from '@gears-frontx/site-blocks/CardTiles';
import { ChangeStory } from '@gears-frontx/site-blocks/ChangeStory';
import { ClosingCta } from '@gears-frontx/site-blocks/ClosingCta';
import { CtaBox } from '@gears-frontx/site-blocks/CtaBox';
import { CtaRule } from '@gears-frontx/site-blocks/CtaRule';
import { DocsFrame, type DocsNav } from '@gears-frontx/site-blocks/DocsFrame';
import { DocsFrameWithRail } from '@gears-frontx/site-blocks/DocsFrameWithRail';
import { Facts } from '@gears-frontx/site-blocks/Facts';
import { Features } from '@gears-frontx/site-blocks/Features';
import { GetStartedSteps } from '@gears-frontx/site-blocks/GetStartedSteps';
import { GuideClosingHeading } from '@gears-frontx/site-blocks/GuideClosingHeading';
import { GuideStep } from '@gears-frontx/site-blocks/GuideStep';
import { GuideStepUnnumbered } from '@gears-frontx/site-blocks/GuideStepUnnumbered';
import { Hero } from '@gears-frontx/site-blocks/Hero';
import { KitShowcase } from '@gears-frontx/site-blocks/KitShowcase';
import { LogoStrip } from '@gears-frontx/site-blocks/LogoStrip';
import { MetricComparison } from '@gears-frontx/site-blocks/MetricComparison';
import type { PageIntroProps } from '@gears-frontx/site-blocks/PageIntro';
import { Panels } from '@gears-frontx/site-blocks/Panels';
import { PathCards } from '@gears-frontx/site-blocks/PathCards';
import { SectionHeading } from '@gears-frontx/site-blocks/SectionHeading';
import { StartPaths } from '@gears-frontx/site-blocks/StartPaths';
import { TemplateDetailFrame } from '@gears-frontx/site-blocks/TemplateDetailFrame';
import { TemplatePair } from '@gears-frontx/site-blocks/TemplatePair';
import { TemplateRow } from '@gears-frontx/site-blocks/TemplateRow';
import { Troubleshooting } from '@gears-frontx/site-blocks/Troubleshooting';
import { SiteLink } from '../navigation/SiteLink';
import { architectureArt, closingArt, figureArt, heroArt, metricArt, workbenchArt } from './brandArt';
import { KeyFilesExplorer, type ExplorerChrome } from './Explorer';
import { documentHref, taskTwinPath } from './twins';
import { wrapCommands } from './wrapCommand';
import { pageAnchors, resolveText, type Code, type Entry, type Href, type Link as OutlineLink, type Page, type Text as OutlineText } from './outline';

/** Strings the renderer itself needs, from the screen's own strings. */
export interface OutlineChrome extends ExplorerChrome {
  onThisPage: string;
  expected: string;
  plainText: string;
  /** The word that names a code region when its caption repeats a heading, such as "code". */
  code: string;
  /** The accessible name of a guide's start paths. */
  startPaths?: string;
}

export interface OutlinePageProps {
  page: Page;
  translate: (key: string) => string;
  vars?: Readonly<Record<string, string>>;
  bridge: ChildMfeBridge;
  /** The renderer's own strings; a landing page, which has no code, steps or explorer, needs none. */
  chrome?: OutlineChrome;
  /** The tab bar under the page intro, such as the docs tabs. */
  nav?: DocsNav;
  /** Site-root path of the page's plain-text twin (`twinPath`), linked relative to the shell's document from the foot of its side panel or, on a page without one, from the page's footer line. */
  twinHref?: string;
  /** The screen's route token, for the addresses of the plain-text copies of a page's agent tasks. */
  screen?: string;
  /** Renders the entries whose data the outline itself does not hold (`package-list`). */
  renderData?: (entry: Entry) => ReactNode;
  /** The picture of a card, from the card's target. */
  cardArt?: (target: Href) => ReactNode;
  /** The live kit samples of a kit showcase, by the sample key a tile names. */
  samples?: (sample: string) => ReactNode;
  /** The logo images of a logo strip, by the file name a logo entry gives; a logo whose image the screen does not supply is left out. */
  logos?: (file: string) => string | undefined;
  /** Whether the page shows its "On this page" panel; pages with few, self-evident sections leave it out. Defaults to true. */
  rail?: boolean;
}

/** The entries that may open a page above its columns, across the whole width. */
const LEADING: readonly Entry['type'][] = ['path-cards', 'start-paths', 'links'];

// @cpt-algo:cpt-template-site-algo-content-model-arrange-entries:p2
/**
 * Which frame a page takes and where each entry goes. A landing page (opening with a hero) renders its entries one after another, each a full-width band. A page with a file explorer shows it across the whole column and puts the rest under it: what the template gives, then the entries that led to the explorer, then the details, beside the facts. Any other page shows its leading path cards, starting points and link line across the whole column, then its entries beside the facts and "On this page".
 * @param entries - the page's entries
 */
export function arrangeEntries<E extends Entry>(entries: readonly E[]): { frame: 'landing' | 'explorer' | 'docs'; facts: E[]; explorer: E | undefined; wide: E[]; main: E[] } {
  // @cpt-begin:cpt-template-site-algo-content-model-arrange-entries:p1:inst-landing-page
  if (entries[0]?.type === 'hero') return { frame: 'landing', facts: [], explorer: undefined, wide: [], main: [...entries] };
  // @cpt-end:cpt-template-site-algo-content-model-arrange-entries:p1:inst-landing-page
  // @cpt-begin:cpt-template-site-algo-content-model-arrange-entries:p1:inst-split-facts
  const facts = entries.filter((entry) => entry.type === 'facts');
  const body = entries.filter((entry) => entry.type !== 'facts');
  // @cpt-end:cpt-template-site-algo-content-model-arrange-entries:p1:inst-split-facts
  // @cpt-begin:cpt-template-site-algo-content-model-arrange-entries:p1:inst-explorer-page
  const at = body.findIndex((entry) => entry.type === 'file-explorer');
  if (at >= 0) {
    const before = body.slice(0, at);
    const after = body.slice(at + 1);
    const details = after.filter((entry) => entry.type === 'details');
    return { frame: 'explorer', facts, explorer: body[at], wide: [], main: [...after.filter((entry) => entry.type !== 'details'), ...before, ...details] };
  }
  // @cpt-end:cpt-template-site-algo-content-model-arrange-entries:p1:inst-explorer-page
  // @cpt-begin:cpt-template-site-algo-content-model-arrange-entries:p1:inst-plain-page
  const firstOther = body.findIndex((entry) => !LEADING.includes(entry.type));
  const lead = firstOther === -1 ? body.length : firstOther;
  return { frame: 'docs', facts, explorer: undefined, wide: body.slice(0, lead), main: body.slice(lead) };
  // @cpt-end:cpt-template-site-algo-content-model-arrange-entries:p1:inst-plain-page
}

// @cpt-flow:cpt-template-site-flow-content-model-read-content-page:p1
// @cpt-dod:cpt-template-site-dod-content-model-page-renderer:p1
// @cpt-dod:cpt-template-site-dod-content-model-twin-links:p2
/**
 * One page of an outline, composed from the blocks of `@gears-frontx/site-blocks`, the kit candidates and `@gears-frontx/ui-kit`: each entry type renders the block it is named after, or a kit part directly, in the frame the page's shape asks for. Steps are numbered in order. The renderer holds no styling of its own.
 */
export function OutlinePage({ page, translate, vars, bridge, chrome, nav, twinHref, screen, renderData, cardArt, samples, logos, rail = true }: OutlinePageProps) {
  // @cpt-begin:cpt-template-site-flow-content-model-read-content-page:p1:inst-bind-text
  const text = (value: OutlineText) => resolveText(value, translate, vars);
  const optional = (value: OutlineText | undefined) => (value === undefined ? undefined : text(value));
  // @cpt-end:cpt-template-site-flow-content-model-read-content-page:p1:inst-bind-text
  // @cpt-begin:cpt-template-site-flow-content-model-read-content-page:p1:inst-collect-anchors
  const anchors = pageAnchors(page);
  // @cpt-end:cpt-template-site-flow-content-model-read-content-page:p1:inst-collect-anchors
  // @cpt-begin:cpt-template-site-flow-content-model-read-content-page:p1:inst-number-steps
  // Steps are numbered in page order; the numbers are worked out before rendering.
  const stepNumbers = new Map<Entry, number>();
  for (const entry of page.entries) if (entry.type === 'step') stepNumbers.set(entry, stepNumbers.size + 1);
  // @cpt-end:cpt-template-site-flow-content-model-read-content-page:p1:inst-number-steps
  // @cpt-begin:cpt-template-site-flow-content-model-read-content-page:p1:inst-arrange-page
  const arranged = arrangeEntries(page.entries);
  const showRail = rail && arranged.frame === 'docs' && anchors.length > 0;
  // @cpt-end:cpt-template-site-flow-content-model-read-content-page:p1:inst-arrange-page

  // @cpt-begin:cpt-template-site-flow-content-model-read-content-page:p1:inst-bind-links
  // An external address may carry data placeholders (the AI kit's README sits at the commit the packages were packed from).
  const href = (target: Href): Href => ('url' in target ? { url: text(target.url) } : target);
  const isExternal = (target: Href) => 'url' in target;
  /** The element a block or kit part renders a link as: the site link with its destination and no children. */
  const to = (target: Href, testId?: string): ReactElement => <SiteLink to={href(target)} bridge={bridge} data-testid={testId} />;
  // A map node whose screen the site does not publish has no link: it keeps its place as plain text.
  const nodeLink = (target: Href | undefined): ReactElement => (target ? to(target) : <span />);
  /** A text link with its arrow: out of the site for an external address, along the page otherwise. */
  const textLink = (item: OutlineLink, testId?: string) => (
    <Link key={item.label} render={to(item.href, testId)}>
      {text(item.label)}
      {isExternal(item.href) ? <ArrowUpRight aria-hidden /> : <ArrowRight aria-hidden />}
    </Link>
  );
  /** A link drawn as a kit button: the kit's button recipe on the link itself, since the kit Button rendered as an anchor takes the button role and would no longer be announced as a link. */
  const buttonLink = (item: OutlineLink, variant: 'default' | 'outline', testId?: string) => (
    <SiteLink key={item.label} to={href(item.href)} bridge={bridge} className={buttonVariants({ variant })} data-testid={testId}>
      {isExternal(item.href) ? <ArrowUpRight aria-hidden size={16} /> : <ArrowRight aria-hidden size={16} />}
      {text(item.label)}
    </SiteLink>
  );
  const blockAction = (item: OutlineLink, testId?: string) => ({ label: text(item.label), link: to(item.href, testId) });
  // @cpt-end:cpt-template-site-flow-content-model-read-content-page:p1:inst-bind-links
  // @cpt-begin:cpt-template-site-flow-content-model-read-content-page:p1:inst-bind-code
  // A step's code is a run of shell commands; long ones continue on the next line with ` \`, and Copy takes them as shown, which a shell reads as the same commands.
  const commands = (block: Code) => wrapCommands(block.lines.map(text)).join('\n');
  const copyLabels = { copyLabel: chrome?.copy ?? '', copiedLabel: chrome?.copied ?? '' };
  // @cpt-end:cpt-template-site-flow-content-model-read-content-page:p1:inst-bind-code
  // @cpt-begin:cpt-template-site-flow-content-model-read-content-page:p1:inst-twin-link
  const twinLink = twinHref ? (
    <Link href={documentHref(twinHref)} type="text/markdown" data-testid="page-twin">
      {chrome?.plainText}
      <ArrowUpRight aria-hidden />
    </Link>
  ) : undefined;
  // @cpt-end:cpt-template-site-flow-content-model-read-content-page:p1:inst-twin-link
  const cards = (items: Extract<Entry, { type: 'path-cards' }>['items']) =>
    items.map((item) => ({ figure: cardArt?.(item.href), eyebrow: optional(item.eyebrow), title: text(item.title), text: optional(item.text) ?? '', link: to(item.href) }));

  // @cpt-begin:cpt-template-site-flow-content-model-read-content-page:p1:inst-render-entries
  const renderEntry = (entry: Entry, key: number): ReactNode => {
    switch (entry.type) {
      case 'section-heading':
        return <SectionHeading key={key} id={entry.id} title={text(entry.title)} lead={optional(entry.lead)} label={optional(entry.label)} />;
      case 'guide-closing-heading':
        return <GuideClosingHeading key={key} id={entry.id} title={text(entry.title)} lead={optional(entry.lead)} />;
      case 'step':
        return (
          <GuideStep
            key={key}
            id={entry.id}
            number={stepNumbers.get(entry) ?? 0}
            title={text(entry.title)}
            lead={optional(entry.lead)}
            code={entry.code ? { title: text(entry.code.title), code: commands(entry.code) } : undefined}
            files={entry.files?.map((file) => {
              const name = file.name ?? file.path.slice(file.path.lastIndexOf('/') + 1);
              return { path: file.path, text: text(file.text), name: file.href ? <Link render={to(file.href)}>{name}</Link> : name };
            })}
            result={
              entry.result ? (
                // A drawing of the screen the reader should see: the chosen menu entry, the screen's title and text, with the caption under it.
                <figure>
                  <Card>
                    <CardHeader>
                      <Badge variant="outline">{text(entry.result.menu)}</Badge>
                      <CardTitle render={createElement('h3')}>{text(entry.result.title)}</CardTitle>
                      <CardDescription>{text(entry.result.text)}</CardDescription>
                    </CardHeader>
                  </Card>
                  <Text variant="meta" tone="muted" render={createElement('figcaption')}>
                    {text(entry.result.caption)}
                  </Text>
                </figure>
              ) : undefined
            }
            expected={entry.expected ? { label: chrome?.expected ?? '', text: text(entry.expected) } : undefined}
            note={entry.note === undefined ? undefined : typeof entry.note === 'string' ? text(entry.note) : { title: text(entry.note.title), items: entry.note.items.map(text) }}
            links={entry.links ? <>{entry.links.map((item) => textLink(item))}</> : undefined}
            {...copyLabels}
          />
        );
      case 'step-unnumbered':
        return <GuideStepUnnumbered key={key} id={entry.id} title={text(entry.title)} lead={text(entry.lead)} links={entry.links ? <>{entry.links.map((item) => textLink(item))}</> : undefined} />;
      case 'path-cards':
        return <PathCards key={key} items={cards(entry.items)} />;
      case 'start-paths':
        return (
          <StartPaths
            key={key}
            label={chrome?.startPaths ?? text(page.title)}
            items={entry.items.map((item) => ({ icon: cardArt?.(item.href), title: text(item.title), text: optional(item.text) ?? '', link: to(item.href), current: item.current }))}
          />
        );
      case 'template-pair': {
        const [first, second] = cards(entry.items);
        return first && second ? <TemplatePair key={key} items={[first, second]} /> : null;
      }
      case 'template-row':
        return (
          <Fragment key={key}>
            {cards(entry.items).map((item) => (
              <TemplateRow key={item.title} item={item} />
            ))}
          </Fragment>
        );
      case 'card-tiles':
        return <CardTiles key={key} items={cards(entry.items)} />;
      case 'panels':
        return (
          <Panels
            key={key}
            items={entry.items.map((panel) => ({
              label: optional(panel.label),
              title: text(panel.title),
              text: text(panel.text),
              actions: panel.links.map((item) => (item.kind === 'link' ? textLink(item) : buttonLink(item, 'outline'))),
            }))}
          />
        );
      case 'cta-box':
        return <CtaBox key={key} title={text(entry.title)} text={text(entry.text)} action={buttonLink(entry.action, 'default', 'band-action')} />;
      case 'cta-rule':
        return <CtaRule key={key} title={text(entry.title)} text={text(entry.text)} action={textLink(entry.action, 'band-action')} />;
      case 'facts':
        return <Facts key={key} title={text(entry.title)} facts={entry.items.map((item) => ({ label: text(item.label), value: text(item.value) }))} actions={entry.actions ? <>{entry.actions.map((item) => buttonLink(item, 'outline'))}</> : undefined} />;
      case 'file-explorer':
        return chrome ? <KeyFilesExplorer key={key} entry={entry} text={text} to={to} chrome={chrome} /> : null;
      // @cpt-begin:cpt-template-site-flow-content-model-read-content-page:p1:inst-task-twin
      case 'agent-task':
        return (
          <AgentTask
            key={key}
            id={entry.id}
            summary={text(entry.summary)}
            lead={optional(entry.lead)}
            code={{ title: text(entry.code.title), code: entry.code.lines.map(text).join('\n') }}
            twin={
              entry.twin && screen ? (
                <Link href={documentHref(taskTwinPath(screen, page.route, entry.id))} type="text/markdown" data-testid="task-twin">
                  {text(entry.twin)}
                  <ArrowUpRight aria-hidden />
                </Link>
              ) : undefined
            }
            {...copyLabels}
          />
        );
      // @cpt-end:cpt-template-site-flow-content-model-read-content-page:p1:inst-task-twin
      case 'troubleshooting':
        return <Troubleshooting key={key} id={entry.id} title={text(entry.title)} items={entry.items.map((item) => ({ summary: text(item.summary), text: text(item.text) }))} />;
      case 'package-list':
        return <Fragment key={key}>{renderData?.(entry)}</Fragment>;
      case 'paragraph':
        return <Text key={key}>{text(entry.text)}</Text>;
      case 'fineprint':
        return (
          <Text key={key} variant="meta" tone="muted">
            {text(entry.text)}
          </Text>
        );
      case 'status':
        return (
          <Text key={key} variant="label" tone="muted">
            {text(entry.text)}
          </Text>
        );
      case 'links':
        return (
          <Text key={key} tone="muted">
            {text(entry.lead)} {entry.items.map((item, index) => [index > 0 ? ' ' : null, textLink(item)])}
          </Text>
        );
      case 'actions':
        return <ActionRow key={key}>{entry.items.map((item) => buttonLink(item, item.primary ? 'default' : 'outline'))}</ActionRow>;
      case 'code': {
        const title = text(entry.code.title);
        return (
          <CodeBlock key={key} code={entry.code.lines.map(text).join('\n')} label={title}>
            <CodeBlockHeader>
              <CodeBlockTitle>{title}</CodeBlockTitle>
              <CodeBlockCopyButton {...copyLabels} />
            </CodeBlockHeader>
          </CodeBlock>
        );
      }
      case 'checklist':
        return (
          <ItemGroup key={key}>
            {entry.items.map((item) => (
              <Item key={item} role="listitem" size="sm">
                <ItemMedia variant="icon">
                  <Check aria-hidden />
                </ItemMedia>
                <ItemContent>
                  <ItemDescription>{text(item)}</ItemDescription>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        );
      case 'list':
        return (
          <section key={key} aria-labelledby={entry.id}>
            <Heading id={entry.id} size="heading-2" render={createElement('h2')} tabIndex={-1}>
              {text(entry.title)}
            </Heading>
            <ItemGroup>
              {entry.items.map((item) => (
                <Item key={`${item.title}-${JSON.stringify(item.href)}`} role="listitem" variant="outline">
                  <ItemContent>
                    <ItemTitle>
                      <Link render={to(item.href)}>{text(item.title)}</Link>
                    </ItemTitle>
                    {item.text ? <ItemDescription>{text(item.text)}</ItemDescription> : null}
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          </section>
        );
      case 'callout':
        return (
          <Alert key={key}>
            {entry.title ? <AlertTitle render={createElement('h2')}>{text(entry.title)}</AlertTitle> : null}
            <AlertDescription>{text(entry.text)}</AlertDescription>
            {entry.link ? <AlertAction>{textLink(entry.link)}</AlertAction> : null}
          </Alert>
        );
      case 'details':
        return (
          <Collapsible key={key}>
            <CollapsibleTrigger render={<Button variant="ghost" />}>{text(entry.summary)}</CollapsibleTrigger>
            <CollapsibleContent>
              <ItemGroup>
                {entry.items.map((item) => (
                  <Item key={item} role="listitem" size="sm">
                    <ItemContent>
                      <ItemDescription>{text(item)}</ItemDescription>
                    </ItemContent>
                  </Item>
                ))}
              </ItemGroup>
            </CollapsibleContent>
          </Collapsible>
        );
      case 'hero':
        return <Hero key={key} title={text(page.title)} lead={text(page.lead)} actions={entry.actions.map((item, index) => blockAction(item, index === 0 ? 'home-get-started' : 'home-source'))} art={heroArt(text(entry.art))} />;
      case 'features':
        return (
          <Features
            key={key}
            id={entry.id}
            title={text(entry.title)}
            items={entry.items.map((item) => ({ figure: figureArt(item.figure), title: text(item.title), text: text(item.text), action: blockAction(item.link) }))}
          />
        );
      case 'architecture-map': {
        const { map } = entry;
        return (
          <ArchitectureMap
            key={key}
            id={entry.id}
            label={text(entry.label)}
            title={text(entry.title)}
            lead={text(entry.lead)}
            map={architectureArt({
              label: text(map.label),
              kit: { title: text(map.kit.title), note: optional(map.kit.note), link: nodeLink(map.kit.href) },
              rules: { title: text(map.rules.title), note: optional(map.rules.note), link: nodeLink(map.rules.href) },
              shell: { title: text(map.shell.title), link: nodeLink(map.shell.href), templates: { label: text(map.shell.templates.label), link: to(map.shell.templates.href) } },
              screens: map.screens.map((node) => ({ title: text(node.title), hint: text(node.hint), link: nodeLink(node.href) })),
              wires: { kit: text(map.wires.kit), rules: text(map.wires.rules) },
            })}
          />
        );
      }
      case 'change-story':
        return (
          <ChangeStory
            key={key}
            id={entry.id}
            title={text(entry.title)}
            lead={text(entry.lead)}
            action={blockAction(entry.link)}
            workbench={workbenchArt({
              task: { before: text(entry.task.before), emphasis: text(entry.task.emphasis), after: text(entry.task.after) },
              diff: { path: text(entry.diff.path), removed: text(entry.diff.removed), added: text(entry.diff.added) },
              result: { label: text(entry.result.label), nav: text(entry.result.nav), title: text(entry.result.title), text: text(entry.result.text) },
            })}
          />
        );
      case 'kit-showcase':
        return (
          <KitShowcase
            key={key}
            id={entry.id}
            label={text(entry.label)}
            title={text(entry.title)}
            lead={text(entry.lead)}
            action={blockAction(entry.link)}
            groups={entry.groups.map((group) => ({
              title: text(group.title),
              tiles: group.tiles.map((tile) => ({ title: text(tile.title), link: to(tile.href, `home-kit-${tile.sample}`), sample: samples?.(tile.sample) })),
            }))}
          />
        );
      case 'metric-comparison':
        return (
          <MetricComparison
            key={key}
            id={entry.id}
            title={text(entry.title)}
            lead={text(entry.lead)}
            note={text(entry.note)}
            metrics={entry.metrics.map((metric) => ({
              title: text(metric.title),
              unit: text(metric.unit),
              statement: text(metric.statement),
              benefit: text(metric.benefit),
              chart: metric.bars.length ? metricArt(metric.bars.map((bar) => ({ label: text(bar.label), share: bar.share, featured: bar.featured === true }))) : undefined,
              explanation: text(metric.text),
            }))}
          />
        );
      case 'logo-strip':
        return (
          <LogoStrip
            key={key}
            id={entry.id}
            title={text(entry.title)}
            logos={entry.logos.flatMap((logo) => {
              const image = logos?.(logo.logo);
              return image ? [{ name: text(logo.name), image, width: logo.width, height: logo.height, link: to(logo.href) }] : [];
            })}
          />
        );
      case 'get-started-steps':
        return (
          <GetStartedSteps
            key={key}
            id={entry.id}
            title={text(entry.title)}
            lead={text(entry.lead)}
            action={blockAction(entry.link)}
            steps={entry.steps.map((step) => ({ figure: figureArt(step.figure), title: text(step.title), text: text(step.text), link: to(step.href) }))}
          />
        );
      case 'closing-cta':
        return <ClosingCta key={key} id={entry.id} title={text(entry.title)} actions={entry.actions.map((item) => blockAction(item))} visual={closingArt()} />;
    }
  };
  const render = (entries: readonly Entry[]) => entries.map((entry) => renderEntry(entry, page.entries.indexOf(entry)));
  // @cpt-end:cpt-template-site-flow-content-model-read-content-page:p1:inst-render-entries

  // @cpt-begin:cpt-template-site-flow-content-model-read-content-page:p1:inst-build-aside
  const facts = arranged.facts.length > 0 ? <>{render(arranged.facts)}</> : undefined;
  const intro: PageIntroProps = {
    title: text(page.title),
    lead: text(page.lead),
    back: page.back ? (
      <Link render={to(page.back.href)}>
        <ArrowLeft aria-hidden />
        <span>{text(page.back.label)}</span>
      </Link>
    ) : undefined,
    meta: page.meta?.map((item, index) => ({ icon: index === 0 ? <Terminal aria-hidden /> : <Layers aria-hidden />, text: text(item) })),
  };
  // @cpt-end:cpt-template-site-flow-content-model-read-content-page:p1:inst-build-aside

  // @cpt-begin:cpt-template-site-flow-content-model-read-content-page:p1:inst-return-frame
  if (arranged.frame === 'landing') return <article>{render(arranged.main)}</article>;
  if (arranged.frame === 'explorer' && arranged.explorer)
    return (
      <TemplateDetailFrame intro={intro} explorer={renderEntry(arranged.explorer, page.entries.indexOf(arranged.explorer))} facts={facts} footer={twinLink}>
        {render(arranged.main)}
      </TemplateDetailFrame>
    );
  const wide = arranged.wide.length > 0 ? <>{render(arranged.wide)}</> : undefined;
  if (showRail)
    return (
      <DocsFrameWithRail intro={intro} nav={nav} wide={wide} aside={facts} rail={{ label: page.rail ? text(page.rail) : (chrome?.onThisPage ?? ''), items: anchors.map((anchor) => ({ id: anchor.id, title: text(anchor.title) })), footer: twinLink }}>
        {render(arranged.main)}
      </DocsFrameWithRail>
    );
  // A page without a side panel links its plain-text twin from the line under its content.
  return (
    <DocsFrame intro={intro} nav={nav} wide={wide} footer={twinLink}>
      {facts}
      {render(arranged.main)}
    </DocsFrame>
  );
  // @cpt-end:cpt-template-site-flow-content-model-read-content-page:p1:inst-return-frame
}
