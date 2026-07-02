export const BOT_FOOTER =
  "UPLB Tools helper · Not an official UPLB product · Volunteer-run";

export const GITHUB_ORG = "uplbtools";

export const KNOWN_REPOS = ["room-tba", "discord-bot", "gradesim"] as const;

export type KnownRepo = (typeof KNOWN_REPOS)[number];

export const DEFAULT_REPO: KnownRepo = "room-tba";

export const ROOM_TBA_BASE = "https://room-tba.uplbtools.me";
export const UPLB_TOOLS_BASE = "https://uplbtools.me";
