# Discord Bot Agent Guide

**Human developers:** start with [README.md](README.md) and [docs/deploy-ops.md](docs/deploy-ops.md).

Org-wide agent defaults: see [room-tba/AGENTS.md](https://github.com/uplbtools/room-tba/blob/main/AGENTS.md). This file tailors that playbook to **discord-bot**.

## Doc map

| When | Read |
| --- | --- |
| Local dev, scripts | [README.md](README.md) |
| Heroku deploy, env checklist | [docs/deploy-ops.md](docs/deploy-ops.md) |
| Notification ingress from Room TBA | [docs/notifications.md](docs/notifications.md) |
| Embeddable runtime / multi-bot host | [docs/embeddable-runtime.md](docs/embeddable-runtime.md) |
| Server pin copy for moderators | [docs/discord-server-guide.md](docs/discord-server-guide.md) |
| Room TBA map deep links | `/map` command → `room-tba.uplbtools.me` |

## Stack

- **Runtime:** TypeScript, **discord.js v14**, Express (webhooks + health)
- **Package manager:** Bun for dev; **Node 20+** on Heroku (`Procfile`: `web: node dist/main.js`)
- **Lint/format:** Biome
- **Tests:** Bun test (`src/test/env-setup.ts` preload)
- **Build:** `tsc` → `dist/`

Single **web** dyno runs Discord Gateway + HTTP server. This is the **org helper bot**, not the Room TBA product bot ([#448](https://github.com/uplbtools/room-tba/issues/448)).

## Branches and deploy

- **Default branch:** `main` → **`git push heroku main`** for production
- Feature work: branch → PR to `main` → merge → redeploy Heroku
- No `staging` branch; use a Heroku **review app** or local `bun run dev` before prod deploy
- After deploy: `bun run register-commands:prod` when slash commands change

### Cross-repo env contract (Room TBA)

Room TBA posts to this bot when configured:

- `NOTIFICATION_GATEWAY_URL` → `https://<heroku-app>.herokuapp.com/notifications`
- `NOTIFICATION_INGRESS_SECRET` must match on both repos

Do not paste secrets into issues or PRs.

## Verify before done

| Step | When |
| --- | --- |
| `bun run check` | Always before commit/PR (biome + typecheck + test + build) |
| `bun run register-commands` | When adding or changing slash commands (local guild first) |
| Manual Discord | Exercise changed commands in a test channel |

CI (`.github/workflows/ci.yml`) runs on push/PR to `main`: same as `bun run check`.

## Architecture (short)

- `src/main.ts`: entry, Gateway + Express
- `src/runtime.ts`: embeddable export for multi-bot hosts
- `src/register-commands.ts`: Discord application command registration
- Slash commands: GitHub workflow (`/issue`, `/prs`, …), triage (`/triage`, `/deploy-last`), `/map` deep links

## Bot UX rules

- **No decorative animations** in embeds or responses: calm, informational replies only
- Static onboarding lives in **channel pins**, not `/help` spam
- Error messages should name the failing resource (PR number, repo, check name)

## Commits

- **Conventional Commits** preferred: `feat(commands): …`, `fix(webhook): …`, `docs: …`
- One logical unit per commit; GPG-sign if the repo uses signed commits

## Security

- Never commit `.env` or Discord tokens
- Validate notification ingress with `NOTIFICATION_INGRESS_SECRET`
- Dependabot / dependency review when enabled: do not disable without replacement
