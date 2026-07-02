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
| `GET /health`                   | Uptime checks                  |

Protect with `NOTIFICATION_INGRESS_SECRET`, `VERCEL_WEBHOOK_SECRET`, `GITHUB_WEBHOOK_RELEASE_SECRET`.

## Room TBA env (producer)

```
NOTIFICATION_GATEWAY_URL=https://<bot-host>/notifications
NOTIFICATION_INGRESS_SECRET=<same as bot>
```

## #github channel

Use Discord's GitHub channel webhook (issues + pull requests only). Do **not** duplicate in bot code.

## Register slash commands

After deploy:

```sh
bun run register-commands:prod
```

Or locally against guild:

```sh
DISCORD_GUILD_ID=... bun run register-commands
```
