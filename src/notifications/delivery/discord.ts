import type { Client, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { config } from "../../config.js";
import { BOT_FOOTER, ROOM_TBA_BASE } from "../../constants.js";
import { log } from "../../log.js";
import { channelIdForCiEvent, ciE2eEmbed } from "../ci-embeds.js";
import { githubActivityEmbed } from "../github-embeds.js";
import type { NotificationEvent, ProposalSubmittedPayload } from "../types.js";

const seenKeys = new Map<string, number>();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

function isDuplicate(key: string | undefined): boolean {
  if (!key) return false;
  const now = Date.now();
  for (const [k, exp] of seenKeys) {
    if (exp < now) seenKeys.delete(k);
  }
  const existing = seenKeys.get(key);
  if (existing && existing > now) return true;
  seenKeys.set(key, now + IDEMPOTENCY_TTL_MS);
  return false;
}

async function sendToChannel(
  client: Client,
  channelId: string | null,
  content: { embeds?: EmbedBuilder[]; content?: string },
): Promise<void> {
  if (!channelId) {
    log("warn", "Discord delivery skipped — channel ID not configured");
    return;
  }
  const channel = await client.channels.fetch(channelId);
  if (!channel?.isTextBased() || channel.isDMBased()) {
    log("warn", `Channel ${channelId} is not a guild text channel`);
    return;
  }
  await (channel as TextChannel).send(content);
}

function proposalSubmittedEmbed(payload: ProposalSubmittedPayload): EmbedBuilder {
  const reviewUrl = `${ROOM_TBA_BASE}/?editor=login`;
  return new EmbedBuilder()
    .setColor(0x7c2d12)
    .setTitle("New contributor proposal")
    .setDescription(
      `**${payload.entityLabel}** (${payload.entityType} #${payload.entityId})`,
    )
    .addFields(
      { name: "Submitted by", value: payload.submitterName, inline: true },
      {
        name: "Anonymous",
        value: payload.isAnonymous ? "Yes" : "No",
        inline: true,
      },
      { name: "Proposal ID", value: String(payload.proposalId), inline: true },
    )
    .setURL(reviewUrl)
    .setFooter({ text: BOT_FOOTER });
}

export async function deliverToDiscord(
  client: Client,
  event: NotificationEvent,
): Promise<void> {
  if (isDuplicate(event.idempotencyKey)) {
    log("debug", `Skipped duplicate event ${event.idempotencyKey}`);
    return;
  }

  switch (event.type) {
    case "proposal.submitted": {
      const payload = event.payload as ProposalSubmittedPayload;
      await sendToChannel(client, config.channelContributorsId, {
        embeds: [proposalSubmittedEmbed(payload)],
      });
      break;
    }
    case "deploy.succeeded":
    case "deploy.failed": {
      const isProd =
        event.payload.environment === "production" ||
        event.payload.target === "production";
      const color = event.type === "deploy.succeeded" ? 0x16a34a : 0xdc2626;
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(
          event.type === "deploy.succeeded" ? "Deploy succeeded" : "Deploy failed",
        )
        .setDescription(
          String(event.payload.url ?? event.payload.name ?? "Vercel deploy"),
        )
        .addFields(
          {
            name: "Project",
            value: String(event.payload.project ?? "unknown"),
            inline: true,
          },
          {
            name: "Branch",
            value: String(event.payload.branch ?? event.payload.gitBranch ?? "—"),
            inline: true,
          },
        )
        .setTimestamp(new Date(event.occurredAt))
        .setFooter({ text: BOT_FOOTER });
      await sendToChannel(
        client,
        config.channelDeploysId ?? config.channelDevelopmentId,
        {
          embeds: [embed],
        },
      );
      if (event.type === "deploy.succeeded" && isProd) {
        await sendToChannel(client, config.channelAnnouncementsId, {
          content: `Production deploy succeeded: ${event.payload.url ?? "room-tba"}`,
        });
      }
      break;
    }
    case "release.published": {
      const embed = new EmbedBuilder()
        .setColor(0x7c2d12)
        .setTitle(`Release: ${event.payload.name ?? "new release"}`)
        .setDescription(String(event.payload.body ?? "").slice(0, 2000))
        .setURL(String(event.payload.htmlUrl ?? config.uplbToolsBaseUrl))
        .setFooter({ text: BOT_FOOTER });
      await sendToChannel(client, config.channelAnnouncementsId, {
        embeds: [embed],
      });
      break;
    }
    case "ci.e2e.failed":
    case "ci.e2e.passed":
    case "ci.e2e.advisory.failed":
    case "ci.staging-e2e.failed":
    case "ci.staging-smoke.failed": {
      const target = channelIdForCiEvent(event.type);
      const channelId =
        target === "deploys"
          ? (config.channelDeploysId ?? config.channelDevelopmentId)
          : config.channelDevelopmentId;
      await sendToChannel(client, channelId, {
        embeds: [ciE2eEmbed(event.type, event.payload, event.occurredAt)],
      });
      break;
    }
    case "github.issue":
    case "github.pull_request":
    case "github.push": {
      await sendToChannel(client, config.channelGithubId, {
        embeds: [githubActivityEmbed(event.type, event.payload, event.occurredAt)],
      });
      break;
    }
    default:
      log("debug", `Unhandled notification type: ${event.type}`);
  }
}
