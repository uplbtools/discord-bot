import type { Server } from "node:http";
import type { Application } from "express";
import { createBotClient, loginBot } from "./bot.js";
import {
  type BotConfig,
  initConfig,
  type LoadBotConfigOptions,
  loadBotConfigFromEnv,
} from "./config.js";
import { startCronJobs } from "./cron/index.js";
import { registerForumTemplates } from "./events/threadCreate.js";
import { log } from "./log.js";
import { registerSlashCommands } from "./register-commands-lib.js";
import { createServer } from "./server.js";
import type { BotClient } from "./types.js";

export type UplbToolsRuntime = {
  config: BotConfig;
  client: BotClient;
  app: Application;
  start: () => Promise<void>;
  stop: () => Promise<void>;
};

export type CreateUplbToolsRuntimeOptions = LoadBotConfigOptions & {
  /** When true (default), listen on config.port. Set false if a host owns HTTP. */
  listen?: boolean;
  /** Full config — skips env loading except when merging with envPrefix + overrides */
  config?: BotConfig;
};

let httpServer: Server | null = null;

export function createUplbToolsRuntime(
  options: CreateUplbToolsRuntimeOptions = {},
): UplbToolsRuntime {
  const botConfig = options.config
    ? initConfig(options.config)
    : initConfig(loadBotConfigFromEnv(options));

  const client = createBotClient();
  registerForumTemplates(client);
  const app = createServer(client);

  const listen = options.listen !== false;

  return {
    config: botConfig,
    client,
    app,
    async start() {
      if (listen) {
        await new Promise<void>((resolve, reject) => {
          httpServer = app.listen(botConfig.port, () => {
            log("info", `HTTP server listening on port ${botConfig.port}`);
            resolve();
          });
          httpServer?.once("error", reject);
        });
      }
      startCronJobs(client);
      await loginBot(client);
      log("info", "UPLB Tools Discord bot ready");
    },
    async stop() {
      await client.destroy();
      if (httpServer) {
        await new Promise<void>((resolve, reject) => {
          httpServer?.close((err) => (err ? reject(err) : resolve()));
        });
        httpServer = null;
      }
    },
  };
}

export type { BotConfig, LoadBotConfigOptions };
export { loadBotConfigFromEnv, registerSlashCommands };
