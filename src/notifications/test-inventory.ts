import {
  AttachmentBuilder,
  EmbedBuilder,
  type Client,
  type Message,
  type TextChannel,
} from "discord.js";
import { config } from "../config.js";
import { BOT_FOOTER } from "../constants.js";
import { log } from "../log.js";

export type TestInventoryPayload = {
  repo?: string;
  branch?: string;
  commitSha?: string;
  commitUrl?: string;
  docUrl?: string;
  workflowUrl?: string | null;
  generated?: string;
  total?: number;
  unit?: number;
  vitest?: number;
  integration?: number;
  e2eBlocking?: number;
  e2eAdvisory?: number;
  e2eStaging?: number;
  markdown?: string;
};

const INVENTORY_EMBED_TITLE = "Room TBA test inventory";

function str(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function shortSha(sha: unknown): string {
  const s = str(sha, "");
  return s.length >= 7 ? s.slice(0, 7) : s || "—";
}

export function testInventoryEmbed(
  payload: TestInventoryPayload,
  occurredAt: string,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0x2563eb)
    .setTitle(INVENTORY_EMBED_TITLE)
    .setDescription(
      "Live list of automated tests in **room-tba**. Updated when specs change or daily at 04:00 UTC.",
    )
    .addFields(
      { name: "Total spec files", value: str(payload.total), inline: true },
      { name: "Branch", value: str(payload.branch), inline: true },
      { name: "Generated", value: str(payload.generated), inline: true },
      { name: "Unit (Bun)", value: str(payload.unit), inline: true },
      { name: "Vitest", value: str(payload.vitest), inline: true },
      { name: "Integration", value: str(payload.integration), inline: true },
      { name: "E2E blocking", value: str(payload.e2eBlocking), inline: true },
      { name: "E2E advisory", value: str(payload.e2eAdvisory), inline: true },
      { name: "E2E staging", value: str(payload.e2eStaging), inline: true },
      {
        name: "Commit",
        value: payload.commitUrl
          ? `[${shortSha(payload.commitSha)}](${payload.commitUrl})`
          : shortSha(payload.commitSha),
        inline: true,
      },
    )
    .setTimestamp(new Date(occurredAt))
    .setFooter({ text: BOT_FOOTER });

  if (payload.docUrl) {
    embed.setURL(payload.docUrl);
  }
  if (payload.workflowUrl) {
    embed.addFields({
      name: "Workflow",
      value: `[View run](${payload.workflowUrl})`,
      inline: true,
    });
  }

  return embed;
}

async function findInventoryMessage(
  channel: TextChannel,
  client: Client,
): Promise<Message | null> {
  const pinned = await channel.messages.fetchPinned();
  for (const msg of pinned.values()) {
    if (
      msg.author.id === client.user?.id &&
      msg.embeds[0]?.title === INVENTORY_EMBED_TITLE
    ) {
      return msg;
    }
  }

  const recent = await channel.messages.fetch({ limit: 50 });
  for (const msg of recent.values()) {
    if (
      msg.author.id === client.user?.id &&
      msg.embeds[0]?.title === INVENTORY_EMBED_TITLE
    ) {
      return msg;
    }
  }

  return null;
}

export async function deliverTestInventory(
  client: Client,
  payload: TestInventoryPayload,
  occurredAt: string,
): Promise<void> {
  const channelId = config.channelTestSuiteId;
  if (!channelId) {
    log("warn", "Test inventory skipped — CHANNEL_TEST_SUITE_ID not configured");
    return;
  }

  const channel = await client.channels.fetch(channelId);
  if (!channel?.isTextBased() || channel.isDMBased()) {
    log("warn", `Channel ${channelId} is not a guild text channel`);
    return;
  }

  const textChannel = channel as TextChannel;
  const markdown = payload.markdown ?? "# Test inventory\n\n_No markdown payload._\n";
  const attachment = new AttachmentBuilder(Buffer.from(markdown, "utf8"), {
    name: "test-inventory.md",
    description: "Full test file list for room-tba",
  });

  const embed = testInventoryEmbed(payload, occurredAt);
  const content = {
    content: "",
    embeds: [embed],
    files: [attachment],
  };

  const existing = await findInventoryMessage(textChannel, client);
  if (existing) {
    await existing.edit(content);
    log("info", `Updated test inventory message ${existing.id} in #test-suite`);
    return;
  }

  const sent = await textChannel.send(content);
  try {
    await sent.pin();
    log("info", `Posted and pinned test inventory message ${sent.id}`);
  } catch (err) {
    log("warn", `Posted test inventory ${sent.id} but pin failed: ${String(err)}`);
  }
}
