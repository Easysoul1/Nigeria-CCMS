import { Module } from "@nestjs/common";
import { PublicTrackerService } from "./public-tracker.service";
import { PublicController } from "./public.controller";

@Module({ providers: [PublicTrackerService], controllers: [PublicController] })
export class PublicModule {}
