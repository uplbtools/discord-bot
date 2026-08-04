import { z } from "zod";

export const notificationEventSchema = z.object({
  schemaVersion: z.literal(1),
  type: z.enum([
    "proposal.submitted",
    "proposal.reviewed",
    "feedback.submitted",
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

/**
 * In-app feedback from room-tba `/api/feedback` (uplbtools/room-tba#881).
 *
 * That endpoint is public and unauthenticated, so `message` and `contact` are
 * attacker-controlled: parse the payload instead of casting it, and render it
 * through `safeUserText` in `feedback-embed.ts`.
 */
export const feedbackSubmittedPayloadSchema = z.object({
  feedbackId: z.number(),
  message: z.string().min(1),
  contact: z.string().nullable(),
  screen: z.string().nullable(),
  appVersion: z.string().nullable(),
  wasOnline: z.boolean().nullable(),
});

export type FeedbackSubmittedPayload = z.infer<typeof feedbackSubmittedPayloadSchema>;

export type ProposalReviewOutcome = "approved" | "rejected" | "needs_changes";

export type ProposalReviewedPayload = {
  proposalId: number;
  outcome: ProposalReviewOutcome;
  entityType: string;
  entityId: number;
  entityLabel: string;
  submitterName: string;
  reviewedBy: string;
  adminNote: string | null;
};
