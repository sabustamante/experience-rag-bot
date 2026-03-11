import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";

import { ChatService } from "../../domain/services/chat.service";

interface SendMessagePayload {
  message: string;
  sessionId: string;
}

@WebSocketGateway({ cors: { origin: "*" }, namespace: "/chat" })
export class ChatGateway implements OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly chatService: ChatService) {}

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("chat:send")
  async handleMessage(
    @MessageBody() payload: SendMessagePayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { message, sessionId } = payload;
    this.logger.log(`chat:send from session ${sessionId}`);

    try {
      for await (const token of this.chatService.chat(message, sessionId)) {
        if (!client.connected) break;
        client.emit("chat:token", { token });
      }
      client.emit("chat:end", { sessionId });
    } catch (err) {
      this.logger.error("Error streaming chat response", err);
      client.emit("chat:error", { message: "Failed to process message" });
    }
  }
}
