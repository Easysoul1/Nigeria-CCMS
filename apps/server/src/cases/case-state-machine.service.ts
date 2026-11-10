import { ConflictException, Injectable } from "@nestjs/common";
import { CaseStatus, Role } from "@prisma/client";

const TRANSITIONS: Record<CaseStatus, Set<CaseStatus>> = {
  DRAFT: new Set([CaseStatus.PENDING_APPROVAL, CaseStatus.REJECTED]),
  PENDING_APPROVAL: new Set([CaseStatus.REJECTED, CaseStatus.ACTIVE]),
  REJECTED: new Set([CaseStatus.DRAFT, CaseStatus.PENDING_APPROVAL]),
  ACTIVE: new Set([CaseStatus.PART_HEARD, CaseStatus.ADJOURNED, CaseStatus.CLOSED]),
  PART_HEARD: new Set([CaseStatus.ADJOURNED, CaseStatus.CLOSED, CaseStatus.ACTIVE]),
  ADJOURNED: new Set([CaseStatus.PART_HEARD, CaseStatus.ACTIVE, CaseStatus.CLOSED]),
  CLOSED: new Set([]),
};

const ROLES: Partial<Record<string, Set<Role | string>>> = {
  "DRAFT->PENDING_APPROVAL": new Set([Role.LAWYER]),
  "PENDING_APPROVAL->REJECTED": new Set([Role.REGISTRAR, Role.ADMIN]),
  "PENDING_APPROVAL->ACTIVE": new Set([Role.REGISTRAR, Role.ADMIN]),
  "REJECTED->DRAFT": new Set([Role.LAWYER]),
  "REJECTED->PENDING_APPROVAL": new Set([Role.LAWYER]),
  "ACTIVE->PART_HEARD": new Set([Role.JUDGE, Role.REGISTRAR, Role.ADMIN]),
  "ACTIVE->ADJOURNED": new Set([Role.JUDGE, Role.REGISTRAR, Role.ADMIN]),
  "ACTIVE->CLOSED": new Set([Role.REGISTRAR, Role.ADMIN]),
  "PART_HEARD->ADJOURNED": new Set([Role.JUDGE, Role.REGISTRAR, Role.ADMIN]),
  "PART_HEARD->CLOSED": new Set([Role.REGISTRAR, Role.ADMIN]),
  "PART_HEARD->ACTIVE": new Set([Role.JUDGE, Role.REGISTRAR, Role.ADMIN]),
  "ADJOURNED->PART_HEARD": new Set([Role.JUDGE, Role.REGISTRAR, Role.ADMIN]),
  "ADJOURNED->ACTIVE": new Set([Role.JUDGE, Role.REGISTRAR, Role.ADMIN]),
  "ADJOURNED->CLOSED": new Set([Role.REGISTRAR, Role.ADMIN]),
};

@Injectable()
export class CaseStateMachineService {
  isAllowed(from: CaseStatus, to: CaseStatus, role?: Role | string): boolean {
    if (!TRANSITIONS[from]?.has(to)) return false;
    if (!role) return true;
    const allowed = ROLES[`${from}->${to}`];
    if (!allowed) return true;
    return allowed.has(role);
  }

  assert(from: CaseStatus, to: CaseStatus, role?: Role | string) {
    if (!this.isAllowed(from, to, role)) {
      throw new ConflictException({ statusCode: 409, code: "INVALID_TRANSITION", message: `Transition ${from} -> ${to} not allowed` });
    }
  }
}
