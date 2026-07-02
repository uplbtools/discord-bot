import { config } from "./config.js";

export function log(level: string, message: string) {
  if (config.logLevel === "debug" || level !== "debug") {
    console.log(`[${level}] ${message}`);
  }
}
