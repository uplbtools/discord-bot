import type { ChatInputCommandInteraction } from "discord.js";
import { config } from "../config.js";
import { isMaintainerUser } from "./maintainer-logic.js";

function memberRoleIds(interaction: ChatInputCommandInteraction): string[] | null {
  if (!interaction.member || !("roles" in interaction.member)) return null;
  const roles = interaction.member.roles;
  if (Array.isArray(roles)) return roles;
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
