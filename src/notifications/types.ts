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
