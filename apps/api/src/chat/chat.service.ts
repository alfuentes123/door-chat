import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(Message) private messageRepository: Repository<Message>,
        private usersService: UsersService
    ) {}

    async send(senderId: string, dto: SendMessageDto) {
        if (senderId === dto.recipientId) {
            throw new BadRequestException('Cannot send message to yourself.');
        }

        const recipient = await this.usersService.findPublicById(dto.recipientId);
        if (!recipient) {
            throw new BadRequestException('Recipient does not exist.');
        }

        const trimmedContent = dto.content.trim();
        if (trimmedContent.length === 0) {
            throw new BadRequestException('Message content cannot be empty.');
        }

        const rowCheck = await this.messageRepository.findOneBy({
            senderId: senderId,
            clientMessageId: dto.clientMessageId   
            });
        if (rowCheck) {
            if (rowCheck.recipientId === dto.recipientId && rowCheck.content === trimmedContent) {
                return rowCheck;
            }
            else {
                throw new ConflictException('Client message ID already exists with different content or recipient.');
            }
        }

        const newMessage = this.messageRepository.create({
            senderId: senderId,
            recipientId: dto.recipientId,
            clientMessageId: dto.clientMessageId,
            content: trimmedContent,
        });

        try {
            const savedMessage = await this.messageRepository.save(newMessage);
            return {
                id: savedMessage.id,
                senderId: savedMessage.senderId,
                recipientId: savedMessage.recipientId,
                clientMessageId: savedMessage.clientMessageId,
                content: savedMessage.content,
                createdAt: savedMessage.createdAt,
            };
        }
        catch (error) {
            if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
                const existingMessage = await this.messageRepository.findOneBy({
                    senderId: senderId,
                    clientMessageId: dto.clientMessageId
                });
                if (existingMessage) {
                    if (existingMessage.recipientId === dto.recipientId && existingMessage.content === trimmedContent) {
                        return existingMessage;
                    }
                    throw new ConflictException('Message already exists with different content or recipient.');
                }
            }
            throw error;
        }


            
    }

    async history(currentUserId: string, otherUserId: string) {
        const otherUser = await this.usersService.findPublicById(otherUserId);
        if (!otherUser) {
            throw new BadRequestException('The other user does not exist.');
        }
        
        const messages = await this.messageRepository.find({
            take: 100,
            where: [
                { senderId: currentUserId, recipientId: otherUserId },
                { senderId: otherUserId, recipientId: currentUserId }
            ],
            order: { createdAt: 'DESC', id: 'DESC' },
        });

        return messages.reverse().map(message => ({
            id: message.id,
            senderId: message.senderId,
            recipientId: message.recipientId,
            clientMessageId: message.clientMessageId,
            content: message.content,
            createdAt: message.createdAt,
        }));
    }

}
