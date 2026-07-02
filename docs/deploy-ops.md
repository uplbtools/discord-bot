# Deploy ops

## Heroku web dyno

- `web: node dist/main.js` — must stay always-on for Gateway + webhooks
- `PORT` set by Heroku automatically

## Webhook endpoints

| Path                            | Source                         |
| ------------------------------- | ------------------------------ |
| `POST /notifications`           | Room TBA `NotificationAdapter` |
| `POST /webhooks/vercel`         | Vercel deploy notifications    |
| `POST /webhooks/github/release` | GitHub release published       |
| `POST /webhooks/github/repo`    | GitHub issues, PRs, pushes      |
| `GET /health`                   | Uptime checks                  |

Protect with `NOTIFICATION_INGRESS_SECRET`, `VERCEL_WEBHOOK_SECRET`, `GITHUB_WEBHOOK_RELEASE_SECRET`, `GITHUB_WEBHOOK_REPO_SECRET`.

Solo deploy uses `node dist/main.js`. For embedding in a personal multi-bot host, see [embeddable-runtime.md](embeddable-runtime.md).

## Room TBA env (producer)

```
NOTIFICATION_GATEWAY_URL=https://<bot-host>/notifications
NOTIFICATION_INGRESS_SECRET=<same as bot>
```

## #github channel

Per-repo GitHub webhooks POST to `/webhooks/github/repo` (issues, pull requests, pushes on `main`/`staging` only).

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
