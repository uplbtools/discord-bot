import { z } from "zod";

export const notificationEventSchema = z.object({
  schemaVersion: z.literal(1),
  type: z.enum([
    "proposal.submitted",
    "proposal.reviewed",
    "deploy.succeeded",
    "deploy.failed",
    "release.published",
    "ci.e2e.failed",
    "ci.e2e.passed",
    "ci.e2e.advisory.failed",
    "ci.staging-e2e.failed",
    "ci.staging-smoke.failed",
    "ci.test_inventory.updated",
    "github.issue",
    "github.pull_request",
    "github.push",
    "github.pull_request_review",
    "github.workflow_run.failed",
    "github.dependabot_alert",
    "github.code_scanning_alert",
    "github.secret_scanning_alert",
    "github.deployment",
    "github.deployment_status",
  ]),
  source: z.enum(["room-tba", "vercel", "github"]),
  occurredAt: z.string(),
  idempotencyKey: z.string().optional(),
  payload: z.record(z.unknown()),
});

export type NotificationEvent = z.infer<typeof notificationEventSchema>;

export type ProposalSubmittedPayload = {
  proposalId: number;
  entityType: string;
  entityId: number;
  entityLabel: string;
  submitterName: string;
  isAnonymous: boolean;
};
