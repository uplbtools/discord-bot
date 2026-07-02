import type { NotificationEvent } from "../types.js";

const PUSH_BRANCH_ALLOWLIST = new Set(["main", "staging"]);

type GitHubRepo = { full_name?: string; html_url?: string };

function repoName(repository: GitHubRepo | undefined): string {
  return repository?.full_name ?? "unknown repo";
}

function issueIsPullRequest(issue: { pull_request?: unknown }): boolean {
  return issue.pull_request != null;
}

export function translateGitHubRepoWebhook(
  eventName: string,
  body: unknown,
  deliveryId: string | undefined,
): NotificationEvent | null {
  const data = body as Record<string, unknown>;
  const repository = data.repository as GitHubRepo | undefined;
  const repo = repoName(repository);
  const occurredAt = new Date().toISOString();

  if (eventName === "issues") {
    const action = String(data.action ?? "");
    if (!["opened", "closed", "reopened", "edited"].includes(action)) {
      return null;
    }
    const issue = data.issue as {
      number?: number;
      title?: string;
      html_url?: string;
      state?: string;
      user?: { login?: string };
      pull_request?: unknown;
    };
    if (!issue?.number || issueIsPullRequest(issue)) return null;

    return {
      schemaVersion: 1,
      type: "github.issue",
      source: "github",
      occurredAt,
      idempotencyKey: deliveryId ? `github:issue:${deliveryId}` : undefined,
      payload: {
        repo,
        action,
        number: issue.number,
        title: issue.title,
        htmlUrl: issue.html_url,
        state: issue.state,
        author: issue.user?.login,
      },
    };
  }

  if (eventName === "pull_request") {
    const action = String(data.action ?? "");
    if (
      ![
        "opened",
        "closed",
        "reopened",
        "ready_for_review",
        "converted_to_draft",
      ].includes(action)
    ) {
      return null;
    }
    const pr = data.pull_request as {
      number?: number;
      title?: string;
      html_url?: string;
      state?: string;
      merged?: boolean;
      draft?: boolean;
      user?: { login?: string };
      base?: { ref?: string };
      head?: { ref?: string };
    };
    if (!pr?.number) return null;

    return {
      schemaVersion: 1,
      type: "github.pull_request",
      source: "github",
      occurredAt,
      idempotencyKey: deliveryId ? `github:pr:${deliveryId}` : undefined,
      payload: {
        repo,
        action,
        number: pr.number,
        title: pr.title,
        htmlUrl: pr.html_url,
        state: pr.state,
        merged: pr.merged === true,
        draft: pr.draft === true,
        author: pr.user?.login,
        baseRef: pr.base?.ref,
        headRef: pr.head?.ref,
      },
    };
  }

  if (eventName === "push") {
    const ref = String(data.ref ?? "");
    const branch = ref.replace(/^refs\/heads\//, "");
    if (!PUSH_BRANCH_ALLOWLIST.has(branch)) return null;

    const commits = data.commits as { id?: string; message?: string; author?: { name?: string } }[] | undefined;
    const pusher = data.pusher as { name?: string } | undefined;
    const compare = String(data.compare ?? "");
    const commitCount = Array.isArray(commits) ? commits.length : 0;
    if (commitCount === 0) return null;

    const headSha = String(data.after ?? "").slice(0, 7);
    const latestMessage = commits?.[commits.length - 1]?.message?.split("\n")[0] ?? "Push";

    return {
      schemaVersion: 1,
      type: "github.push",
      source: "github",
      occurredAt,
      idempotencyKey: deliveryId ? `github:push:${deliveryId}` : undefined,
      payload: {
        repo,
        branch,
        commitCount,
        headSha,
        latestMessage,
        pusher: pusher?.name,
        compareUrl: compare || undefined,
      },
    };
  }

  return null;
}
