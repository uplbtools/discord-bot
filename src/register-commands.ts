import "dotenv/config";
import { getConfig, initConfig, loadBotConfigFromEnv } from "./config.js";
import { registerSlashCommands } from "./register-commands-lib.js";

initConfig(loadBotConfigFromEnv());
await registerSlashCommands(getConfig());
