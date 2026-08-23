import { EmbedBuilder, escapeMarkdown } from "discord.js";
import { BOT_FOOTER } from "../constants.js";
import type { FeedbackSubmittedPayload } from "./types.js";

/** Discord caps embed descriptions at 4096; leave headroom for escape chars. */
const MESSAGE_MAX = 3900;
/** Discord caps embed field values at 1024. */
const FIELD_MAX = 1024;
/**
 * Cut raw text before escaping: `escapeMarkdown` is quadratic (22k chars is
 * roughly 7s of blocked event loop) and escaping only ever grows text, so a
 * longer body loses its tail either way.
 *
 * ponytail: mirrors room-tba's own 2000-char cap. Raise both together if that
 * cap moves, or the tail of a long message quietly disappears here.
 */
const RAW_MAX = 2000;

function neutralise(escaped: string, max: number, clipped: boolean): string {
  // Zero-width space after every `@`: nothing a submitter writes can ping
  // @everyone, @here, or a role, and the text still reads normally.
  const safe = escaped.replaceAll("@", "@\u200b");
  // `clipped` forces the ellipsis even when escaping did not push the text past
  // `max`: the raw body was already cut, and that has to stay visible.
  if (!clipped && safe.length <= max) return safe;
  // A trailing backslash would escape the ellipsis instead of rendering it.
  return `${safe.slice(0, max - 1).replace(/\\+$/, "")}…`;
}

/**
 * Render untrusted free text (the message body, the contact line).
 *
 * room-tba `/api/feedback` is public and unauthenticated, so anything here can
 * be hostile: escape markdown — masked links included, or a submission could
 * render a fake link into the team channel — neutralise mentions, and truncate
 * rather than let Discord reject the whole message.
 */
export function safeUserText(raw: string, max = FIELD_MAX): string {
  const limit = Math.min(max, RAW_MAX);
  return neutralise(
    escapeMarkdown(raw.slice(0, limit), {
      heading: true,
      bulletedList: true,
      numberedList: true,
      maskedLink: true,
    }),
    max,
    raw.length > limit,
  );
}

/**
 * Render a single-token context value (screen path, app version).
 *
 * Whitespace is collapsed first, so no line start is left for heading or list
 * markdown to fire from — which also spares readable values the escaping that
 * would otherwise render an app version as `2026\.08.01`.
 */
export function safeInlineText(raw: string): string {
  return neutralise(
    escapeMarkdown(raw.slice(0, RAW_MAX).replace(/\s+/g, " ").trim(), {
      maskedLink: true,
    }),
    FIELD_MAX,
    raw.length > RAW_MAX,
  );
}

function optionalField(value: string | null): string {
  const trimmed = value?.trim();
  return trimmed ? safeInlineText(trimmed) : "—";
}

export function feedbackSubmittedEmbed(
  payload: FeedbackSubmittedPayload,
  occurredAt: string,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(0x0369a1)
    .setTitle("New in-app feedback")
    .setDescription(safeUserText(payload.message, MESSAGE_MAX))
    .addFields(
      { name: "Screen", value: optionalField(payload.screen), inline: true },
      {
        name: "App version",
        value: optionalField(payload.appVersion),
        inline: true,
      },
      {
        name: "Online",
        value: payload.wasOnline === null ? "—" : payload.wasOnline ? "Yes" : "No",
        inline: true,
      },
      {
        name: "Feedback ID",
        value: String(payload.feedbackId),
        inline: true,
      },
    )
    .setTimestamp(new Date(occurredAt))
    .setFooter({ text: BOT_FOOTER });

  if (payload.contact?.trim()) {
    embed.addFields({
      name: "Contact",
      value: safeUserText(payload.contact.trim()),
      inline: true,
    });
  }

  return embed;
}
