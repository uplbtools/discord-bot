# UPLB Tools Discord helper bot

Org-level Discord helper for the UPLB Tools server — GitHub slash commands, notification ingress, triage cron, and forum templates. **Not** the Room TBA product bot; **not** the Hermes coding agent ([#448](https://github.com/uplbtools/room-tba/issues/448)).

Static onboarding lives in **channel pins**, not `/start` or `/help` slash commands.

## Stack

- TypeScript, discord.js v14, Express (webhooks + health)
- Bun for dev; Node 20+ on Heroku
- Single **web** dyno: Discord Gateway + HTTP server

## Commands

| Command                                                                | Purpose                                              |
| ---------------------------------------------------------------------- | ---------------------------------------------------- |
| `/issue`, `/prs`, `/good-first-issues`, `/find-issues`, `/draft-issue` | GitHub workflow                                      |
| `/ci`                                                                  | Failed checks on a PR                                |
| `/map`                                                                 | Deep link to Room TBA search                         |
| `/ping`, `/status`                                                     | Health                                               |
| `/triage`, `/deploy-last`                                              | Maintainer                                           |
| `/leaderboard`                                                         | Contributor ranks (Discord-only; needs Room TBA API) |

## Setup

```sh
cp .env.example .env
bun install
bun run check          # biome + typecheck + test + build
bun run register-commands   # needs DISCORD_* set
bun run dev
```

## Heroku

```sh
# Procfile: web: node dist/main.js
heroku config:set DISCORD_TOKEN=... DISCORD_CLIENT_ID=... ...
git push heroku main
bun run register-commands:prod
```

Set `NOTIFICATION_GATEWAY_URL` on Room TBA to `https://<heroku-app>.herokuapp.com/notifications` with matching `NOTIFICATION_INGRESS_SECRET`.

## Docs

- [docs/discord-server-guide.md](docs/discord-server-guide.md) — pin copy for moderators
- [docs/deploy-ops.md](docs/deploy-ops.md) — webhooks and env checklist
- [docs/notifications.md](docs/notifications.md) — `NotificationEvent` contract

## License

MIT
