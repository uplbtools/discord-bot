import { describe, expect, test } from "bun:test";
import type { Client } from "discord.js";
import request from "supertest";
import { createServer } from "./server.js";

const mockClient = {} as Client;

describe("createServer", () => {
  test("GET /health returns ok", async () => {
    const app = createServer(mockClient);
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test("POST /notifications rejects invalid envelope", async () => {
    const app = createServer(mockClient);
    const res = await request(app).post("/notifications").send({ bad: true });
    expect(res.status).toBe(400);
  });

  test("POST /notifications accepts valid envelope when secret open", async () => {
    const app = createServer(mockClient);
    const res = await request(app)
      .post("/notifications")
      .send({
        schemaVersion: 1,
        type: "proposal.submitted",
        source: "room-tba",
        occurredAt: new Date().toISOString(),
        payload: {
          proposalId: 1,
          entityType: "room",
          entityId: 2,
          entityLabel: "ICS-255",
          submitterName: "Test",
          isAnonymous: true,
        },
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test("POST /notifications accepts proposal.reviewed envelope", async () => {
    const app = createServer(mockClient);
    const res = await request(app)
      .post("/notifications")
      .send({
        schemaVersion: 1,
        type: "proposal.reviewed",
        source: "room-tba",
        occurredAt: new Date().toISOString(),
        idempotencyKey: "proposal:1:reviewed:approved",
        payload: {
          proposalId: 1,
          outcome: "approved",
          entityType: "room",
          entityId: 2,
          entityLabel: "ICS-255",
          submitterName: "Test",
          reviewedBy: "Editor",
          adminNote: null,
        },
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
