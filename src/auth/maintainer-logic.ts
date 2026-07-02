export type MaintainerContext = {
  userId: string;
  maintainerUserIds: readonly string[];
  maintainerRoleId: string | null;
  memberRoleIds: readonly string[] | null;
};

export function isMaintainerUser(ctx: MaintainerContext): boolean {
  if (ctx.maintainerUserIds.includes(ctx.userId)) return true;
  if (!ctx.maintainerRoleId || !ctx.memberRoleIds) return false;
  return ctx.memberRoleIds.includes(ctx.maintainerRoleId);
}
