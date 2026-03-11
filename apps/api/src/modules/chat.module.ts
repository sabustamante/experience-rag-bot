import { Module } from "@nestjs/common";

import { ChatService } from "../domain/services/chat.service";
import { AIModule } from "./ai.module";
import { ExperienceModule } from "./experience.module";
import { StorageModule } from "./storage.module";

@Module({
  imports: [AIModule, StorageModule, ExperienceModule],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
