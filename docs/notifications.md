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
    | "release.published";
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

## Leaderboard API (room-tba, future)

Discord bot consumes `GET /api/contributors/leaderboard?window=month|semester|all` — see room-tba issue under #220.
