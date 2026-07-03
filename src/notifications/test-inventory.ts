import {
  EmbedBuilder,
  type Client,
  type Message,
  type TextChannel,
} from "discord.js";
import { config } from "../config.js";
import { BOT_FOOTER } from "../constants.js";
import { log } from "../log.js";

export type TestInventoryTierFiles = {
  unit?: string[];
  store?: string[];
  component?: string[];
  integration?: string[];
  e2eBlockingSmoke?: string[];
  e2eBlockingBrowse?: string[];
  e2eBlockingAdmin?: string[];
  e2eAdvisory?: string[];
  e2eStaging?: string[];
};

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
  /** @deprecated Prefer `tiers` — kept for older CI payloads */
  markdown?: string;
  tiers?: TestInventoryTierFiles;
};

export const INVENTORY_EMBED_TITLE = "Room TBA test inventory";
const MAX_EMBED_DESCRIPTION = 4000;
const MAX_EMBEDS_PER_MESSAGE = 10;

function str(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function shortSha(sha: unknown): string {
  const s = str(sha, "");
  return s.length >= 7 ? s.slice(0, 7) : s || "—";
}

function formatFileLines(files: string[]): string[] {
  if (files.length === 0) return ["_None_"];
  return files.map((f) => `\`${f}\``);
}

/** Split a file list across one or more embed descriptions (4096 char limit). */
export function tierFileEmbeds(
  titleBase: string,
  files: string[],
  color: number,
): EmbedBuilder[] {
  const lines = formatFileLines(files);
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentLen = 0;

  for (const line of lines) {
    const add = line.length + 1;
    if (currentLen + add > MAX_EMBED_DESCRIPTION && current.length > 0) {
      chunks.push(current);
      current = [];
      currentLen = 0;
    }
    current.push(line);
    currentLen += add;
  }
  if (current.length > 0) chunks.push(current);

  const partCount = chunks.length;
  return chunks.map((chunk, index) => {
    const title =
      partCount > 1
        ? `${titleBase} (${index + 1}/${partCount})`
        : titleBase;
    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(chunk.join("\n"));
  });
}

export function testInventorySummaryEmbed(
  payload: TestInventoryPayload,
  occurredAt: string,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0x2563eb)
    .setTitle(INVENTORY_EMBED_TITLE)
    .setDescription(
      "Live list of automated tests in **room-tba**. Updated when specs change or daily at 04:00 UTC. Full file list in the embeds below.",
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

/** @deprecated Use testInventorySummaryEmbed */
export function testInventoryEmbed(
  payload: TestInventoryPayload,
  occurredAt: string,
): EmbedBuilder {
  return testInventorySummaryEmbed(payload, occurredAt);
}

function tiersFromPayload(payload: TestInventoryPayload): TestInventoryTierFiles {
  return (
    payload.tiers ?? {
      unit: [],
      store: [],
      component: [],
      integration: [],
      e2eBlockingSmoke: [],
      e2eBlockingBrowse: [],
      e2eBlockingAdmin: [],
      e2eAdvisory: [],
      e2eStaging: [],
    }
  );
}

export function buildTestInventoryEmbeds(
  payload: TestInventoryPayload,
  occurredAt: string,
): EmbedBuilder[] {
  const tiers = tiersFromPayload(payload);
  const blocking = {
    smoke: tiers.e2eBlockingSmoke ?? [],
    browse: tiers.e2eBlockingBrowse ?? [],
    admin: tiers.e2eBlockingAdmin ?? [],
    other: [] as string[],
  };

  const sections: { title: string; files: string[]; color: number }[] = [
    {
      title: `Unit tests (Bun) — ${(tiers.unit ?? []).length} files`,
      files: tiers.unit ?? [],
      color: 0x16a34a,
    },
    {
      title: `Store tests (Vitest) — ${(tiers.store ?? []).length} files`,
      files: tiers.store ?? [],
      color: 0x9333ea,
    },
    {
      title: `Component tests (Vitest) — ${(tiers.component ?? []).length} files`,
      files: tiers.component ?? [],
      color: 0x7c3aed,
    },
    {
      title: `Integration — ${(tiers.integration ?? []).length} files`,
      files: tiers.integration ?? [],
      color: 0x0891b2,
    },
    {
      title: `E2E blocking — smoke (${blocking.smoke.length})`,
      files: blocking.smoke,
      color: 0xdc2626,
    },
    {
      title: `E2E blocking — browse (${blocking.browse.length})`,
      files: blocking.browse,
      color: 0xea580c,
    },
    {
      title: `E2E blocking — admin (${blocking.admin.length})`,
      files: blocking.admin,
      color: 0xc2410c,
    },
    {
      title: `E2E advisory — ${(tiers.e2eAdvisory ?? []).length} files`,
      files: tiers.e2eAdvisory ?? [],
      color: 0xf59e0b,
    },
    {
      title: `E2E staging — ${(tiers.e2eStaging ?? []).length} files`,
      files: tiers.e2eStaging ?? [],
      color: 0x64748b,
    },
  ];

  if (blocking.other.length > 0) {
    sections.splice(7, 0, {
      title: `E2E blocking — other (${blocking.other.length})`,
      files: blocking.other,
      color: 0xb91c1c,
    });
  }

  const embeds: EmbedBuilder[] = [
    testInventorySummaryEmbed(payload, occurredAt),
  ];

  for (const section of sections) {
    embeds.push(...tierFileEmbeds(section.title, section.files, section.color));
    if (embeds.length >= MAX_EMBEDS_PER_MESSAGE) break;
  }

  if (embeds.length > MAX_EMBEDS_PER_MESSAGE) {
    return embeds.slice(0, MAX_EMBEDS_PER_MESSAGE);
  }

  return embeds;
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
  const embeds = buildTestInventoryEmbeds(payload, occurredAt);
  const content = {
    content: "",
    embeds,
    files: [] as [],
    attachments: [] as [],
  };

  const existing = await findInventoryMessage(textChannel, client);
  if (existing) {
    await existing.edit(content);
    log(
      "info",
      `Updated test inventory (${embeds.length} embeds) message ${existing.id} in #test-suite`,
    );
    return;
  }

  const sent = await textChannel.send(content);
  try {
    await sent.pin();
    log(
      "info",
      `Posted and pinned test inventory (${embeds.length} embeds) message ${sent.id}`,
    );
  } catch (err) {
    log("warn", `Posted test inventory ${sent.id} but pin failed: ${String(err)}`);
  }
}
