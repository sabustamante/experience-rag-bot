import { Module } from "@nestjs/common";

import { LandingController } from "../application/landing/landing.controller";
import { LandingService } from "../domain/services/landing.service";
import { AIModule } from "./ai.module";
import { ExperienceModule } from "./experience.module";
import { StorageModule } from "./storage.module";

@Module({
  imports: [AIModule, StorageModule, ExperienceModule],
  controllers: [LandingController],
  providers: [LandingService],
  exports: [LandingService],
})
export class LandingModule {}
