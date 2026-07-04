# Embeddable runtime

This repo supports **two deployment modes** without forking:

| Mode | Entry | Use case |
| --- | --- | --- |
| **Solo Heroku** | `node dist/main.js` | Default: one app, one dyno, one bot |
| **Host import** | `@uplbtools/discord-bot/runtime` | Personal multi-bot host loads UPLB as a library |

Solo deploy is unchanged: `Procfile` → `main.ts` → `createUplbToolsRuntime()`.

## Solo (Heroku / local)

```sh
cp .env.example .env
# DISCORD_TOKEN, DISCORD_CLIENT_ID, …
bun run dev          # src/main.ts
bun run register-commands
```

## Library export

```typescript
import {
  createUplbToolsRuntime,
  loadBotConfigFromEnv,
  registerSlashCommands,
} from "@uplbtools/discord-bot/runtime";

// Option A: env with prefix (multi-bot host)
const runtime = createUplbToolsRuntime({ envPrefix: "UPLB_", listen: false });

// Option B: explicit config
const runtime = createUplbToolsRuntime({
  listen: false,
  config: { token: "…", clientId: "…", /* … */ },
});

await runtime.start();
// … host starts other bots, mounts shared Express if needed …
await runtime.stop();
```

Register slash commands from the host (or a one-off script):

```typescript
await registerSlashCommands(runtime.config);
```

### Package exports

```json
{
  "exports": {
    ".": "./dist/main.js",
    "./runtime": "./dist/runtime.js"
  }
}
```

Install from GitHub in a personal host repo:

```json
{
  "dependencies": {
    "@uplbtools/discord-bot": "github:uplbtools/discord-bot#main"
  }
}
```

## Environment prefixes

When embedded alongside other bots, prefix vars so they do not clash:

```env
UPLB_DISCORD_TOKEN=…
UPLB_DISCORD_CLIENT_ID=…
UPLB_NOTIFICATION_INGRESS_SECRET=…
```

`loadBotConfigFromEnv({ envPrefix: "UPLB_" })` reads prefixed vars first, then falls back to unprefixed `DISCORD_*` for backward compatibility.

## HTTP server

| `listen` | Behavior |
| --- | --- |
| `true` (default) | Runtime binds Express on `PORT` / `config.port` |
| `false` | Host owns HTTP; call `runtime.app` to mount routes on a shared server |

Notification ingress routes live on `runtime.app`:

- `POST /notifications`
- `POST /webhooks/vercel`
- `POST /webhooks/github/release`
- `GET /health`

## Limitations

- **One active config per process**: `initConfig()` sets module-level config used by commands, cron, and webhooks. Running two UPLB instances in one Node process is not supported; use separate processes or solo deploy per bot.
- **Gateway**: each Discord bot still needs its own token and `Client`; a host typically runs one `createUplbToolsRuntime()` per bot (often one process each, or one dyno with a supervisor).

## Related

- [deploy-ops.md](deploy-ops.md): Heroku solo deploy
- [notifications.md](notifications.md): ingress contract
