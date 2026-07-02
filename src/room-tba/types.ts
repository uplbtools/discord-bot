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
