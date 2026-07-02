import type { NotificationEvent } from "./notifications/types.js";

let lastDeployEvent: NotificationEvent | null = null;

export function setLastDeployEvent(event: NotificationEvent): void {
  lastDeployEvent = event;
}

export function getLastDeployEvent(): NotificationEvent | null {
  return lastDeployEvent;
}
