import type { Client, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { config } from "../../config.js";
import { BOT_FOOTER, ROOM_TBA_BASE } from "../../constants.js";
import { log } from "../../log.js";
import { channelIdForCiEvent, ciE2eEmbed } from "../ci-embeds.js";
import { githubActivityEmbed } from "../github-embeds.js";
import { channelIdForGithubRoute, githubDiscordRoute } from "../github-routing.js";
import type { TestInventoryPayload } from "../test-inventory.js";
import { deliverTestInventory } from "../test-inventory.js";
import type {
  NotificationEvent,
  ProposalReviewedPayload,
  ProposalReviewOutcome,
  ProposalSubmittedPayload,
} from "../types.js";

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

const REVIEW_OUTCOME_META: Record<
  ProposalReviewOutcome,
  { title: string; color: number }
> = {
  approved: { title: "Proposal approved", color: 0x16a34a },
  rejected: { title: "Proposal rejected", color: 0xdc2626 },
  needs_changes: { title: "Changes requested", color: 0xd97706 },
};

function proposalReviewedEmbed(payload: ProposalReviewedPayload): EmbedBuilder {
  const meta = REVIEW_OUTCOME_META[payload.outcome];
  const embed = new EmbedBuilder()
    .setColor(meta.color)
    .setTitle(meta.title)
    .setDescription(
      `**${payload.entityLabel}** (${payload.entityType} #${payload.entityId})`,
    )
    .addFields(
      { name: "Submitted by", value: payload.submitterName, inline: true },
      { name: "Reviewed by", value: payload.reviewedBy, inline: true },
      { name: "Proposal ID", value: String(payload.proposalId), inline: true },
    )
    .setURL(ROOM_TBA_BASE)
    .setFooter({ text: BOT_FOOTER });

  if (payload.adminNote?.trim()) {
    embed.addFields({
      name: "Editor note",
      value: payload.adminNote.trim().slice(0, 1024),
    });
  }

  return embed;
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
    case "proposal.reviewed": {
      const payload = event.payload as ProposalReviewedPayload;
      await sendToChannel(client, config.channelContributorsId, {
        embeds: [proposalReviewedEmbed(payload)],
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
      const route = githubDiscordRoute("release.published");
      const channelId = route
        ? channelIdForGithubRoute(config, route)
        : config.channelAnnouncementsId;
      await sendToChannel(client, channelId, {
        embeds: [githubActivityEmbed(event.type, event.payload, event.occurredAt)],
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
    case "ci.test_inventory.updated": {
      await deliverTestInventory(
        client,
        event.payload as TestInventoryPayload,
        event.occurredAt,
      );
      break;
    }
    case "github.issue":
    case "github.pull_request":
    case "github.push":
    case "github.pull_request_review":
    case "github.workflow_run.failed":
    case "github.dependabot_alert":
    case "github.code_scanning_alert":
    case "github.secret_scanning_alert":
    case "github.deployment":
    case "github.deployment_status": {
      const route = githubDiscordRoute(event.type);
      if (!route) break;
      await sendToChannel(client, channelIdForGithubRoute(config, route), {
        embeds: [githubActivityEmbed(event.type, event.payload, event.occurredAt)],
      });
      break;
    }
    default:
      log("debug", `Unhandled notification type: ${event.type}`);
  }
}
