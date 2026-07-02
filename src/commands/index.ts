import {
  ActionRowBuilder,
  EmbedBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { requireMaintainer } from "../auth/maintainer.js";
import {
  BOT_FOOTER,
  DEFAULT_REPO,
  KNOWN_REPOS,
  ROOM_TBA_BASE,
  UPLB_TOOLS_BASE,
} from "../constants.js";
import {
  getIssue,
  getPull,
  GitHubError,
  listCheckRunsForRef,
  listGoodFirstIssues,
  listOpenPrsToStaging,
  searchIssues,
  triageSummary,
} from "../github.js";
import {
  fetchLeaderboard,
  headStatus,
  LeaderboardNotReadyError,
} from "../room-tba.js";
import { getLastDeployEvent } from "../deploy-cache.js";
import type { SlashCommand } from "../types.js";

function repoChoices() {
  return KNOWN_REPOS.map((r) => ({ name: r, value: r }));
}

async function replyGitHubMissing(interaction: {
  reply: (o: object) => Promise<unknown>;
}): Promise<boolean> {
  const { config } = await import("../config.js");
  if (config.githubToken) return true;
  await interaction.reply({
    content: "GitHub integration is not configured (`GITHUB_TOKEN`).",
    ephemeral: true,
  });
  return false;
}

export const issueCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("issue")
    .setDescription("Show a GitHub issue")
    .addIntegerOption((o) =>
      o.setName("number").setDescription("Issue number").setRequired(true),
    )
    .addStringOption((o) =>
      o
        .setName("repo")
        .setDescription("Repository")
        .addChoices(...repoChoices()),
    ),

  async execute(interaction) {
    if (!(await replyGitHubMissing(interaction))) return;
    await interaction.deferReply({ ephemeral: true });
    const repo = interaction.options.getString("repo") ?? DEFAULT_REPO;
    const number = interaction.options.getInteger("number", true);
    try {
      const issue = await getIssue(repo, number);
      const labels = issue.labels.map((l) => l.name).join(", ") || "none";
      const embed = new EmbedBuilder()
        .setTitle(`#${issue.number} ${issue.title}`)
        .setURL(issue.html_url)
        .addFields(
          { name: "State", value: issue.state, inline: true },
          {
            name: "Author",
            value: issue.user?.login ?? "unknown",
            inline: true,
          },
          { name: "Labels", value: labels, inline: false },
        )
        .setDescription((issue.body ?? "").slice(0, 500))
        .setFooter({ text: BOT_FOOTER });
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      const msg = err instanceof GitHubError ? err.message : String(err);
      await interaction.editReply({ content: `Could not fetch issue: ${msg}` });
    }
  },
};

export const prsCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("prs")
    .setDescription("Open pull requests targeting staging")
    .addStringOption((o) =>
      o
        .setName("repo")
        .setDescription("Repository")
        .addChoices(...repoChoices()),
    ),

  async execute(interaction) {
    if (!(await replyGitHubMissing(interaction))) return;
    await interaction.deferReply({ ephemeral: true });
    const repo = interaction.options.getString("repo") ?? DEFAULT_REPO;
    try {
      const prs = await listOpenPrsToStaging(repo);
      if (prs.length === 0) {
        await interaction.editReply({ content: "No open PRs to staging." });
        return;
      }
      const lines = prs.map(
        (p) =>
          `[#${p.number}](${p.html_url}) ${p.title}${p.draft ? " _(draft)_" : ""} — \`${p.head.ref}\``,
      );
      await interaction.editReply({
        content: `**Open PRs → staging (${repo})**\n${lines.join("\n")}`,
      });
    } catch (err) {
      await interaction.editReply({ content: `Error: ${String(err)}` });
    }
  },
};

