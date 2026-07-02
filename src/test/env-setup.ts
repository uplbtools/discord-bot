process.env.DISCORD_TOKEN ??= "test-discord-token";
process.env.DISCORD_CLIENT_ID ??= "test-client-id";

import { initConfig, loadBotConfigFromEnv } from "../config.js";

initConfig(loadBotConfigFromEnv());
