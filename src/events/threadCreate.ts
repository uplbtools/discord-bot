import { type Client, Events } from "discord.js";
import { config } from "../config.js";
import { log } from "../log.js";

const FORUM_TEMPLATES: Record<string, string> = {
  room_tba:
    "Thanks for posting in **room-tba-help**.\n\nInclude:\n• Room code (e.g. `ICS-255`)\n• Term / semester\n• What's wrong (schedule, pin, directions)\n\nDo **not** post AMIS passwords or instructor names.",
  gradesim:
    "Thanks for posting in **gradesim-help**.\n\nInclude:\n• Browser + extension version\n• Steps to reproduce\n• Screenshots if possible",
};

function forumKey(channelId: string): string | null {
  if (channelId === config.forumRoomTbaHelpId) return "room_tba";
  if (channelId === config.forumGradesimHelpId) return "gradesim";
  return null;
}

export function registerForumTemplates(client: Client): void {
  client.on(Events.ThreadCreate, async (thread) => {
    if (!thread.parentId) return;
    const key = forumKey(thread.parentId);
    if (!key) return;
    const template = FORUM_TEMPLATES[key];
    if (!template) return;
    try {
      await thread.send(template);
    } catch (err) {
      log("warn", `Forum template failed: ${String(err)}`);
    }
  });
}