export const goodFirstIssuesCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("good-first-issues")
    .setDescription("List good first issues")
    .addStringOption((o) =>
      o
        .setName("repo")
        .setDescription("Repository")
        .addChoices(...repoChoices()),
    ),

  async execute(interaction) {
    if (!(await replyGitHubMissing(interaction))) return;
    await interaction.deferReply({ ephemeral: true });
    const repo = interaction.options.getString("repo") ?? DEFAULT_REPO;
    try {
      const issues = await listGoodFirstIssues(repo);
      if (issues.length === 0) {
        await interaction.editReply({
          content: "No good first issues right now.",
        });
        return;
      }
      const lines = issues.map(
        (i) => `[#${i.number}](${i.html_url}) ${i.title}`,
      );
      await interaction.editReply({
        content: `**Good first issues (${repo})**\n${lines.join("\n")}`,
      });
    } catch (err) {
      await interaction.editReply({ content: `Error: ${String(err)}` });
    }
  },
};

export const findIssuesCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("find-issues")
    .setDescription("Search open issues before filing a duplicate")
    .addStringOption((o) =>
      o.setName("query").setDescription("Search terms").setRequired(true),
    )
    .addStringOption((o) =>
      o
        .setName("repo")
        .setDescription("Limit to repo")
        .addChoices(...repoChoices()),
    ),

  async execute(interaction) {
    if (!(await replyGitHubMissing(interaction))) return;
    await interaction.deferReply({ ephemeral: true });
    const query = interaction.options.getString("query", true);
    const repo = interaction.options.getString("repo") ?? undefined;
    try {
      const issues = await searchIssues(query, repo);
      if (issues.length === 0) {
        await interaction.editReply({
          content: `No open issues matched "${query}". Consider \`/draft-issue\` if it's new.`,
        });
        return;
      }
      const lines = issues.map(
        (i) => `[#${i.number}](${i.html_url}) ${i.title}`,
      );
      await interaction.editReply({
        content: `**Matches for "${query}"**\n${lines.join("\n")}\n\nCheck these before opening a duplicate.`,
      });
    } catch (err) {
      await interaction.editReply({ content: `Error: ${String(err)}` });
    }
  },
};

export const draftIssueCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("draft-issue")
    .setDescription("Draft a GitHub issue (confirm before create)"),

  async execute(interaction) {
    if (!(await replyGitHubMissing(interaction))) return;
    const modal = new ModalBuilder()
      .setCustomId("draft-issue-modal")
      .setTitle("Draft GitHub issue");
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("repo")
          .setLabel("Repo (room-tba, discord-bot, …)")
          .setStyle(TextInputStyle.Short)
          .setValue(DEFAULT_REPO)
          .setRequired(true),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("title")
          .setLabel("Title")
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("body")
          .setLabel("Body")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true),
      ),
    );
    await interaction.showModal(modal);
  },
};

export const ciCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ci")
    .setDescription("Failed CI checks for a pull request")
    .addIntegerOption((o) =>
      o.setName("pr").setDescription("PR number").setRequired(true),
    )
    .addStringOption((o) =>
      o
        .setName("repo")
        .setDescription("Repository")
        .addChoices(...repoChoices()),
    ),

  async execute(interaction) {
    if (!(await replyGitHubMissing(interaction))) return;
    await interaction.deferReply({ ephemeral: true });
    const repo = interaction.options.getString("repo") ?? DEFAULT_REPO;
    const prNum = interaction.options.getInteger("pr", true);
    try {
      const pr = await getPull(repo, prNum);
      const runs = await listCheckRunsForRef(repo, pr.head.ref);
      const failed = runs.filter(
        (r) => r.conclusion === "failure" || r.conclusion === "timed_out",
      );
      if (failed.length === 0) {
        await interaction.editReply({
          content: `No failed check runs on \`${pr.head.ref}\` (or checks still pending).`,
        });
        return;
      }
      const lines = failed.map(
        (r) => `• [${r.name}](${r.html_url}) — ${r.conclusion}`,
      );
      await interaction.editReply({
        content: `**Failed checks for PR #${prNum}**\n${lines.join("\n")}`,
      });
    } catch (err) {
      await interaction.editReply({ content: `Error: ${String(err)}` });
    }
  },
};

