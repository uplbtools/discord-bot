import type { BotConfig } from "../config.js";
import type { NotificationEvent } from "./types.js";

export type GitHubDiscordRoute =
  | "github"
  | "prs"
  | "development"
  | "announcements"
  | "deploys"
  | "security";

export function githubDiscordRoute(
  type: NotificationEvent["type"],
): GitHubDiscordRoute | null {
  switch (type) {
    case "github.issue":
    case "github.pull_request":
    case "github.push":
      return "github";
    case "github.pull_request_review":
      return "prs";
    case "github.workflow_run.failed":
      return "development";
    case "release.published":
      return "announcements";
    case "github.deployment":
    case "github.deployment_status":
      return "deploys";
    case "github.dependabot_alert":
    case "github.code_scanning_alert":
    case "github.secret_scanning_alert":
      return "security";
    default:
      return null;
  }
}

export function channelIdForGithubRoute(
  cfg: BotConfig,
  route: GitHubDiscordRoute,
): string | null {
  switch (route) {
    case "github":
      return cfg.channelGithubId;
    case "prs":
      return cfg.channelPrsReviewsId ?? cfg.channelGithubId;
    case "development":
      return cfg.channelDevelopmentId;
    case "announcements":
      return cfg.channelAnnouncementsId;
    case "deploys":
      return cfg.channelDeploysId ?? cfg.channelDevelopmentId;
    case "security":
      return cfg.channelSecurityId ?? cfg.channelDevelopmentId;
  }
}
