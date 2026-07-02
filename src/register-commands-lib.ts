import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";
import type { BotConfig } from "./config.js";

export async function registerSlashCommands(botConfig: BotConfig): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(botConfig.token);
  const body = commands.map((c) => c.data.toJSON());

  if (botConfig.guildId) {
    await rest.put(
      Routes.applicationGuildCommands(botConfig.clientId, botConfig.guildId),
      { body },
    );
    console.log(`Registered ${body.length} guild commands on ${botConfig.guildId}`);
  } else {
    await rest.put(Routes.applicationCommands(botConfig.clientId), { body });
    console.log(`Registered ${body.length} global commands`);
  }
}
