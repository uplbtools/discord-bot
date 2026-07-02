import type { ChatInputCommandInteraction } from "discord.js";
import { config } from "../config.js";

export function isMaintainer(
  interaction: ChatInputCommandInteraction,
): boolean {
  if (config.maintainerUserIds.includes(interaction.user.id)) return true;
  if (!config.maintainerRoleId || !interaction.member) return false;
  if (!("roles" in interaction.member) || !interaction.member.roles)
    return false;
  const roles = interaction.member.roles;
  if (Array.isArray(roles)) return roles.includes(config.maintainerRoleId);
  return roles.cache.has(config.maintainerRoleId);
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
