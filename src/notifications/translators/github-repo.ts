import type { NotificationEvent } from "../types.js";

const PUSH_BRANCH_ALLOWLIST = new Set(["main", "staging"]);

/** Playwright workflows already notify via GitHub Actions → /notifications */
const WORKFLOW_NOTIFY_SKIP = new Set([
  "E2E",
  "E2E advisory",
  "E2E staging",
  "Staging smoke",
]);

type GitHubRepo = { full_name?: string; html_url?: string };

function repoName(repository: GitHubRepo | undefined): string {
  return repository?.full_name ?? "unknown repo";
}

function issueIsPullRequest(issue: { pull_request?: unknown }): boolean {
  return issue.pull_request != null;
}

function idem(deliveryId: string | undefined, suffix: string): string | undefined {
  return deliveryId ? `github:${suffix}:${deliveryId}` : undefined;
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
      idempotencyKey: idem(deliveryId, "issue"),
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
      idempotencyKey: idem(deliveryId, "pr"),
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

  if (eventName === "pull_request_review") {
    const action = String(data.action ?? "");
    if (!["submitted", "dismissed"].includes(action)) return null;
    const review = data.review as {
      state?: string;
      html_url?: string;
      body?: string | null;
      user?: { login?: string };
    };
    const pr = data.pull_request as {
      number?: number;
      title?: string;
      html_url?: string;
    };
    if (!pr?.number || !review) return null;

    return {
      schemaVersion: 1,
      type: "github.pull_request_review",
      source: "github",
      occurredAt,
      idempotencyKey: idem(deliveryId, "pr-review"),
      payload: {
        repo,
        action,
        prNumber: pr.number,
        prTitle: pr.title,
        prUrl: pr.html_url,
        reviewState: review.state,
        reviewUrl: review.html_url,
        reviewer: review.user?.login,
        bodyPreview: review.body?.slice(0, 200) ?? null,
      },
    };
  }

  if (eventName === "push") {
    const ref = String(data.ref ?? "");
    const branch = ref.replace(/^refs\/heads\//, "");
    if (!PUSH_BRANCH_ALLOWLIST.has(branch)) return null;

    const commits = data.commits as
      | { id?: string; message?: string; author?: { name?: string } }[]
      | undefined;
    const pusher = data.pusher as { name?: string } | undefined;
    const compare = String(data.compare ?? "");
    const commitCount = Array.isArray(commits) ? commits.length : 0;
    if (commitCount === 0) return null;

    const headSha = String(data.after ?? "").slice(0, 7);
    const latestMessage =
      commits?.[commits.length - 1]?.message?.split("\n")[0] ?? "Push";

    return {
      schemaVersion: 1,
      type: "github.push",
      source: "github",
      occurredAt,
      idempotencyKey: idem(deliveryId, "push"),
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

  if (eventName === "release") {
    if (String(data.action ?? "") !== "published") return null;
    const release = data.release as {
      name?: string;
      tag_name?: string;
      body?: string | null;
      html_url?: string;
    };
    if (!release) return null;
    return {
      schemaVersion: 1,
      type: "release.published",
      source: "github",
      occurredAt,
      idempotencyKey: deliveryId
        ? `github:release:${release.tag_name}:${deliveryId}`
        : `github:release:${release.tag_name}`,
      payload: {
        repo,
        name: release.name ?? release.tag_name,
        body: release.body,
        htmlUrl: release.html_url,
      },
    };
  }

  if (eventName === "workflow_run") {
    if (String(data.action ?? "") !== "completed") return null;
    const run = data.workflow_run as {
      name?: string;
      conclusion?: string | null;
      html_url?: string;
      head_branch?: string;
      head_sha?: string;
      event?: string;
      run_number?: number;
    };
    if (!run || run.conclusion !== "failure") return null;
    const workflowName = run.name ?? "workflow";
    if (WORKFLOW_NOTIFY_SKIP.has(workflowName)) return null;

    return {
      schemaVersion: 1,
      type: "github.workflow_run.failed",
      source: "github",
      occurredAt,
      idempotencyKey: idem(deliveryId, "workflow-run"),
      payload: {
        repo,
        workflow: workflowName,
        workflowUrl: run.html_url,
        branch: run.head_branch,
        commitSha: run.head_sha?.slice(0, 7),
        trigger: run.event,
        runNumber: run.run_number,
        conclusion: run.conclusion,
      },
    };
  }

  if (eventName === "dependabot_alert" || eventName === "repository_vulnerability_alert") {
    const action = String(data.action ?? "");
    if (!["created", "fixed", "reintroduced", "reopened", "create"].includes(action)) {
      return null;
    }
    const alert = (data.alert ?? data.dependency) as {
      html_url?: string;
      severity?: string;
      state?: string;
      dependency?: { package?: { name?: string }; manifest_path?: string };
      security_vulnerability?: { package?: { name?: string } };
      security_advisory?: { summary?: string; ghsa_id?: string };
      affected_package_name?: string;
    };
    const pkg =
      alert?.dependency?.package?.name ??
      alert?.security_vulnerability?.package?.name ??
      alert?.affected_package_name ??
      "dependency";
    const summary =
      alert?.security_advisory?.summary ??
      `${pkg} — ${alert?.severity ?? "unknown severity"}`;

    return {
      schemaVersion: 1,
      type: "github.dependabot_alert",
      source: "github",
      occurredAt,
      idempotencyKey: idem(deliveryId, "dependabot"),
      payload: {
        repo,
        action: action === "create" ? "created" : action,
        severity: alert?.severity,
        package: pkg,
        summary,
        htmlUrl: alert?.html_url,
        ghsaId: alert?.security_advisory?.ghsa_id,
      },
    };
  }

  if (eventName === "code_scanning_alert") {
    const action = String(data.action ?? "");
    if (!["created", "fixed", "reopened", "closed_by_user"].includes(action)) {
      return null;
    }
    const alert = data.alert as {
      html_url?: string;
      severity?: string;
      rule?: { id?: string; description?: string };
      tool_name?: string;
    };
    if (!alert) return null;

    return {
      schemaVersion: 1,
      type: "github.code_scanning_alert",
      source: "github",
      occurredAt,
      idempotencyKey: idem(deliveryId, "code-scanning"),
      payload: {
        repo,
        action,
        severity: alert.severity,
        rule: alert.rule?.id ?? alert.rule?.description,
        tool: alert.tool_name,
        summary: alert.rule?.description ?? alert.rule?.id,
        htmlUrl: alert.html_url,
      },
    };
  }

  if (eventName === "secret_scanning_alert") {
    const action = String(data.action ?? "");
    if (
      !["created", "resolved", "reopened", "validated", "publicly_leaked"].includes(
        action,
      )
    ) {
      return null;
    }
    const alert = data.alert as {
      html_url?: string;
      secret_type?: string;
      secret_type_display_name?: string;
      validity?: string;
      resolution?: string;
    };
    if (!alert) return null;

    return {
      schemaVersion: 1,
      type: "github.secret_scanning_alert",
      source: "github",
      occurredAt,
      idempotencyKey: idem(deliveryId, "secret-scanning"),
      payload: {
        repo,
        action,
        secretType: alert.secret_type_display_name ?? alert.secret_type,
        validity: alert.validity,
        resolution: alert.resolution,
        htmlUrl: alert.html_url,
      },
    };
  }

  if (eventName === "deployment") {
    const action = String(data.action ?? "");
    if (action !== "created") return null;
    const deployment = data.deployment as {
      ref?: string;
      environment?: string;
      description?: string | null;
      sha?: string;
    };
    if (!deployment) return null;

    return {
      schemaVersion: 1,
      type: "github.deployment",
      source: "github",
      occurredAt,
      idempotencyKey: idem(deliveryId, "deployment"),
      payload: {
        repo,
        action,
        environment: deployment.environment,
        ref: deployment.ref,
        sha: deployment.sha?.slice(0, 7),
        description: deployment.description,
      },
    };
  }

  if (eventName === "deployment_status") {
    const state = String(
      (data.deployment_status as { state?: string } | undefined)?.state ?? "",
    );
    if (!["success", "failure", "error", "inactive"].includes(state)) return null;
    const status = data.deployment_status as {
      state?: string;
      description?: string | null;
      target_url?: string;
      environment_url?: string;
    };
    const deployment = data.deployment as {
      ref?: string;
      environment?: string;
      sha?: string;
    };
    if (!status || !deployment) return null;

    return {
      schemaVersion: 1,
      type: "github.deployment_status",
      source: "github",
      occurredAt,
      idempotencyKey: idem(deliveryId, `deployment-status:${state}`),
      payload: {
        repo,
        state,
        environment: deployment.environment,
        ref: deployment.ref,
        sha: deployment.sha?.slice(0, 7),
        description: status.description,
        targetUrl: status.target_url ?? status.environment_url,
      },
    };
  }

  return null;
}
