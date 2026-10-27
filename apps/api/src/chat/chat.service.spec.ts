import { ConflictException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { ChatService } from './chat.service';
import { Message } from './entities/message.entity';
import { UsersService } from '../users/users.service';
import { ChatGateway } from './chat/chat.gateway';
import { SendMessageDto } from './dto/send-message.dto';

const dto: SendMessageDto = {
  recipientId: 'bob-id',
  clientMessageId: 'attempt-1',
  content: 'Hello Bob',
};
const stored = {
  id: 'message-1', senderId: 'alice-id', ...dto,
  createdAt: new Date('2026-10-01T12:00:00Z'),
} as Message;

const repository = {
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};
const usersService = { findPublicById: jest.fn() };
const chatGateway = { notifyMessagesChanged: jest.fn() };

const service = new ChatService(
  repository as unknown as Repository<Message>,
  usersService as unknown as UsersService,
  chatGateway as unknown as ChatGateway,
);

describe('ChatService.send', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    usersService.findPublicById.mockResolvedValue({ id: 'bob-id' });
    repository.findOneBy.mockResolvedValue(null);
    repository.create.mockImplementation((data: Partial<Message>) => data);
    repository.save.mockResolvedValue(stored);
  });

  it('saves and notifies for a new client ID', async () => {
    const result = await service.send('alice-id', dto);
    expect(result).toMatchObject({ id: 'message-1', content: 'Hello Bob' });
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(chatGateway.notifyMessagesChanged).toHaveBeenCalledTimes(1);
  });

  it('returns an identical retry without saving', async () => {
    repository.findOneBy.mockResolvedValue(stored);
    const result = await service.send('alice-id', dto);
    expect(result).toMatchObject({ id: 'message-1' });
    expect(repository.save).not.toHaveBeenCalled();
    expect(chatGateway.notifyMessagesChanged).not.toHaveBeenCalled();
  });

  it('rejects a reused ID with different content', async () => {
    repository.findOneBy.mockResolvedValue(stored);
    await expect(service.send('alice-id', { ...dto, content: 'Changed' }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
