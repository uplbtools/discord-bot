import { config } from "../config.js";
import { fetchLeaderboardWithOptions } from "./fetch-leaderboard.js";

export { fetchLeaderboardWithOptions } from "./fetch-leaderboard.js";
export type {
  LeaderboardEntry,
  LeaderboardResponse,
} from "./types.js";
export { LeaderboardNotReadyError } from "./types.js";

export async function fetchLeaderboard(window: "month" | "semester" | "all" = "month") {
  return fetchLeaderboardWithOptions({
    apiUrl: config.roomTbaLeaderboardApiUrl,
    apiKey: config.roomTbaBotApiKey,
    window,
  });
}

export async function headStatus(url: string): Promise<number> {
  const res = await fetch(url, { method: "HEAD", redirect: "follow" });
  return res.status;
}
