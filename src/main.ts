import { createBotClient, loginBot } from "./bot.js";
import { startCronJobs } from "./cron/index.js";
import { registerForumTemplates } from "./events/threadCreate.js";
import { log } from "./log.js";
import { createServer, startServer } from "./server.js";

async function main() {
  const client = createBotClient();
  registerForumTemplates(client);

  const app = createServer(client);
  startServer(app);
  startCronJobs(client);

  await loginBot(client);
  log("info", "UPLB Tools Discord bot ready");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
