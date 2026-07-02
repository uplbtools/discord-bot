import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";
import { config } from "./config.js";

const rest = new REST({ version: "10" }).setToken(config.token);

const body = commands.map((c) => c.data.toJSON());

if (config.guildId) {
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
    body,
  });
  console.log(`Registered ${body.length} guild commands on ${config.guildId}`);
} else {
  await rest.put(Routes.applicationCommands(config.clientId), { body });
  console.log(`Registered ${body.length} global commands`);
}
