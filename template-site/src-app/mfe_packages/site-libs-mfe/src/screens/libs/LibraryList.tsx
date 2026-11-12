import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ChildMfeBridge } from '@gears-frontx/react';
import { buttonVariants, Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@gears-frontx/ui-kit';
import { PackageList } from '@gears-frontx/site-blocks/PackageList';
import { SectionHeading } from '@gears-frontx/site-blocks/SectionHeading';
import type { OutlineChrome } from '@site-shared/content/OutlinePage';
import { SiteLink } from '@site-shared/navigation/SiteLink';
import { isPublished } from '@site-shared/content/publish';
import { SITE_PUBLISHING } from '@site-shared/content/sitePublishing';
import { CATALOGUE_SCREEN_EXTENSION } from '@site-shared/navigation/siteScreens';
import type { Library, ShellPackage } from '../../api/types';

export interface LibraryListProps {
  libraries: readonly Library[];
  shellPackages: readonly ShellPackage[];
  t: (key: string) => string;
  chrome: OutlineChrome;
  bridge: ChildMfeBridge;
}

// @cpt-begin:cpt-template-site-algo-libraries-screen-order:p2:inst-rank
/** The packages a reader meets first, in this order; the rest follow by name. */
const LEAD_PACKAGES = ['@gears-frontx/ui-kit', '@gears-frontx/mfes', '@gears-frontx/api', '@gears-frontx/gts-plugin'];
// @cpt-end:cpt-template-site-algo-libraries-screen-order:p2:inst-rank

/** The order the cards are shown in: the lead packages first, then every other package as the data lists it. */
// @cpt-algo:cpt-template-site-algo-libraries-screen-order:p2
export function orderLibraries<L extends { package: string }>(libraries: readonly L[]): L[] {
  // @cpt-begin:cpt-template-site-algo-libraries-screen-order:p2:inst-rank
  const rank = (name: string) => {
    const at = LEAD_PACKAGES.indexOf(name);
    return at === -1 ? LEAD_PACKAGES.length : at;
  };
  // @cpt-end:cpt-template-site-algo-libraries-screen-order:p2:inst-rank
  // @cpt-begin:cpt-template-site-algo-libraries-screen-order:p2:inst-return-sorted
  return [...libraries].sort((a, b) => rank(a.package) - rank(b.package));
  // @cpt-end:cpt-template-site-algo-libraries-screen-order:p2:inst-return-sorted
}

/** The `package-list` entry of the outline: a card per FrontX package the site uses, with its install command, a link to its catalogue where it has one and its source, then the shell template's workspace packages as a list. */
// @cpt-algo:cpt-template-site-algo-libraries-screen-package-list:p1
export function LibraryList({ libraries, shellPackages, t, chrome, bridge }: LibraryListProps) {
  // @cpt-begin:cpt-template-site-algo-libraries-screen-package-list:p1:inst-optional-strings
  // A package's own title and sentence where the strings have them; otherwise its short name and the description its package.json carries.
  const optional = (key: string) => {
    const value = t(key);
    return value === key ? undefined : value;
  };
  // @cpt-end:cpt-template-site-algo-libraries-screen-package-list:p1:inst-optional-strings
  return (
    <>
      {/* @cpt-begin:cpt-template-site-algo-libraries-screen-package-list:p1:inst-for-each-package */}
      <PackageList
        copyLabel={chrome.copy}
        copiedLabel={chrome.copied}
        packages={orderLibraries(libraries).map((library) => {
          const short = library.package.replace('@gears-frontx/', '');
          const title = optional(`libraries.pkg.${short}.title`) ?? short;
          return {
            name: `${library.package} ${library.version}`,
            title,
            text: optional(`libraries.pkg.${short}.text`) ?? library.description,
            // @cpt-begin:cpt-template-site-algo-libraries-screen-package-list:p1:inst-install-command
            install: { command: `npm install ${library.package}@${library.version}`, title: `${t('libraries.install')} ${title}`, label: `${library.package} ${t('libraries.install')}` },
            // @cpt-end:cpt-template-site-algo-libraries-screen-package-list:p1:inst-install-command
            actions: (
              <>
                {/* @cpt-begin:cpt-template-site-algo-libraries-screen-package-list:p1:inst-open-kit */}
                {short === 'ui-kit' && isPublished(SITE_PUBLISHING, CATALOGUE_SCREEN_EXTENSION) ? (
                  <SiteLink to={{ extension: CATALOGUE_SCREEN_EXTENSION }} bridge={bridge} className={buttonVariants({ variant: 'default' })}>
                    <ArrowRight aria-hidden size={16} />
                    {t('libraries.openKit')}
                  </SiteLink>
                ) : null}
                {/* @cpt-end:cpt-template-site-algo-libraries-screen-package-list:p1:inst-open-kit */}
                {/* @cpt-begin:cpt-template-site-algo-libraries-screen-package-list:p1:inst-view-source */}
                <a className={buttonVariants({ variant: 'outline' })} href={library.sourceUrl} rel="noopener">
                  <ArrowUpRight aria-hidden size={16} />
                  {t('libraries.sourceView')}
                </a>
                {/* @cpt-end:cpt-template-site-algo-libraries-screen-package-list:p1:inst-view-source */}
              </>
            ),
          };
        })}
      />
      {/* @cpt-end:cpt-template-site-algo-libraries-screen-package-list:p1:inst-for-each-package */}
      {/* @cpt-begin:cpt-template-site-algo-libraries-screen-package-list:p1:inst-shell-packages */}
      {shellPackages.length > 0 ? (
        <section aria-labelledby="shell-packages">
          <SectionHeading id="shell-packages" title={t('libraries.shell.title')} lead={t('libraries.shell.lead')} />
          <ItemGroup>
            {shellPackages.map((entry) => (
              <Item key={entry.package} role="listitem" variant="outline">
                <ItemContent>
                  <ItemTitle>{`${entry.package} ${entry.version}`}</ItemTitle>
                  <ItemDescription>{entry.description}</ItemDescription>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        </section>
      ) : null}
      {/* @cpt-end:cpt-template-site-algo-libraries-screen-package-list:p1:inst-shell-packages */}
    </>
  );
}
