import { createElement, useMemo, type ReactElement } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Badge, Card, CardContent, CardFooter, CardHeader } from '@gears-frontx/ui-kit';
import { CardTitle, Link, Text } from '@gears-frontx/kit-candidates';
import { FileExplorer, type FileExplorerLabels } from '@gears-frontx/site-blocks/FileExplorer';
import { keyFileContent, type Explorer, type Href } from './outline';

/** Strings the explorer needs, from the screen's own strings. */
export interface ExplorerChrome extends FileExplorerLabels {
  includedScreens: string;
}

export interface ExplorerProps {
  entry: Explorer;
  text: (value: string) => string;
  /** The element a link renders as: the site link with its destination and no children. */
  to: (target: Href, testId?: string) => ReactElement;
  chrome: ExplorerChrome;
}

// @cpt-algo:cpt-template-site-algo-content-model-key-files:p2
/**
 * Binds an outline's file-explorer entry to the FileExplorer block: the key files with their content decoded, the source line, and the Example tab that links the screens of this site the template contributes, each opened through the screen domain.
 */
export function KeyFilesExplorer({ entry, text, to, chrome }: ExplorerProps) {
  // @cpt-begin:cpt-template-site-algo-content-model-key-files:p1:inst-map-files
  // Decoding is per file and the list re-renders on every keystroke of the find box.
  const files = useMemo(() => entry.files.map((file) => ({ path: file.path, description: text(file.text), url: file.url, lines: file.lines, content: keyFileContent(file) })), [entry.files, text]);
  // @cpt-end:cpt-template-site-algo-content-model-key-files:p1:inst-map-files
  // @cpt-begin:cpt-template-site-algo-content-model-key-files:p1:inst-render-explorer
  const example = entry.example;
  return (
    <FileExplorer
      id={entry.id}
      title={text(entry.title)}
      labels={chrome}
      files={files}
      // @cpt-begin:cpt-template-site-algo-content-model-key-files:p1:inst-render-source
      source={entry.source ? { label: text(entry.source.label), value: text(entry.source.value) } : undefined}
      // @cpt-end:cpt-template-site-algo-content-model-key-files:p1:inst-render-source
      // @cpt-begin:cpt-template-site-algo-content-model-key-files:p1:inst-render-scope
      scope={
        entry.scope ? (
          <>
            <span>{text(entry.scope.text)}</span>
            {entry.scope.link ? (
              <Link render={to(entry.scope.link.href)}>
                {text(entry.scope.link.label)}
                <ArrowUpRight aria-hidden />
              </Link>
            ) : null}
          </>
        ) : undefined
      }
      // @cpt-end:cpt-template-site-algo-content-model-key-files:p1:inst-render-scope
      // @cpt-begin:cpt-template-site-algo-content-model-key-files:p1:inst-render-note-legal
      note={entry.note ? text(entry.note) : undefined}
      legal={
        entry.legal ? (
          <>
            {entry.legal.map((item) => (
              <Link key={item.label} variant="muted" render={to(item.href)}>
                {text(item.label)}
              </Link>
            ))}
          </>
        ) : undefined
      }
      // @cpt-end:cpt-template-site-algo-content-model-key-files:p1:inst-render-note-legal
      // @cpt-begin:cpt-template-site-algo-content-model-key-files:p1:inst-render-example
      example={
        example ? (
          <Card>
            <CardHeader>
              <CardTitle render={createElement('h3')}>{text(example.title)}</CardTitle>
            </CardHeader>
            <CardContent>
              <Text tone="muted">{text(example.text)}</Text>
              <div role="group" aria-label={chrome.includedScreens}>
                {example.screens.map((screen) => (
                  <Badge key={screen.title} variant="outline" render={to(screen.href)}>
                    {text(screen.title)}
                  </Badge>
                ))}
              </div>
            </CardContent>
            {example.open ? (
              <CardFooter>
                <Link render={to(example.open.href, 'explorer-open-example')}>
                  {text(example.open.label)}
                  <ArrowUpRight aria-hidden />
                </Link>
              </CardFooter>
            ) : undefined}
          </Card>
        ) : undefined
      }
      // @cpt-end:cpt-template-site-algo-content-model-key-files:p1:inst-render-example
    />
  );
  // @cpt-end:cpt-template-site-algo-content-model-key-files:p1:inst-render-explorer
}
