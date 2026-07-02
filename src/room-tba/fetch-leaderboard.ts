import type { LeaderboardResponse } from "./types.js";
import { LeaderboardNotReadyError } from "./types.js";

export type FetchLeaderboardOptions = {
  apiUrl: string | null;
  apiKey?: string | null;
  window?: "month" | "semester" | "all";
  fetchImpl?: typeof fetch;
};

export async function fetchLeaderboardWithOptions(
  options: FetchLeaderboardOptions,
): Promise<LeaderboardResponse> {
  const { apiUrl, apiKey, window = "month", fetchImpl = fetch } = options;
  if (!apiUrl) {
    throw new LeaderboardNotReadyError(
      "ROOM_TBA_LEADERBOARD_API_URL is not configured",
    );
  }

  const endpoint = new URL(apiUrl);
  endpoint.searchParams.set("window", window);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const res = await fetchImpl(endpoint.toString(), { headers });
  if (res.status === 404 || res.status === 501) {
    throw new LeaderboardNotReadyError();
  }
  if (!res.ok) {
    throw new Error(`Leaderboard API ${res.status}`);
  }

  return res.json() as Promise<LeaderboardResponse>;
}
