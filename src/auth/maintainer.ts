import type { ChatInputCommandInteraction } from "discord.js";
import { config } from "../config.js";
import { isMaintainerUser } from "./maintainer-logic.js";

/** Role IDs from the interaction payload — not roles.cache (incomplete without full role cache). */
export function memberRoleIds(
  interaction: ChatInputCommandInteraction,
): string[] | null {
  const member = interaction.member;
  if (!member || !("roles" in member)) return null;

  const roles = member.roles;
  if (Array.isArray(roles)) return roles;

  const internal = (member as { _roles?: string[] })._roles;
  if (internal?.length) return [...internal];

  return [...roles.cache.keys()];
}

export function isMaintainer(interaction: ChatInputCommandInteraction): boolean {
  return isMaintainerUser({
    userId: interaction.user.id,
    maintainerUserIds: config.maintainerUserIds,
    maintainerRoleId: config.maintainerRoleId,
    memberRoleIds: memberRoleIds(interaction),
  });
}

export async function requireMaintainer(
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  if (isMaintainer(interaction)) return true;
  await interaction.reply({
    content: "Maintainer only.",
    ephemeral: true,
  });
  return false;
}
