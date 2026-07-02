import type { NotificationEvent } from "../types.js";

type VercelPayload = {
  type?: string;
  payload?: {
    deployment?: {
      url?: string;
      name?: string;
      meta?: { githubCommitRef?: string };
    };
    project?: { name?: string };
    target?: string;
  };
};

export function translateVercelWebhook(body: unknown): NotificationEvent | null {
  const data = body as VercelPayload;
  if (
    data.type !== "deployment.succeeded" &&
    data.type !== "deployment.failed" &&
    data.type !== "deployment.error"
  ) {
    return null;
  }
  const deployment = data.payload?.deployment;
  const succeeded = data.type === "deployment.succeeded";
  return {
    schemaVersion: 1,
    type: succeeded ? "deploy.succeeded" : "deploy.failed",
    source: "vercel",
    occurredAt: new Date().toISOString(),
    idempotencyKey: deployment?.url
      ? `vercel:${deployment.url}:${data.type}`
      : undefined,
    payload: {
      url: deployment?.url,
      name: deployment?.name,
      project: data.payload?.project?.name,
      branch: deployment?.meta?.githubCommitRef,
      target: data.payload?.target,
      environment: data.payload?.target,
    },
  };
}

type GitHubReleasePayload = {
  action?: string;
  release?: {
    name?: string;
    body?: string;
    html_url?: string;
    tag_name?: string;
  };
};

export function translateGitHubRelease(body: unknown): NotificationEvent | null {
  const data = body as GitHubReleasePayload;
  if (data.action !== "published" || !data.release) return null;
  return {
    schemaVersion: 1,
    type: "release.published",
    source: "github",
    occurredAt: new Date().toISOString(),
    idempotencyKey: `github:release:${data.release.tag_name}`,
    payload: {
      name: data.release.name ?? data.release.tag_name,
      body: data.release.body,
      htmlUrl: data.release.html_url,
    },
  };
}

export { translateGitHubRepoWebhook } from "./github-repo.js";
