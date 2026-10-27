import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: 'http://localhost:5173', credentials: true },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;
 
  notifyMessagesChanged(): void {
    this.server.emit('messages.changed');
    console.log('Emitted messages.changed');
  }
}
