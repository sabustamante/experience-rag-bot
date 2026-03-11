import { Module } from "@nestjs/common";

import { ExperienceService } from "../domain/services/experience.service";
import { StorageModule } from "./storage.module";

@Module({
  imports: [StorageModule],
  providers: [ExperienceService],
  exports: [ExperienceService],
})
export class ExperienceModule {}
