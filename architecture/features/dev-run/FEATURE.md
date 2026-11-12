# Feature: Dev run


<!-- toc -->

- [1. Feature Context](#1-feature-context)
  - [1.1 Overview](#11-overview)
  - [1.2 Purpose](#12-purpose)
  - [1.3 Actors](#13-actors)
  - [1.4 References](#14-references)
- [2. Actor Flows (CDSL)](#2-actor-flows-cdsl)
  - [Start the local run](#start-the-local-run)
  - [Smoke-check the local run](#smoke-check-the-local-run)
  - [Verify the UI against the baseline](#verify-the-ui-against-the-baseline)
  - [Build or check the baseline](#build-or-check-the-baseline)
- [3. Processes / Business Logic (CDSL)](#3-processes--business-logic-cdsl)
  - [Read what the run must serve](#read-what-the-run-must-serve)
  - [Collect the routes to verify](#collect-the-routes-to-verify)
  - [Compose the runner's arguments](#compose-the-runners-arguments)
  - [Give a finding its baseline reason](#give-a-finding-its-baseline-reason)
- [4. States (CDSL)](#4-states-cdsl)
  - [No Lifecycle to Model](#no-lifecycle-to-model)
- [5. Definitions of Done](#5-definitions-of-done)
  - [One local run with strict ports](#one-local-run-with-strict-ports)
  - [A smoke check of the local run](#a-smoke-check-of-the-local-run)
  - [A design-defect gate over every page](#a-design-defect-gate-over-every-page)
- [6. Acceptance Criteria](#6-acceptance-criteria)

<!-- /toc -->

- [x] `p3` - **ID**: `cpt-site-featstatus-dev-run`

## 1. Feature Context

- [x] `p3` - `cpt-site-feature-dev-run`

### 1.1 Overview

`npm run dev` runs the shell's development script, which builds every composed screen and widget package, generates the manifest aggregate, then starts the host's development server and a preview server for every remote on its fixed port with a strict port. `npm run dev:smoke` starts that run the way a developer does, waits until the host and every remote entry the host's served manifests name answer, then stops every process it started; before it starts anything it fails when a tool the shell runs through `npx` is missing from the site's install or a development port is taken, and while the run starts it fails when npx begins a download. `npm run verify:ui` runs template-design-guardrails' design-defect checker over every page of every composed screen, the ones `unpublishedScreens` leaves out of the build included, every block showcase route and the not-found screen at 1440 and 390 pixels against that run, and fails only on a finding the root baseline `scripts/design-verify-baseline.json` does not carry; every carried finding names its reason (a G34 checker false finding or a kit defect), which `npm run verify:ui:baseline` builds and checks.

### 1.2 Purpose

A developer and CI need one local run in which the host and every remote answer, with no interactive prompt and no unpinned download. The shell's development script reaches its tools through `npx`; a tool missing from `site/node_modules` makes npx ask to download it, a prompt the run then waits on, or fetch an unpinned copy without a terminal; and a preview server moved silently to another port leaves its screens unreachable without an error. The tools themselves are declared in `site/package.json` (the template composition feature's file), which carries no markers.

A page can also break in ways only a browser sees (contrast, a missing heading, a box that overflows); the guardrails' checker sees them, and a baseline whose every entry names its reason lets CI fail on a new one while the known kit defects and checker false findings wait upstream.

**Requirements**: `cpt-site-fr-local-run`

**Principles**: None beyond the principles assigned to other features.

### 1.3 Actors

| Actor | Role in Feature |
|-------|-----------------|
| `cpt-site-actor-site-developer` | Starts the local run, runs the smoke check locally and in CI |

### 1.4 References

- **PRD**: [PRD.md](../../PRD.md)
- **Design**: [DESIGN.md](../../DESIGN.md), section 3.2 (dev run component), section 4.3.4 (development run)
- **Decomposition**: [DECOMPOSITION.md](../../DECOMPOSITION.md), entry 2.8
- **Dependencies**: `cpt-site-feature-template-composition`, `cpt-site-feature-shell-layout-navigation`
- **Code**: `scripts/dev-smoke.mjs`, `site/scripts/dev-all.ts`, `scripts/verify-ui.mjs`, `scripts/design-verify-baseline.mjs`

## 2. Actor Flows (CDSL)

### Start the local run

- [x] `p3` - **ID**: `cpt-site-flow-dev-run-start`

**Actor**: `cpt-site-actor-site-developer`

**Use case**: `cpt-site-usecase-change-screen`

**Success Scenarios**:
- The developer runs `npm run dev`; every composed package is built, the aggregate is generated and the host answers at `http://localhost:5173/` with every remote previewed on the port its package declares.

**Error Scenarios**:
- A package fails to build or the aggregate cannot be generated: the run stops with the failure's message.
- A remote's port is taken: its preview server stops with the port's name and the whole run stops with it.

**Steps**:
1. [x] - `p3` - Discover the composed packages and the port each declares; **IF** there is none, start the host only - `inst-discover`
2. [x] - `p3` - Build every package, several at once (`FRONTX_BUILD_CONCURRENCY`, by default half the cores up to 6), each start announced in one line and each package's output printed whole when it finishes; **IF** one fails, start no more, let the running ones finish and stop the run with the failed package's report - `inst-build-packages`
3. [x] - `p3` - Generate the manifest aggregate from the builds; **IF** the generation fails, stop the run - `inst-generate-manifests`
4. [x] - `p3` - Compose the commands: the host's development server, then a preview of every package with a strict port - `inst-compose-commands`
5. [x] - `p3` - Run every command at once through the site's own `concurrently`, stopping all when one stops, and exit with its exit code - `inst-run-concurrently`
6. [x] - `p3` - **IF** any step fails, print its message without a stack trace and exit with a failure - `inst-report-failure`

### Smoke-check the local run

- [x] `p3` - **ID**: `cpt-site-flow-dev-run-smoke`

**Actor**: `cpt-site-actor-site-developer`

**Use case**: `cpt-site-usecase-change-screen`

**Success Scenarios**:
- The developer or CI runs `npm run dev:smoke`; the host's page and manifest aggregate answer, every remote entry the served aggregate names answers on the ports the composed packages declare, the run is stopped and the command reports how many remote entries answered and how long it took.

**Error Scenarios**:
- A tool the shell runs through `npx` is missing from the site's install, no package is composed, or a development port is taken: the command fails before it starts anything.
- npx prints a download notice, the run stops early, the served aggregate names other ports than the composed packages, or the time limit passes: the command fails, prints the run's last output and stops every process it started.

**Steps**:
1. [x] - `p3` - **IF** a tool of the development path is missing from the site install's executables, **RETURN** an error per tool naming the setup command - `inst-if-tool-missing`
2. [x] - `p3` - Read the composed packages and the port each one's `mfe.json` names; **IF** there is none **RETURN** an error naming the setup command - `inst-read-packages`
3. [x] - `p3` - **IF** the host's port or a package port already accepts connections on localhost, **RETURN** an error naming the ports - `inst-if-port-taken`
4. [x] - `p3` - Start `npm run dev` from the repository root as its own process group, keep the tail of its output and watch the output for an npx download notice and the process for its exit - `inst-start-run`
5. [x] - `p3` - **WHILE** a target has not answered and no error is found - `inst-poll`
   1. [x] - `p3` - **IF** npx printed a download notice, the run stopped, or the time limit passed, record the error and stop polling - `inst-if-run-failed`
   2. [x] - `p3` - **FOR EACH** pending target, check that it answers with the expected content type; for the served aggregate, **IF** its remote entries' ports differ from the composed packages' ports record the error, **ELSE** add every remote entry as a target - `inst-check-targets`
6. [x] - `p3` - Stop the run's process group, first gently, then forcibly after ten seconds - `inst-stop-run`
7. [x] - `p3` - **IF** an error was recorded, print the run's last output; **RETURN** the errors, the elapsed time and the targets that answered - `inst-return-result`
8. [x] - `p3` - Print every error and exit with a failure, or print the count of remote entries that answered and the elapsed time - `inst-report`

### Verify the UI against the baseline

- [x] `p3` - **ID**: `cpt-site-flow-dev-run-verify-ui`

**Actor**: `cpt-site-actor-site-developer`

**Use case**: `cpt-site-usecase-change-screen`

**Success Scenarios**:
- The developer or CI runs `npm run verify:ui` after `npm run build`; the runner sweeps every route at both widths in the light theme and exits with success when every finding is one the baseline carries.

**Error Scenarios**:
- The site has not been assembled (the routes come from the composed screens), or the baseline is missing: the command says what is missing and names the command that makes it (`npm run setup` for the site), and exits with an environment failure.
- A finding the baseline does not carry: the runner reports it as new and exits with a failure. A finding whose only change is a generated React id (`_r_1n_`, the kit's `base-ui-_r_8_`: React numbers elements in render order, which differs between runs) is the baseline's finding, not a new one.

**Steps**:
1. [x] - `p3` - Collect the routes to verify; **IF** that fails, or the baseline is missing while the run uses it, print the reason and exit with an environment failure; **IF** only the routes were asked for, print them and exit - `inst-collect-routes`
2. [x] - `p3` - Run the guardrails' runner in the site with the composed arguments - `inst-run-runner`
3. [x] - `p3` - **IF** the run uses the baseline and the runner reports new findings, compare its report with the baseline reading generated React ids as any id (`cpt-site-algo-dev-run-verify-ui-baseline`); **IF** none is uncarried, exit with success; **ELSE** print each uncarried finding; exit with the runner's exit code - `inst-recheck`

### Build or check the baseline

- [x] `p3` - **ID**: `cpt-site-flow-dev-run-verify-ui-baseline`

**Actor**: `cpt-site-actor-site-developer`

**Use case**: `cpt-site-usecase-change-screen`

**Success Scenarios**:
- After a fix, the developer runs `npm run verify:ui -- --no-baseline`, then `npm run verify:ui:baseline -- build design-verify-report/findings.json`; every finding has a reason and the baseline is written.
- CI or the developer runs `npm run verify:ui:baseline -- check`; every carried finding names the reason its rule gives.

**Error Scenarios**:
- A finding no reason rule knows, or a state without evidence: the build prints each and writes nothing.
- A carried finding without a reason, with a stale reason or with no rule: the check prints each and exits with a failure.

**Steps**:
1. [x] - `p3` - To build, read the report, give its findings their reasons; **IF** a finding is unknown or a state has no evidence, print each and exit with a failure; **ELSE** write the baseline and print its counts - `inst-build-baseline`
2. [x] - `p3` - To check, **IF** the baseline is missing exit with a failure; **ELSE** print every problem of the baseline and exit with a failure when there is one - `inst-check-baseline`

## 3. Processes / Business Logic (CDSL)

### Read what the run must serve

- [x] `p3` - **ID**: `cpt-site-algo-dev-run-read-targets`

**Input**: The repository root; the served manifest aggregate; a chunk of the run's output.

**Output**: The missing tools, the composed packages and their ports, the remote entry addresses, an npx download notice.

**Steps**:
1. [x] - `p3` - List the tools of the development path that the site install's executables folder does not hold - `inst-missing-tools`
2. [x] - `p3` - **FOR EACH** folder of the site's composed packages that holds an `mfe.json`, in name order, read the port of its remote entry - `inst-composed-packages`
3. [x] - `p3` - **FOR EACH** config of the served aggregate, join its remote entry's path and file name and resolve them against its `publicPath` - `inst-remote-entries`
4. [x] - `p3` - **RETURN** the first output line that matches npx's interactive download prompt or its non-interactive download warning - `inst-find-notice`
5. [x] - `p3` - Probe a port on the IPv4 and IPv6 loopback addresses; it is taken when either accepts a connection - `inst-port-in-use`

### Collect the routes to verify

- [x] `p3` - **ID**: `cpt-site-algo-dev-run-verify-ui-routes`

**Input**: The repository root.

**Output**: The routes, in order and without repeats.

**Steps**:
1. [x] - `p3` - **IF** the site is not assembled, fail naming the setup command; **ELSE** build the page map of every composed screen with the site-meta generator, the screens `unpublishedScreens` leaves out of the build included (`npm run dev` serves them), and read every page's address in menu order, the order of `seo-manifest.json` - `inst-read-pages`
2. [x] - `p3` - **FOR EACH** block folder of template-site-blocks that holds a showcase fixture, in name order, add its showcase route (the folder name in kebab case) - `inst-showcase-routes`
3. [x] - `p3` - **RETURN** the pages, the showcase routes and the not-found route - `inst-return-routes`

### Compose the runner's arguments

- [x] `p3` - **ID**: `cpt-site-algo-dev-run-verify-ui-args`

**Input**: The repository root, the routes, the caller's extra flags, whether the run uses the baseline.

**Output**: The runner's arguments.

**Steps**:
1. [x] - `p3` - Take the gate's defaults: the local host URL, `npm run dev:all` started in the site unless the host already answers, waited for up to 15 minutes as `npm run dev:smoke` waits (a first start after a clean install outlasts the runner's 2-minute default), the routes, widths 1440 and 390, the light theme, the report folder - `inst-defaults`
2. [x] - `p3` - **IF** the run uses the baseline, add it and fail on new findings; **RETURN** the defaults followed by the caller's flags, which the runner lets win - `inst-gate`

### Give a finding its baseline reason

- [x] `p3` - **ID**: `cpt-site-algo-dev-run-verify-ui-baseline`

**Input**: A runner report (to build) or the baseline (to check).

**Output**: The baseline with a reason on every finding, the findings no rule knows and the states with no evidence; or the baseline's problems.

**Steps**:
1. [x] - `p3` - For a finding, take the first reason rule whose rule id, route and target patterns match it: a G34 checker false finding (a scrolling code block or table, a flush list card or tile, stacked controls, kit example parts) or a kit defect with its GAPS row (DataTable sort header text, Questionnaire shortcut, inactive TabsTrigger contrast, dark Badge, InputGroup and destructive pairs, the kit examples' accessibility) - `inst-match-rule`
2. [x] - `p3` - **FOR EACH** state of the report: **IF** it produced no evidence, list it; **ELSE** give every finding its reason, with the checker's detail written with the short hyphen, or list it as unknown - `inst-for-each-finding`
3. [x] - `p3` - **RETURN** the states with reasoned findings, the unknown findings and the states without evidence; the build writes the baseline only when both lists are empty - `inst-return-baseline`
4. [x] - `p3` - To check, report every carried finding with no reason, with a reason its rule no longer gives, or that no rule knows any more - `inst-check-reasons`
5. [x] - `p3` - To compare a run with the baseline, match each finding on route, theme, width, rule and target with its generated React ids read as any id, as many times as the baseline carries it; **RETURN** the findings left over - `inst-uncarried`

## 4. States (CDSL)

### No Lifecycle to Model

The run and the smoke check start, wait and stop in one pass; the smoke check's loop is specified in its flow and no entity keeps a lifecycle beyond it.

## 5. Definitions of Done

### One local run with strict ports

- [x] `p3` - **ID**: `cpt-site-dod-dev-run-strict-ports`

The system **MUST** start the host and a preview of every composed package on its declared port from one command, using only tools the site installs, and **MUST** stop the run naming the port when a remote's port is taken.

**Implements**:
- `cpt-site-flow-dev-run-start`

**Touches**:
- API: `npm run dev`
- Entities: Screen MFE package

### A smoke check of the local run

- [x] `p3` - **ID**: `cpt-site-dod-dev-run-smoke-check`

The system **MUST** verify that the local run starts: the host and every remote entry the served aggregate names answer, with no npx download and no taken port, and **MUST** stop every process it started whatever the outcome.

**Implements**:
- `cpt-site-flow-dev-run-smoke`
- `cpt-site-algo-dev-run-read-targets`

**Touches**:
- API: `npm run dev:smoke`
- Entities: Screen MFE package

### A design-defect gate over every page

- [x] `p3` - **ID**: `cpt-site-dod-dev-run-verify-ui`

The system **MUST** sweep every page of the built manifest, every block showcase route and the not-found screen at 1440 and 390 pixels in the light theme with the guardrails' checker, **MUST** fail on any finding the root baseline does not carry, and **MUST** refuse a baseline entry that names no reason or that no reason rule knows.

**Implements**:
- `cpt-site-flow-dev-run-verify-ui`
- `cpt-site-flow-dev-run-verify-ui-baseline`
- `cpt-site-algo-dev-run-verify-ui-routes`
- `cpt-site-algo-dev-run-verify-ui-args`
- `cpt-site-algo-dev-run-verify-ui-baseline`

**Touches**:
- API: `npm run verify:ui`, `npm run verify:ui:baseline`
- Entities: Screen MFE package

## 6. Acceptance Criteria

- [x] `npm run dev:smoke` exits with success on a set-up repository and reports the remote entries that answered (CI runs it).
- [x] The smoke check names every tool missing from the site install, reads each package's port from its `mfe.json`, joins each served `publicPath` with its remote entry file and catches both npx download notices (`scripts/dev-smoke.test.mjs`).
- [x] Every tool of the development path is in the site install and declared in `site/package.json`, so npx never downloads one (`scripts/dev-smoke.test.mjs`).
- [x] A remote whose port is taken stops `npm run dev` with the port's name instead of moving to another port.
- [x] `npm run verify:ui` takes the pages of every composed screen, an unpublished one included, then every block showcase route in name order, then the not-found route, fails with a hint when the site is not assembled, runs the gate with the baseline and `--fail-on-findings` by default and lets the caller's flags win (`scripts/verify-ui.test.mjs`).
- [x] `npm run verify:ui:baseline` gives a known finding its G34 or kit-defect reason, lists a finding no rule knows instead of carrying it, keeps only states with findings, writes the checker's details with the short hyphen, matches a run's findings to the baseline with generated React ids read as any id, and its check fails a finding without a reason, with a stale reason or with no rule (`scripts/design-verify-baseline.test.mjs`).
