import { Module } from "@nestjs/common";
import { PartiesService } from "./parties.service";
import { PartiesController } from "./parties.controller";
import { CasesModule } from "../cases/cases.module";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [CasesModule, PrismaModule],
  providers: [PartiesService],
  controllers: [PartiesController],
})
export class PartiesModule {}