export const mapCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("map")
    .setDescription("Deep link to Room TBA search")
    .addStringOption((o) =>
      o
        .setName("query")
        .setDescription("Room code or search term")
        .setRequired(true),
    ),

  async execute(interaction) {
    const query = interaction.options.getString("query", true);
    const url = `${ROOM_TBA_BASE}/?q=${encodeURIComponent(query)}`;
    await interaction.reply({
      content: `[Open Room TBA search](${url})`,
      ephemeral: true,
    });
  },
};

export const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Bot latency"),

  async execute(interaction) {
    const sent = Date.now();
    await interaction.reply({ content: "Pong…", ephemeral: true });
    const latency = Date.now() - sent;
    await interaction.editReply({
      content: `Pong — ${latency}ms (WS: ${interaction.client.ws.ping}ms)`,
    });
  },
};

export const statusCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("HEAD check Room TBA and uplbtools.me"),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const [roomTba, site] = await Promise.all([
      headStatus(ROOM_TBA_BASE),
      headStatus(UPLB_TOOLS_BASE),
    ]);
    await interaction.editReply({
      content: `**Status**\n• Room TBA: HTTP ${roomTba}\n• uplbtools.me: HTTP ${site}`,
    });
  },
};

export const triageCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("triage")
    .setDescription("On-demand triage summary (maintainer)"),

  async execute(interaction) {
    if (!(await requireMaintainer(interaction))) return;
    if (!(await replyGitHubMissing(interaction))) return;
    await interaction.deferReply({ ephemeral: true });
    try {
      const summary = await triageSummary();
      await interaction.editReply({ content: summary });
    } catch (err) {
      await interaction.editReply({ content: `Error: ${String(err)}` });
    }
  },
};

export const deployLastCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("deploy-last")
    .setDescription("Last deploy event from webhook cache (maintainer)"),

  async execute(interaction) {
    if (!(await requireMaintainer(interaction))) return;
    const last = getLastDeployEvent();
    if (!last) {
      await interaction.reply({
        content: "No deploy events cached yet.",
        ephemeral: true,
      });
      return;
    }
    await interaction.reply({
      content: `**${last.type}** at ${last.occurredAt}\n${JSON.stringify(last.payload, null, 2).slice(0, 1500)}`,
      ephemeral: true,
    });
  },
};

export const leaderboardCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Top contributors (Discord-only leaderboard)")
    .addStringOption((o) =>
      o
        .setName("window")
        .setDescription("Time window")
        .addChoices(
          { name: "This month", value: "month" },
          { name: "This semester", value: "semester" },
          { name: "All time", value: "all" },
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const window = (interaction.options.getString("window") ?? "month") as
      "month" | "semester" | "all";
    try {
      const data = await fetchLeaderboard(window);
      const lines = data.entries
        .slice(0, 15)
        .map((e) => `${e.rank}. **${e.displayName}** — ${e.contributionCount}`);
      const embed = new EmbedBuilder()
        .setTitle(`Contributor leaderboard (${window})`)
        .setDescription(lines.join("\n") || "No entries yet.")
        .setFooter({ text: BOT_FOOTER });
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      if (err instanceof LeaderboardNotReadyError) {
        await interaction.editReply({
          content:
            "Leaderboard is not live yet — contributor accounts and the Room TBA API are still in progress. Watch #contributors for updates.",
        });
        return;
      }
      await interaction.editReply({ content: `Error: ${String(err)}` });
    }
  },
};

export const commands = [
  issueCommand,
  prsCommand,
  goodFirstIssuesCommand,
  findIssuesCommand,
  draftIssueCommand,
  ciCommand,
  mapCommand,
  pingCommand,
  statusCommand,
  triageCommand,
  deployLastCommand,
  leaderboardCommand,
];
