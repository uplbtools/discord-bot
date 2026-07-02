import type { Client } from "discord.js";
import cron from "node-cron";
import { config } from "../config.js";
import { triageSummary } from "../github.js";
import { log } from "../log.js";
import { fetchLeaderboard, LeaderboardNotReadyError } from "../room-tba.js";
import { BOT_FOOTER } from "../constants.js";
import { EmbedBuilder, TextChannel } from "discord.js";

async function postToChannel(
  client: Client,
  channelId: string | null,
  content: string,
): Promise<void> {
  if (!channelId) return;
  const ch = await client.channels.fetch(channelId);
  if (ch?.isTextBased() && !ch.isDMBased()) {
    await (ch as TextChannel).send(content);
  }
}

export function startCronJobs(client: Client): void {
  if (config.triageCron) {
    cron.schedule(config.triageCron, async () => {
      if (!config.githubToken) return;
      try {
        const summary = await triageSummary();
        await postToChannel(client, config.channelDevelopmentId, summary);
      } catch (err) {
        log("error", `Triage cron failed: ${String(err)}`);
      }
    });
    log("info", `Triage cron scheduled: ${config.triageCron}`);
  }

  if (config.leaderboardDigestCron && config.channelContributorsId) {
    cron.schedule(config.leaderboardDigestCron, async () => {
      try {
        const data = await fetchLeaderboard("month");
        const lines = data.entries
          .slice(0, 10)
          .map(
            (e: {
              rank: number;
              displayName: string;
              contributionCount: number;
            }) =>
              `${e.rank}. **${e.displayName}** — ${e.contributionCount} contributions`,
          );
        const embed = new EmbedBuilder()
          .setTitle("Contributor leaderboard (this month)")
          .setDescription(lines.join("\n") || "No entries yet.")
          .setFooter({ text: BOT_FOOTER });
        const ch = await client.channels.fetch(config.channelContributorsId!);
        if (ch?.isTextBased() && !ch.isDMBased()) {
          await (ch as TextChannel).send({ embeds: [embed] });
        }
      } catch (err) {
        if (!(err instanceof LeaderboardNotReadyError)) {
          log("error", `Leaderboard digest failed: ${String(err)}`);
        }
      }
    });
    log("info", `Leaderboard digest cron: ${config.leaderboardDigestCron}`);
  }
}
