import type { Client } from "discord.js";
import { deliverToDiscord } from "./delivery/discord.js";
import type { NotificationEvent } from "./types.js";

export async function routeNotification(
  client: Client,
  event: NotificationEvent,
): Promise<void> {
  await deliverToDiscord(client, event);
}
