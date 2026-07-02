import type { Client } from "discord.js";
import express from "express";
import { config } from "./config.js";
import { setLastDeployEvent } from "./deploy-cache.js";
import { verifySecret } from "./http/verify-secret.js";
import { log } from "./log.js";
import { routeNotification } from "./notifications/router.js";
import {
  translateGitHubRelease,
  translateGitHubRepoWebhook,
  translateVercelWebhook,
} from "./notifications/translators/index.js";
import { verifyGitHubSignature } from "./http/verify-github-signature.js";
import { verifyVercelSignature } from "./http/verify-vercel-signature.js";
import { notificationEventSchema } from "./notifications/types.js";

export function createServer(client: Client): express.Application {
  const app = express();

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );

  app.post("/notifications", async (req, res) => {
    if (
      !verifySecret(
        req.header("x-notification-secret"),
        config.notificationIngressSecret,
      )
    ) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const parsed = notificationEventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid notification envelope" });
      return;
    }
    try {
      await routeNotification(client, parsed.data);
      res.json({ ok: true });
    } catch (err) {
      log("error", `Notification delivery failed: ${String(err)}`);
      res.status(500).json({ error: "Delivery failed" });
    }
  });

  app.post("/webhooks/vercel", async (req, res) => {
    const rawReq = req as express.Request & { rawBody?: Buffer };
    if (
      !verifyVercelSignature(
        rawReq.rawBody,
        req.header("x-vercel-signature"),
        config.vercelWebhookSecret,
      )
    ) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const event = translateVercelWebhook(req.body);
    if (!event) {
      res.status(200).json({ ok: true, skipped: true });
      return;
    }
    setLastDeployEvent(event);
    try {
      await routeNotification(client, event);
      res.json({ ok: true });
    } catch (err) {
      log("error", `Vercel webhook failed: ${String(err)}`);
      res.status(500).json({ error: "Delivery failed" });
    }
  });

  app.post("/webhooks/github/release", async (req, res) => {
    const rawReq = req as express.Request & { rawBody?: Buffer };
    if (
      !verifyGitHubSignature(
        rawReq.rawBody,
        req.header("x-hub-signature-256"),
        config.githubReleaseSecret,
      )
    ) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const event = translateGitHubRelease(req.body);
    if (!event) {
      res.status(200).json({ ok: true, skipped: true });
      return;
    }
    try {
      await routeNotification(client, event);
      res.json({ ok: true });
    } catch (err) {
      log("error", `GitHub release webhook failed: ${String(err)}`);
      res.status(500).json({ error: "Delivery failed" });
    }
  });

  app.post("/webhooks/github/repo", async (req, res) => {
    const rawReq = req as express.Request & { rawBody?: Buffer };
    if (
      !verifyGitHubSignature(
        rawReq.rawBody,
        req.header("x-hub-signature-256"),
        config.githubRepoWebhookSecret,
      )
    ) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const eventName = req.header("x-github-event") ?? "";
    const event = translateGitHubRepoWebhook(
      eventName,
      req.body,
      req.header("x-github-delivery") ?? undefined,
    );
    if (!event) {
      res.status(200).json({ ok: true, skipped: true });
      return;
    }
    try {
      await routeNotification(client, event);
      res.json({ ok: true });
    } catch (err) {
      log("error", `GitHub repo webhook failed: ${String(err)}`);
      res.status(500).json({ error: "Delivery failed" });
    }
  });

  return app;
}

export function startServer(app: express.Application): void {
  app.listen(config.port, () => {
    log("info", `HTTP server listening on port ${config.port}`);
  });
}
