import { Module } from "@nestjs/common";
import { CasesService } from "./cases.service";
import { CasesController } from "./cases.controller";
import { CaseStateMachineService } from "./case-state-machine.service";

@Module({
  providers: [CasesService, CaseStateMachineService],
  controllers: [CasesController],
  exports: [CasesService, CaseStateMachineService],
})
export class CasesModule {}
