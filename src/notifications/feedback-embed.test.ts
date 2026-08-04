import { describe, expect, test } from "bun:test";
import {
  feedbackSubmittedEmbed,
  safeInlineText,
  safeUserText,
} from "./feedback-embed.js";
import { feedbackSubmittedPayloadSchema } from "./types.js";

const OCCURRED_AT = "2026-08-04T09:00:00.000Z";

const validPayload = {
  feedbackId: 12,
  message: "The 3D buildings do not load on my phone.",
  contact: "juan@up.edu.ph",
  screen: "/map",
  appVersion: "2026.08.01",
  wasOnline: true,
};

describe("feedbackSubmittedPayloadSchema", () => {
  test("accepts the payload room-tba emits", () => {
    expect(feedbackSubmittedPayloadSchema.safeParse(validPayload).success).toBe(true);
  });

  test("accepts null optional context", () => {
    const result = feedbackSubmittedPayloadSchema.safeParse({
      ...validPayload,
      contact: null,
      screen: null,
      appVersion: null,
      wasOnline: null,
    });
    expect(result.success).toBe(true);
  });

  test("rejects a missing message", () => {
    const { message: _message, ...rest } = validPayload;
    expect(feedbackSubmittedPayloadSchema.safeParse(rest).success).toBe(false);
  });

  test("rejects an empty message", () => {
    const result = feedbackSubmittedPayloadSchema.safeParse({
      ...validPayload,
      message: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects wrong field types", () => {
    const result = feedbackSubmittedPayloadSchema.safeParse({
      ...validPayload,
      feedbackId: "12",
      wasOnline: "yes",
    });
    expect(result.success).toBe(false);
  });
});

describe("safeUserText", () => {
  test("neutralises everyone, here, and role mentions", () => {
    const rendered = safeUserText("@everyone @here <@&123> <@456>");
    expect(rendered).not.toContain("@everyone");
    expect(rendered).not.toContain("@here");
    expect(rendered).not.toContain("<@&123>");
    expect(rendered).not.toContain("<@456>");
    // Text is still readable, just un-pingable.
    expect(rendered).toContain("everyone");
  });

  test("escapes markdown and masked links", () => {
    const rendered = safeUserText("**bold** [click](https://evil.example)");
    expect(rendered).toContain("\\*\\*bold\\*\\*");
    // Escaped bracket: Discord renders the URL plainly instead of hiding it.
    expect(rendered).toContain("\\[click]");
  });

  test("truncates over-long text instead of throwing", () => {
    const rendered = safeUserText("a".repeat(5000), 1024);
    expect(rendered.length).toBe(1024);
    expect(rendered.endsWith("…")).toBe(true);
  });

  test("does not leave a dangling escape before the ellipsis", () => {
    const rendered = safeUserText("*".repeat(5000), 100);
    expect(rendered.endsWith("\\…")).toBe(false);
    expect(rendered.endsWith("…")).toBe(true);
  });

  test("stays fast on a hostile body (escapeMarkdown is quadratic)", () => {
    const started = performance.now();
    safeUserText("@everyone *".repeat(5000), 3900);
    expect(performance.now() - started).toBeLessThan(1000);
  });

  test("leaves a readable app version unescaped", () => {
    expect(safeInlineText("2026.08.01")).toBe("2026.08.01");
    expect(safeInlineText("/map")).toBe("/map");
  });

  test("still defuses markdown and mentions in a context value", () => {
    expect(safeInlineText("/map\n# @everyone")).not.toContain("@everyone");
    expect(safeInlineText("/map\n# huge")).not.toContain("\n");
  });
});

describe("feedbackSubmittedEmbed", () => {
  test("renders message, contact, and context", () => {
    const data = feedbackSubmittedEmbed(validPayload, OCCURRED_AT).toJSON();
    expect(data.title).toBe("New in-app feedback");
    expect(data.description).toContain("3D buildings");
    const field = (name: string) => data.fields?.find((f) => f.name === name)?.value;
    expect(field("Screen")).toBe("/map");
    expect(field("App version")).toBe("2026.08.01");
    expect(field("Online")).toBe("Yes");
    expect(field("Feedback ID")).toBe("12");
    expect(field("Contact")).toContain("juan");
  });

  test("omits contact when absent and dashes missing context", () => {
    const data = feedbackSubmittedEmbed(
      {
        ...validPayload,
        contact: null,
        screen: null,
        appVersion: null,
        wasOnline: null,
      },
      OCCURRED_AT,
    ).toJSON();
    expect(data.fields?.some((f) => f.name === "Contact")).toBe(false);
    expect(data.fields?.find((f) => f.name === "Online")?.value).toBe("—");
    expect(data.fields?.find((f) => f.name === "Screen")?.value).toBe("—");
  });

  test("keeps a hostile oversized body inside Discord's limits", () => {
    const data = feedbackSubmittedEmbed(
      { ...validPayload, message: "@everyone *".repeat(2000) },
      OCCURRED_AT,
    ).toJSON();
    expect(data.description?.length).toBeLessThanOrEqual(4096);
    expect(data.description).not.toContain("@everyone");
  });

  test("marks offline submissions", () => {
    const data = feedbackSubmittedEmbed(
      { ...validPayload, wasOnline: false },
      OCCURRED_AT,
    ).toJSON();
    expect(data.fields?.find((f) => f.name === "Online")?.value).toBe("No");
  });
});
