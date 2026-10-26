import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { SessionGuard } from '../auth/session/session.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(SessionGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@CurrentUser() userId: string) {
    return this.usersService.findPublicUsers(userId);
  }

}
