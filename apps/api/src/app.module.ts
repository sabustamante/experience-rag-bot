import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";

import { ChatController } from "./application/chat/chat.controller";
import { ChatGateway } from "./application/chat/chat.gateway";
import { HealthController } from "./application/health/health.controller";
import { AIModule } from "./modules/ai.module";
import { ChatModule } from "./modules/chat.module";
import { ExperienceModule } from "./modules/experience.module";
import { LandingModule } from "./modules/landing.module";
import { StorageModule } from "./modules/storage.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env["RATE_LIMIT_TTL"] ?? "60000"),
        limit: parseInt(process.env["RATE_LIMIT_MAX"] ?? "20"),
      },
    ]),
    AIModule,
    StorageModule,
    ExperienceModule,
    ChatModule,
    LandingModule,
  ],
  controllers: [HealthController, ChatController],
  providers: [ChatGateway],
})
export class AppModule {}
