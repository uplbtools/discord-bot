import { config } from "./config.js";
import { GITHUB_ORG } from "./constants.js";

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

function headers(): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "uplbtools-discord-bot",
  };
  if (config.githubToken) {
    h.Authorization = `Bearer ${config.githubToken}`;
  }
  return h;
}

export function repoFullName(repo: string): string {
  return `${GITHUB_ORG}/${repo}`;
}

async function ghFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new GitHubError(text || `GitHub API ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}

export type GhIssue = {
  number: number;
  title: string;
  state: string;
  html_url: string;
  labels: { name: string }[];
  user: { login: string } | null;
  body: string | null;
};

export type GhPull = {
  number: number;
  title: string;
  html_url: string;
  user: { login: string } | null;
  draft: boolean;
  head: { ref: string };
  base: { ref: string };
};

export type GhCheckRun = {
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
};

export async function getIssue(repo: string, number: number): Promise<GhIssue> {
  return ghFetch(`/repos/${GITHUB_ORG}/${repo}/issues/${number}`);
}

export async function searchIssues(query: string, repo?: string): Promise<GhIssue[]> {
  const q = repo
    ? `repo:${GITHUB_ORG}/${repo} is:issue is:open ${query}`
    : `org:${GITHUB_ORG} is:issue is:open ${query}`;
  const data = await ghFetch<{ items: GhIssue[] }>(
    `/search/issues?q=${encodeURIComponent(q)}&per_page=10`,
  );
  return data.items;
}

export async function listGoodFirstIssues(repo: string): Promise<GhIssue[]> {
  const data = await ghFetch<GhIssue[]>(
    `/repos/${GITHUB_ORG}/${repo}/issues?state=open&labels=good%20first%20issue&per_page=15`,
  );
  return data.filter((i) => !("pull_request" in i));
}

export async function listOpenPrsToStaging(repo: string): Promise<GhPull[]> {
  const data = await ghFetch<GhPull[]>(
    `/repos/${GITHUB_ORG}/${repo}/pulls?state=open&base=staging&per_page=20`,
  );
  return data;
}

export async function createIssue(
  repo: string,
  title: string,
  body: string,
): Promise<GhIssue> {
  if (!config.githubToken) {
    throw new GitHubError("GITHUB_TOKEN not configured", 401);
  }
  return ghFetch(`/repos/${GITHUB_ORG}/${repo}/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body }),
  });
}

export async function getPull(repo: string, number: number): Promise<GhPull> {
  return ghFetch(`/repos/${GITHUB_ORG}/${repo}/pulls/${number}`);
}

export async function listCheckRunsForRef(
  repo: string,
  ref: string,
): Promise<GhCheckRun[]> {
  const data = await ghFetch<{ check_runs: GhCheckRun[] }>(
    `/repos/${GITHUB_ORG}/${repo}/commits/${encodeURIComponent(ref)}/check-runs?per_page=30`,
  );
  return data.check_runs;
}

export async function triageSummary(): Promise<string> {
  const { items: high } = await ghFetch<{ items: GhIssue[] }>(
    `/search/issues?q=${encodeURIComponent("org:uplbtools is:issue is:open label:priority/high")}&per_page=10`,
  );
  const prs = await listOpenPrsToStaging("room-tba");
  const lines = [
    "**Weekly triage snapshot**",
    "",
    `High priority open issues: **${high.length}**`,
    ...high.slice(0, 5).map((i) => `• #${i.number} ${i.title}`),
    "",
    `Open PRs → staging (room-tba): **${prs.length}**`,
    ...prs.slice(0, 5).map((p) => `• #${p.number} ${p.title}`),
  ];
  return lines.join("\n");
}
