export type PolicyUser = { id: string; role: string };

export function canAccessCase(user: PolicyUser, caseOwnedBy: { filedById: string; assignedJudgeId: string | null; assignedRegistrarId: string | null }): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "REGISTRAR") return caseOwnedBy.assignedRegistrarId === user.id;
  if (user.role === "JUDGE") return caseOwnedBy.assignedJudgeId === user.id;
  if (user.role === "LAWYER") return caseOwnedBy.filedById === user.id;
  return false;
}
