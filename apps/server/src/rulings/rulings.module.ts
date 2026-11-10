import { Module } from "@nestjs/common";
import { RulingsService } from "./rulings.service";
import { RulingsController } from "./rulings.controller";

@Module({ providers: [RulingsService], controllers: [RulingsController] })
export class RulingsModule {}
