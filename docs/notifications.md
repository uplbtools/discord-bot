# NotificationEvent contract

Versioned envelope shared with [room-tba](https://github.com/uplbtools/room-tba).

```typescript
type NotificationEvent = {
  schemaVersion: 1;
  type:
    | "proposal.submitted"
    | "proposal.reviewed"
    | "deploy.succeeded"
    | "deploy.failed"
    | "release.published"
    | "ci.e2e.failed"
    | "ci.e2e.passed"
    | "ci.e2e.advisory.failed"
    | "ci.staging-e2e.failed"
    | "ci.staging-smoke.failed";
  source: "room-tba" | "vercel" | "github";
  occurredAt: string; // ISO-8601
  idempotencyKey?: string;
  payload: Record<string, unknown>;
};
```

## Ingress

`POST /notifications` with header `x-notification-secret: <NOTIFICATION_INGRESS_SECRET>`.

## proposal.submitted payload

| Field         | Type    |
| ------------- | ------- |
| proposalId    | number  |
| entityType    | string  |
| entityId      | number  |
| entityLabel   | string  |
| submitterName | string  |
| isAnonymous   | boolean |

## CI E2E payloads (`ci.e2e.*`, `ci.staging-*`)

Posted from room-tba `discord-notify-e2e.yml`. Routes to `#development` except `ci.staging-smoke.failed` → `#deploys`.

| Field | Type | Notes |
| ----- | ---- | ----- |
| workflow | string | e.g. `E2E`, `E2E staging` |
| workflowUrl | string | GitHub Actions run URL |
| branch | string | head branch |
| commitSha | string | full SHA |
| prNumber | number \| null | PR workflows only |
| prUrl | string \| null | |
| suite | string | `blocking`, `advisory`, `staging-smoke` |
| failedStep | string \| null | first failed job step name |
| integrationFailed | boolean | true when integration step failed |
| failedTests | string[] | optional; v2 |
| artifactName | string \| null | Playwright report artifact |
| durationSeconds | number | |
| trigger | string | `pull_request`, `push`, `schedule`, … |

## Leaderboard API (room-tba, future)

Discord bot consumes `GET /api/contributors/leaderboard?window=month|semester|all` — see room-tba issue under #220.
