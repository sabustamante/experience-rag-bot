import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown hooks (onModuleDestroy, onApplicationShutdown)
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({ origin: process.env["CORS_ORIGIN"] ?? "*" });

  const port = parseInt(process.env["PORT"] ?? "3001");
  await app.listen(port);

  console.log(`API running on http://localhost:${port}`);

  // Handle SIGTERM for clean container stop (drains in-flight requests)
  process.on("SIGTERM", () => {
    console.log("SIGTERM received — shutting down gracefully");
    void app.close().then(() => process.exit(0));
  });
}

void bootstrap();
