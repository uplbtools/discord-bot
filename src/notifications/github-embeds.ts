import { EmbedBuilder } from "discord.js";
import { BOT_FOOTER } from "../constants.js";
import type { NotificationEvent } from "./types.js";

function actionLabel(action: string, merged?: boolean): string {
  if (action === "closed" && merged) return "merged";
  return action.replace(/_/g, " ");
}

export function githubActivityEmbed(
  type: NotificationEvent["type"],
  payload: Record<string, unknown>,
  occurredAt: string,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTimestamp(new Date(occurredAt))
    .setFooter({ text: BOT_FOOTER });

  const repo = String(payload.repo ?? "unknown");
  const htmlUrl = String(payload.htmlUrl ?? payload.compareUrl ?? "");
  if (htmlUrl.startsWith("http")) embed.setURL(htmlUrl);

  switch (type) {
    case "github.issue": {
      const action = actionLabel(String(payload.action ?? ""));
      embed
        .setColor(payload.action === "closed" ? 0x6b7280 : 0x7c2d12)
        .setTitle(`Issue ${action}: #${payload.number}`)
        .setDescription(String(payload.title ?? ""))
        .addFields(
          { name: "Repo", value: repo, inline: true },
          { name: "Author", value: String(payload.author ?? "—"), inline: true },
        );
      break;
    }
    case "github.pull_request": {
      const action = actionLabel(String(payload.action ?? ""), payload.merged === true);
      const color =
        payload.merged === true ? 0x16a34a : payload.action === "closed" ? 0x6b7280 : 0x1d4ed8;
      embed
        .setColor(color)
        .setTitle(`PR ${action}: #${payload.number}`)
        .setDescription(String(payload.title ?? ""))
        .addFields(
          { name: "Repo", value: repo, inline: true },
          { name: "Author", value: String(payload.author ?? "—"), inline: true },
          {
            name: "Branch",
            value: `\`${payload.headRef ?? "?"}\` → \`${payload.baseRef ?? "?"}\``,
            inline: false,
          },
        );
      break;
    }
    case "github.push": {
      embed
        .setColor(0x4b5563)
        .setTitle(`Push to ${payload.branch}`)
        .setDescription(String(payload.latestMessage ?? "").slice(0, 200))
        .addFields(
          { name: "Repo", value: repo, inline: true },
          { name: "Commits", value: String(payload.commitCount ?? 0), inline: true },
          { name: "Head", value: `\`${payload.headSha ?? "?"}\``, inline: true },
          { name: "Pusher", value: String(payload.pusher ?? "—"), inline: true },
        );
      break;
    }
    default:
      embed.setColor(0x6b7280).setTitle("GitHub activity").setDescription(repo);
  }

  return embed;
}
