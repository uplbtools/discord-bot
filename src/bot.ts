import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Collection,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
} from "discord.js";
import { commands } from "./commands/index.js";
import { config } from "./config.js";
import { log } from "./log.js";
import type { BotClient } from "./types.js";

const draftPending = new Map<
  string,
  {
    repo: string;
    title: string;
    body: string;
    userId: string;
    expiresAt: number;
  }
>();

export function createBotClient(): BotClient {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  }) as BotClient;

  client.commands = new Collection(commands.map((cmd) => [cmd.data.name, cmd]));

  client.once(Events.ClientReady, (readyClient) => {
    log("info", `Logged in as ${readyClient.user.tag}`);
    log("info", `Commands: ${[...client.commands.keys()].join(", ")}`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (err) {
        log("error", `${interaction.commandName}: ${String(err)}`);
        const payload = {
          content: "Something went wrong. Try again or ask in #contribution.",
          ephemeral: true,
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      }
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === "draft-issue-modal") {
      const repo = interaction.fields.getTextInputValue("repo");
      const title = interaction.fields.getTextInputValue("title");
      const body = interaction.fields.getTextInputValue("body");
      const token = `${interaction.user.id}:${Date.now()}`;
      draftPending.set(token, {
        repo,
        title,
        body,
        userId: interaction.user.id,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
      const embed = new EmbedBuilder()
        .setTitle("Confirm issue draft")
        .setDescription(`**${title}**\n\n${body.slice(0, 1500)}`)
        .addFields({ name: "Repo", value: repo, inline: true });
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`draft-confirm:${token}`)
          .setLabel("Create issue")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`draft-cancel:${token}`)
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Secondary),
      );
      await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
      });
      return;
    }

    if (interaction.isButton()) {
      const [action, token] = interaction.customId.split(":", 2);
      if (action === "draft-cancel") {
        draftPending.delete(token);
        await interaction.update({
          content: "Cancelled.",
          embeds: [],
          components: [],
        });
        return;
      }
      if (action === "draft-confirm") {
        const pending = draftPending.get(token);
        if (
          !pending ||
          pending.userId !== interaction.user.id ||
          pending.expiresAt < Date.now()
        ) {
          await interaction.update({
            content: "Draft expired. Run `/draft-issue` again.",
            embeds: [],
            components: [],
          });
          return;
        }
        draftPending.delete(token);
        const { createIssue } = await import("./github.js");
        try {
          const issue = await createIssue(pending.repo, pending.title, pending.body);
          await interaction.update({
            content: `Created [#${issue.number}](${issue.html_url})`,
            embeds: [],
            components: [],
          });
        } catch (err) {
          await interaction.update({
            content: `Failed: ${String(err)}`,
            embeds: [],
            components: [],
          });
        }
      }
    }
  });

  return client;
}

export async function loginBot(client: Client): Promise<void> {
  await client.login(config.token);
}
