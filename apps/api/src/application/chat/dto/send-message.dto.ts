import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

import type { Language } from "@repo/shared-types";

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;

  @IsUUID()
  sessionId!: string;

  @IsOptional()
  @IsIn(["en", "es"])
  language?: Language;
}
