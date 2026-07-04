# Deploy ops

## Heroku web dyno

- `web: node dist/main.js`: must stay always-on for Gateway + webhooks
- `PORT` set by Heroku automatically

## Webhook endpoints

| Path | Source |
| ------------------------------- | ------------------------------ |
| `POST /notifications` | Room TBA `NotificationAdapter` + CI (`ci.test_inventory.updated`, E2E) |
| `POST /webhooks/vercel` | Vercel deploy notifications |
| `POST /webhooks/github/release` | GitHub release published |
| `POST /webhooks/github/repo` | GitHub issues, PRs, pushes |
| `GET /health` | Uptime checks |

Protect with `NOTIFICATION_INGRESS_SECRET`, `VERCEL_WEBHOOK_SECRET`, `GITHUB_WEBHOOK_RELEASE_SECRET`, `GITHUB_WEBHOOK_REPO_SECRET`.

Solo deploy uses `node dist/main.js`. For embedding in a personal multi-bot host, see [embeddable-runtime.md](embeddable-runtime.md).

## Room TBA env (producer)

```
NOTIFICATION_GATEWAY_URL=https://<bot-host>/notifications
NOTIFICATION_INGRESS_SECRET=<same as bot>
```

## #github channel

Per-repo GitHub webhooks POST to `/webhooks/github/repo`:

| Event | Channel |
| --- | --- |
| issues, pull_request, push (`main`/`staging`) | `#github` |
| pull_request_review | `#prs-and-reviews` |
| workflow_run (failure, non-E2E) | `#development` |
| release (published) | `#announcements` |
| dependabot / code scanning / secret scanning | `#security` or `#bug-triage` |
| deployment, deployment_status | `#deploys` |

E2E Playwright workflows are skipped here (handled by room-tba `discord-notify-e2e.yml`).

Register on all org repos:

```sh
export GITHUB_WEBHOOK_REPO_SECRET='…'  # same as Heroku
bash scripts/setup-github-webhooks.sh
```

Set `CHANNEL_GITHUB_ID` on Heroku to the `#github` channel snowflake.

Releases still use `/webhooks/github/release` → `#announcements` (do not also subscribe releases on `#github`).

## Register slash commands

After deploy:

```sh
bun run register-commands:prod
```

Or locally against guild:

```sh
DISCORD_GUILD_ID=... bun run register-commands
```
