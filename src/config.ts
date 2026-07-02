export type BotConfig = {
  token: string;
  clientId: string;
  guildId: string | null;
  port: number;
  logLevel: string;

  githubToken: string | null;

  maintainerRoleId: string | null;
  maintainerUserIds: string[];

  channelDevelopmentId: string | null;
  channelDeploysId: string | null;
  channelAnnouncementsId: string | null;
  channelContributorsId: string | null;

  forumRoomTbaHelpId: string | null;
  forumGradesimHelpId: string | null;

  channelGithubId: string | null;

  notificationIngressSecret: string | null;
  vercelWebhookSecret: string | null;
  githubReleaseSecret: string | null;
  githubRepoWebhookSecret: string | null;

  roomTbaBaseUrl: string;
  roomTbaLeaderboardApiUrl: string | null;
  roomTbaBotApiKey: string | null;
  uplbToolsBaseUrl: string;

  leaderboardDigestCron: string;
  triageCron: string;
};

export type LoadBotConfigOptions = {
  /** e.g. `UPLB_` — falls back to unprefixed vars for solo Heroku deploy */
  envPrefix?: string;
  overrides?: Partial<BotConfig>;
};

let activeConfig: BotConfig | null = null;

function readEnv(name: string, prefix: string): string | null {
  const prefixed = prefix ? `${prefix}${name}` : name;
  const value = process.env[prefixed]?.trim();
  if (value) return value;
  if (prefix) {
    return process.env[name]?.trim() || null;
  }
  return null;
}

function requiredEnv(name: string, prefix: string): string {
  const value = readEnv(name, prefix);
  if (!value) {
    const label = prefix ? `${prefix}${name} (or ${name})` : name;
    throw new Error(`Missing required env var: ${label}`);
  }
  return value;
}

function optionalEnv(name: string, prefix: string): string | null {
  return readEnv(name, prefix);
}

export function loadBotConfigFromEnv(options: LoadBotConfigOptions = {}): BotConfig {
  const prefix = options.envPrefix ?? "";
  const maintainerList =
    readEnv("DISCORD_ALLOWED_USERS", prefix) ??
    process.env.DISCORD_ALLOWED_USERS?.trim() ??
    "";

  const config: BotConfig = {
    token: requiredEnv("DISCORD_TOKEN", prefix),
    clientId: requiredEnv("DISCORD_CLIENT_ID", prefix),
    guildId: optionalEnv("DISCORD_GUILD_ID", prefix),
    port: Number(readEnv("PORT", prefix) ?? process.env.PORT ?? "3000"),
    logLevel: readEnv("LOG_LEVEL", prefix) ?? process.env.LOG_LEVEL?.trim() ?? "info",

    githubToken: optionalEnv("GITHUB_TOKEN", prefix),

    maintainerRoleId: optionalEnv("MAINTAINER_ROLE_ID", prefix),
    maintainerUserIds: maintainerList
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),

    channelDevelopmentId: optionalEnv("CHANNEL_DEVELOPMENT_ID", prefix),
    channelDeploysId: optionalEnv("CHANNEL_DEPLOYS_ID", prefix),
    channelAnnouncementsId: optionalEnv("CHANNEL_ANNOUNCEMENTS_ID", prefix),
    channelContributorsId: optionalEnv("CHANNEL_CONTRIBUTORS_ID", prefix),

    forumRoomTbaHelpId: optionalEnv("FORUM_ROOM_TBA_HELP_ID", prefix),
    forumGradesimHelpId: optionalEnv("FORUM_GRADESIM_HELP_ID", prefix),

    channelGithubId: optionalEnv("CHANNEL_GITHUB_ID", prefix),

    notificationIngressSecret: optionalEnv("NOTIFICATION_INGRESS_SECRET", prefix),
    vercelWebhookSecret: optionalEnv("VERCEL_WEBHOOK_SECRET", prefix),
    githubReleaseSecret: optionalEnv("GITHUB_WEBHOOK_RELEASE_SECRET", prefix),
    githubRepoWebhookSecret: optionalEnv("GITHUB_WEBHOOK_REPO_SECRET", prefix),

    roomTbaBaseUrl:
      optionalEnv("ROOM_TBA_BASE_URL", prefix) ?? "https://room-tba.uplbtools.me",
    roomTbaLeaderboardApiUrl: optionalEnv("ROOM_TBA_LEADERBOARD_API_URL", prefix),
    roomTbaBotApiKey: optionalEnv("ROOM_TBA_BOT_API_KEY", prefix),
    uplbToolsBaseUrl:
      optionalEnv("UPLB_TOOLS_BASE_URL", prefix) ?? "https://uplbtools.me",

    leaderboardDigestCron:
      optionalEnv("LEADERBOARD_DIGEST_CRON", prefix) ?? "0 9 * * 1",
    triageCron: optionalEnv("TRIAGE_CRON", prefix) ?? "0 9 * * 1",
  };

  return { ...config, ...options.overrides };
}

/** Initialize module config (solo Heroku or host embedding). Call before other imports use `config`. */
export function initConfig(config: BotConfig): BotConfig {
  activeConfig = config;
  return config;
}

export function getConfig(): BotConfig {
  if (!activeConfig) {
    throw new Error(
      "Bot config not initialized. Call initConfig() or createUplbToolsRuntime() first.",
    );
  }
  return activeConfig;
}

/** Active config after initConfig(). Existing modules read through this proxy. */
export const config: BotConfig = new Proxy({} as BotConfig, {
  get(_target, prop: keyof BotConfig) {
    return getConfig()[prop];
  },
});
