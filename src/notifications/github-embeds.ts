import { EmbedBuilder } from "discord.js";
import { BOT_FOOTER } from "../constants.js";
import type { NotificationEvent } from "./types.js";

function actionLabel(action: string, merged?: boolean): string {
  if (action === "closed" && merged) return "merged";
  return action.replace(/_/g, " ");
}

function linkField(
  name: string,
  url: unknown,
): { name: string; value: string; inline: boolean } | null {
  const u = String(url ?? "");
  if (!u.startsWith("http")) return null;
  return { name, value: u, inline: false };
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
  const htmlUrl = String(
    payload.htmlUrl ??
      payload.compareUrl ??
      payload.workflowUrl ??
      payload.targetUrl ??
      payload.prUrl ??
      payload.reviewUrl ??
      "",
  );
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
        payload.merged === true
          ? 0x16a34a
          : payload.action === "closed"
            ? 0x6b7280
            : 0x1d4ed8;
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
    case "github.pull_request_review": {
      const state = String(payload.reviewState ?? "review");
      const color =
        state === "approved"
          ? 0x16a34a
          : state === "changes_requested"
            ? 0xdc2626
            : 0x1d4ed8;
      embed
        .setColor(color)
        .setTitle(`PR review ${state.replace(/_/g, " ")}: #${payload.prNumber}`)
        .setDescription(String(payload.prTitle ?? ""))
        .addFields(
          { name: "Repo", value: repo, inline: true },
          { name: "Reviewer", value: String(payload.reviewer ?? "—"), inline: true },
        );
      if (payload.bodyPreview) {
        embed.addFields({
          name: "Comment",
          value: String(payload.bodyPreview).slice(0, 300),
          inline: false,
        });
      }
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
    case "github.workflow_run.failed": {
      embed
        .setColor(0xdc2626)
        .setTitle(`Workflow failed: ${payload.workflow}`)
        .setDescription(
          `\`${payload.branch ?? "?"}\` @ \`${payload.commitSha ?? "?"}\``,
        )
        .addFields(
          { name: "Repo", value: repo, inline: true },
          { name: "Trigger", value: String(payload.trigger ?? "—"), inline: true },
          {
            name: "Run",
            value: payload.runNumber ? `#${payload.runNumber}` : "—",
            inline: true,
          },
        );
      break;
    }
    case "release.published": {
      embed
        .setColor(0x7c2d12)
        .setTitle(`Release: ${payload.name ?? "new release"}`)
        .setDescription(String(payload.body ?? "").slice(0, 2000))
        .addFields({ name: "Repo", value: repo, inline: true });
      break;
    }
    case "github.dependabot_alert": {
      const action = String(payload.action ?? "");
      const color = action === "fixed" ? 0x16a34a : 0xf59e0b;
      embed
        .setColor(color)
        .setTitle(`Dependabot ${action}: ${payload.package}`)
        .setDescription(String(payload.summary ?? "").slice(0, 500))
        .addFields(
          { name: "Repo", value: repo, inline: true },
          { name: "Severity", value: String(payload.severity ?? "—"), inline: true },
        );
      if (payload.ghsaId) {
        embed.addFields({ name: "GHSA", value: String(payload.ghsaId), inline: true });
      }
      break;
    }
    case "github.code_scanning_alert": {
      const action = String(payload.action ?? "");
      const color = action === "fixed" ? 0x16a34a : 0xdc2626;
      embed
        .setColor(color)
        .setTitle(`Code scanning ${action}`)
        .setDescription(String(payload.summary ?? payload.rule ?? "Alert"))
        .addFields(
          { name: "Repo", value: repo, inline: true },
          { name: "Severity", value: String(payload.severity ?? "—"), inline: true },
          { name: "Tool", value: String(payload.tool ?? "—"), inline: true },
        );
      break;
    }
    case "github.secret_scanning_alert": {
      const action = String(payload.action ?? "");
      const color =
        action === "publicly_leaked" || action === "created" ? 0xdc2626 : 0x16a34a;
      embed
        .setColor(color)
        .setTitle(`Secret scanning ${action.replace(/_/g, " ")}`)
        .setDescription(String(payload.secretType ?? "Secret detected"))
        .addFields(
          { name: "Repo", value: repo, inline: true },
          { name: "Validity", value: String(payload.validity ?? "—"), inline: true },
        );
      if (payload.resolution) {
        embed.addFields({
          name: "Resolution",
          value: String(payload.resolution),
          inline: false,
        });
      }
      break;
    }
    case "github.deployment": {
      embed
        .setColor(0x1d4ed8)
        .setTitle(`Deployment started: ${payload.environment ?? "environment"}`)
        .setDescription(String(payload.description ?? "").slice(0, 200) || repo)
        .addFields(
          { name: "Repo", value: repo, inline: true },
          { name: "Ref", value: `\`${payload.ref ?? "?"}\``, inline: true },
          { name: "SHA", value: `\`${payload.sha ?? "?"}\``, inline: true },
        );
      break;
    }
    case "github.deployment_status": {
      const state = String(payload.state ?? "");
      const color =
        state === "success"
          ? 0x16a34a
          : state === "failure" || state === "error"
            ? 0xdc2626
            : 0x6b7280;
      embed
        .setColor(color)
        .setTitle(`Deployment ${state}: ${payload.environment ?? "environment"}`)
        .setDescription(String(payload.description ?? "").slice(0, 200) || repo)
        .addFields(
          { name: "Repo", value: repo, inline: true },
          { name: "Ref", value: `\`${payload.ref ?? "?"}\``, inline: true },
          { name: "SHA", value: `\`${payload.sha ?? "?"}\``, inline: true },
        );
      const target = linkField("Target", payload.targetUrl);
      if (target) embed.addFields(target);
      break;
    }
    default:
      embed.setColor(0x6b7280).setTitle("GitHub activity").setDescription(repo);
  }

  return embed;
}
