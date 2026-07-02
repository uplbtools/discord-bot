import { config } from "./config.js";

export type LeaderboardEntry = {
  rank: number;
  displayName: string;
  slug?: string;
  contributionCount: number;
  lastContributionAt?: string;
};

export type LeaderboardResponse = {
  window: string;
  entries: LeaderboardEntry[];
};

export class LeaderboardNotReadyError extends Error {
  constructor(message = "Leaderboard API not available yet") {
    super(message);
    this.name = "LeaderboardNotReadyError";
  }
}

export async function fetchLeaderboard(
  window: "month" | "semester" | "all" = "month",
): Promise<LeaderboardResponse> {
  const url = config.roomTbaLeaderboardApiUrl;
  if (!url) {
    throw new LeaderboardNotReadyError(
      "ROOM_TBA_LEADERBOARD_API_URL is not configured",
    );
  }

  const endpoint = new URL(url);
  endpoint.searchParams.set("window", window);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (config.roomTbaBotApiKey) {
    headers.Authorization = `Bearer ${config.roomTbaBotApiKey}`;
  }

  const res = await fetch(endpoint.toString(), { headers });
  if (res.status === 404 || res.status === 501) {
    throw new LeaderboardNotReadyError();
  }
  if (!res.ok) {
    throw new Error(`Leaderboard API ${res.status}`);
  }

  return res.json() as Promise<LeaderboardResponse>;
}

export async function headStatus(url: string): Promise<number> {
  const res = await fetch(url, { method: "HEAD", redirect: "follow" });
  return res.status;
}
