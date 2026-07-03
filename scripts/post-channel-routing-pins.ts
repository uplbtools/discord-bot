#!/usr/bin/env bun
/**
 * Post (and pin) channel routing summaries in Discord.
 * Usage: DISCORD_TOKEN=... bun scripts/post-channel-routing-pins.ts
 */
import "dotenv/config";

const token = process.env.DISCORD_TOKEN?.trim();
if (!token) {
  console.error("Set DISCORD_TOKEN");
  process.exit(1);
}

type ChannelPin = { id: string; name: string; content: string };

const PINS: ChannelPin[] = [
  {
    id: process.env.CHANNEL_GITHUB_ID ?? "1519351309575262278",
    name: "#github",
    content:
      "**GitHub feed** (uplbtools-discord-bot)\n\n• Issues\n• Pull requests\n• Pushes to `main` / `staging` only",
  },
  {
    id: process.env.CHANNEL_PRS_REVIEWS_ID ?? "1519351243229630637",
    name: "#prs-and-reviews",
    content: "**PR reviews**\n\n• `pull_request_review` — approve, request changes, comment",
  },
  {
    id: process.env.CHANNEL_DEVELOPMENT_ID ?? "1522313215927783587",
    name: "#development",
    content:
      "**CI & triage**\n\n• GitHub `workflow_run` failures (non-E2E)\n• Playwright E2E failure summaries\n• Weekly triage cron\n• Bot: `/issue`, `/prs`, `/ci`, `/triage`",
  },
  {
    id: process.env.CHANNEL_DEPLOYS_ID ?? "1522346427211190353",
    name: "#deploys",
    content:
      "**Deploys & staging health**\n\n• Vercel deploy success/failure\n• GitHub deployment events\n• Staging smoke CI failures",
  },
  {
    id: process.env.CHANNEL_ANNOUNCEMENTS_ID ?? "1522277179377975486",
    name: "#announcements",
    content:
      "**Ship announcements**\n\n• GitHub release published\n• Production Vercel deploy succeeded",
  },
  {
    id: process.env.CHANNEL_SECURITY_ID ?? "1519351270731939841",
    name: "#bug-triage",
    content:
      "**Security alerts**\n\n• Dependabot\n• Code scanning (CodeQL)\n• Secret scanning",
  },
  {
    id: process.env.CHANNEL_CONTRIBUTORS_ID ?? "1517842057559801998",
    name: "#contributors",
    content: "**Contributor proposals**\n\n• New map edit proposals from room-tba",
  },
];

if (process.env.CHANNEL_TEST_SUITE_ID?.trim()) {
  PINS.push({
    id: process.env.CHANNEL_TEST_SUITE_ID.trim(),
    name: "#test-suite",
    content:
      "**Test inventory**\n\n• Pinned embed + `test-inventory.md` attachment\n• Updates when specs change on `staging`/`main` or daily 04:00 UTC\n• Source: room-tba `discord-test-inventory.yml`",
  });
}

const API = "https://discord.com/api/v10";

async function discord(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

async function postAndPin(pin: ChannelPin): Promise<void> {
  const msgRes = await discord(`/channels/${pin.id}/messages`, {
    method: "POST",
    body: JSON.stringify({ content: pin.content }),
  });
  if (!msgRes.ok) {
    const text = await msgRes.text();
    console.error(`✗ ${pin.name} — post failed (${msgRes.status}): ${text}`);
    return;
  }
  const msg = (await msgRes.json()) as { id: string };
  const pinRes = await discord(`/channels/${pin.id}/pins/${msg.id}`, {
    method: "PUT",
  });
  if (!pinRes.ok) {
    const text = await pinRes.text();
    console.warn(`⚠ ${pin.name} — posted but pin failed (${pinRes.status}): ${text}`);
    return;
  }
  console.log(`✓ ${pin.name} — posted and pinned (${msg.id})`);
}

for (const pin of PINS) {
  await postAndPin(pin);
}
