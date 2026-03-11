import { Body, Controller, Get, Param, Post, Res } from "@nestjs/common";
import type { Response } from "express";

import { ChatService } from "../../domain/services/chat.service";
import { SendMessageDto } from "./dto/send-message.dto";

@Controller("api/chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * POST /api/chat/message
   * SSE streaming endpoint — streams LLM tokens as Server-Sent Events.
   */
  @Post("message")
  async sendMessage(@Body() dto: SendMessageDto, @Res() res: Response) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      for await (const token of this.chatService.chat(dto.message, dto.sessionId)) {
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
    } finally {
      res.end();
    }
  }

  /**
   * GET /api/chat/session/:id
   * Placeholder — returns session info (full persistence in Stage 2+).
   */
  @Get("session/:id")
  getSession(@Param("id") id: string) {
    return { sessionId: id, messages: [] };
  }
}
