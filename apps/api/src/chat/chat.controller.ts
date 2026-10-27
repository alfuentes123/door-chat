import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SessionGuard } from '../auth/session/session.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SendMessageDto } from './dto/send-message.dto';

@UseGuards(SessionGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':otherUserId/messages')
  history(
    @CurrentUser() userId: string,
    @Param('otherUserId', new ParseUUIDPipe()) otherUserId: string,
  ) {
    return this.chatService.history(userId, otherUserId);
  }

  @Post('messages')
  send(
    @CurrentUser() userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.send(userId, dto);
  }


  
}
