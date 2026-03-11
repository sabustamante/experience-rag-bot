import { Module } from "@nestjs/common";

import { LandingService } from "../domain/services/landing.service";
import { AIModule } from "./ai.module";
import { ExperienceModule } from "./experience.module";
import { StorageModule } from "./storage.module";

@Module({
  imports: [AIModule, StorageModule, ExperienceModule],
  providers: [LandingService],
  exports: [LandingService],
})
export class LandingModule {}
