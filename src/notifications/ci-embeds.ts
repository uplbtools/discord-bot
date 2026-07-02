import { EmbedBuilder } from "discord.js";
import { BOT_FOOTER } from "../constants.js";
import type { NotificationEvent } from "./types.js";

export type CiE2ePayload = {
  repo?: string;
  workflow?: string;
  workflowUrl?: string;
  branch?: string;
  commitSha?: string;
  prNumber?: number | null;
  prUrl?: string | null;
  suite?: string;
  failedStep?: string;
  integrationFailed?: boolean;
  failedTests?: string[];
  artifactName?: string;
  durationSeconds?: number;
  trigger?: string;
};

const MAX_FAILED_TESTS = 10;

function str(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function shortSha(sha: unknown): string {
  const s = str(sha, "");
  return s.length >= 7 ? s.slice(0, 7) : s || "—";
}

function formatFailedTests(tests: unknown): string | null {
  if (!Array.isArray(tests) || tests.length === 0) return null;
  const lines = tests.slice(0, MAX_FAILED_TESTS).map((t) => `• ${String(t)}`);
  if (tests.length > MAX_FAILED_TESTS) {
    lines.push(`• +${tests.length - MAX_FAILED_TESTS} more (see Actions run)`);
  }
  return lines.join("\n").slice(0, 1024);
}

function titleForType(type: NotificationEvent["type"]): string {
  switch (type) {
    case "ci.e2e.failed":
      return "Room TBA E2E failed";
    case "ci.e2e.advisory.failed":
      return "E2E advisory failed (non-blocking)";
    case "ci.staging-e2e.failed":
      return "Staging E2E failed";
    case "ci.staging-smoke.failed":
      return "Staging smoke failed";
    case "ci.e2e.passed":
      return "Room TBA E2E recovered";
    default:
      return "CI notification";
  }
}

function colorForType(type: NotificationEvent["type"]): number {
  switch (type) {
    case "ci.e2e.passed":
      return 0x16a34a;
    case "ci.e2e.advisory.failed":
    case "ci.staging-smoke.failed":
      return 0xf59e0b;
    default:
      return 0xdc2626;
  }
}

export function ciE2eEmbed(
  type: NotificationEvent["type"],
  payload: CiE2ePayload,
  occurredAt: string,
): EmbedBuilder {
  const p = payload as Record<string, unknown>;
  const embed = new EmbedBuilder()
    .setColor(colorForType(type))
    .setTitle(titleForType(type))
    .setTimestamp(new Date(occurredAt))
    .setFooter({ text: BOT_FOOTER });

  const workflowUrl = str(p.workflowUrl, "");
  if (workflowUrl.startsWith("http")) embed.setURL(workflowUrl);

  const prNumber = p.prNumber;
  const branch = str(p.branch);
  const prLine =
    typeof prNumber === "number" && prNumber > 0
      ? `PR #${prNumber} (\`${branch}\`)`
      : `\`${branch}\` @ \`${shortSha(p.commitSha)}\``;

  embed.setDescription(prLine);

  const fields: { name: string; value: string; inline?: boolean }[] = [
    { name: "Workflow", value: str(p.workflow), inline: true },
    { name: "Trigger", value: str(p.trigger), inline: true },
  ];

  if (p.failedStep) {
    fields.push({ name: "Failed step", value: str(p.failedStep), inline: false });
  }
  if (p.integrationFailed === true) {
    fields.push({
      name: "Note",
      value: "Integration tests failed — Playwright did not run.",
      inline: false,
    });
  }
  if (p.artifactName) {
    fields.push({ name: "Artifact", value: str(p.artifactName), inline: true });
  }
  if (typeof p.durationSeconds === "number" && p.durationSeconds > 0) {
    const mins = Math.round(p.durationSeconds / 60);
    fields.push({ name: "Duration", value: `~${mins} min`, inline: true });
  }

  const failedTests = formatFailedTests(p.failedTests);
  if (failedTests) {
    fields.push({ name: "Failed tests", value: failedTests, inline: false });
  }

  const prUrl = str(p.prUrl, "");
  if (prUrl !== "—") {
    fields.push({ name: "Pull request", value: prUrl, inline: false });
  }

  embed.addFields(fields);
  return embed;
}

export function channelIdForCiEvent(type: NotificationEvent["type"]): "development" | "deploys" {
  if (type === "ci.staging-smoke.failed") return "deploys";
  return "development";
}
