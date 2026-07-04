# Discord server guide (moderator pins)

Pin these in the appropriate channels: **not** slash commands.

## #welcome

**Welcome to UPLB Tools**

We build open-source campus tools (Room TBA, GradeSim, and more). Pick a path:

- **Using the tools?** React **@User** in `roles-info`, hang out in `#lounge`, ask in **room-tba-help** or **gradesim-help** forums.
- **Contributing?** React **@Contributor** in `roles-info`, read `#contribution`, join `#development`. Use `/issue` and `/good-first-issues` in Discord; PRs go to GitHub.

Not an official UPLB product: volunteer-run.

## #contribution

Contributors: GitHub is source of truth. Before filing, run `/find-issues`. To open an issue, `/draft-issue` (confirm before create). Weekly triage posts Monday 09:00 UTC in `#development`.

Links: https://uplbtools.me · https://github.com/uplbtools · https://room-tba.uplbtools.me

## #development

Bot commands: `/issue`, `/prs`, `/ci`, `/map`, `/status`. Maintainers: `/triage`. Weekly triage cron posts here (Monday 09:00 UTC).

**This channel receives:** GitHub Actions `workflow_run` failures (except E2E/staging-smoke: those have dedicated handlers), Playwright E2E failure summaries from room-tba CI, and triage cron output.

## #github

Live GitHub feed via **uplbtools-discord-bot** (repo webhooks, not the native Discord GitHub app):

- Issues opened/edited/closed/reopened
- Pull requests opened/merged/closed
- Pushes to `main` and `staging` only

## #prs-and-reviews

Pull request review activity: submitted, approved, changes requested, dismissed.

## #deploys

Deploy and staging health:

- Vercel deployment success/failure (room-tba project)
- GitHub `deployment` / `deployment_status` events
- `Staging smoke` CI failures

## #announcements

Ship moments only:

- GitHub **release published** (semantic-release on `main`)
- Production Vercel deploy succeeded

## #bug-triage (security alerts)

Dependabot, CodeQL, and secret scanning alerts from uplbtools repos. Distinct from `#development` workflow noise.

## #contributors

New map edit proposals submitted via room-tba (`proposal.submitted`).

## #test-suite

Running automated test inventory for room-tba:

- Pinned embed stack: summary + one embed per test tier (full file list inline)
- Updates on spec changes to `staging`/`main` and daily 04:00 UTC

Source: room-tba `discord-test-inventory.yml` → bot `ci.test_inventory.updated`.

