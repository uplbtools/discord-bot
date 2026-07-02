import "dotenv/config";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function optional(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

export const config = {
  token: required("DISCORD_TOKEN"),
  clientId: required("DISCORD_CLIENT_ID"),
  guildId: optional("DISCORD_GUILD_ID"),
  port: Number(process.env.PORT ?? "3000"),
  logLevel: process.env.LOG_LEVEL?.trim() || "info",

  githubToken: optional("GITHUB_TOKEN"),

  maintainerRoleId: optional("MAINTAINER_ROLE_ID"),
  maintainerUserIds: (process.env.DISCORD_ALLOWED_USERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  channelDevelopmentId: optional("CHANNEL_DEVELOPMENT_ID"),
  channelDeploysId: optional("CHANNEL_DEPLOYS_ID"),
  channelAnnouncementsId: optional("CHANNEL_ANNOUNCEMENTS_ID"),
  channelContributorsId: optional("CHANNEL_CONTRIBUTORS_ID"),

  forumRoomTbaHelpId: optional("FORUM_ROOM_TBA_HELP_ID"),
  forumGradesimHelpId: optional("FORUM_GRADESIM_HELP_ID"),

  notificationIngressSecret: optional("NOTIFICATION_INGRESS_SECRET"),
  vercelWebhookSecret: optional("VERCEL_WEBHOOK_SECRET"),
  githubReleaseSecret: optional("GITHUB_WEBHOOK_RELEASE_SECRET"),

  roomTbaBaseUrl:
    optional("ROOM_TBA_BASE_URL") ?? "https://room-tba.uplbtools.me",
  roomTbaLeaderboardApiUrl: optional("ROOM_TBA_LEADERBOARD_API_URL"),
  roomTbaBotApiKey: optional("ROOM_TBA_BOT_API_KEY"),
  uplbToolsBaseUrl: optional("UPLB_TOOLS_BASE_URL") ?? "https://uplbtools.me",

  leaderboardDigestCron: optional("LEADERBOARD_DIGEST_CRON") ?? "0 9 * * 1",
  triageCron: optional("TRIAGE_CRON") ?? "0 9 * * 1",
} as const;
