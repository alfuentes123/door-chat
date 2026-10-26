import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { Message } from './entities/message.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';


@Module({
  controllers: [ChatController],
  providers: [ChatService],
  imports: [TypeOrmModule.forFeature([Message]), UsersModule],
})
export class ChatModule {}
