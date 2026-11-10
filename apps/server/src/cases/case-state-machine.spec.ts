import { CaseStateMachineService } from "./case-state-machine.service";
import { CaseStatus, Role } from "@prisma/client";

describe("CaseStateMachine", () => {
  const sm = new CaseStateMachineService();
  it("allows valid transitions", () => {
    expect(sm.isAllowed(CaseStatus.PENDING_APPROVAL, CaseStatus.ACTIVE, Role.REGISTRAR)).toBe(true);
  });
  it("rejects invalid transitions", () => {
    expect(sm.isAllowed(CaseStatus.DRAFT, CaseStatus.ACTIVE, Role.REGISTRAR)).toBe(false);
  });
  it("throws 409 conflict", () => {
    expect(() => sm.assert(CaseStatus.DRAFT, CaseStatus.ACTIVE)).toThrow();
  });
});
