import { Body, Controller, Get, Post, Req, Res, Session } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import session from 'express-session';
import { LoginDto } from './dto/login.dto';
import type { Request, Response } from 'express';



@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Session() session: session.SessionData) {
    const user = await this.authService.register(dto);
    session.userId = user.id;
    console.log('Registered user:', user);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Session() session: session.SessionData) {
    const user = await this.authService.login(dto.username, dto.password);
    session.userId = user.id;
    console.log('Logged in user:', user);
  }

  @Post('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy((error) => {
      if (error) return res.status(500).send('Logout failed');
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out' });
    });
  }

  @Get('me')
  async getCurrentUser(@Session() session: session.SessionData): Promise<Omit<User, "passwordHash"> | null> {
    if (!session.userId) {
      return null;
    }
    const user = await this.authService.getCurrentUser(session.userId);
    if (!user) {
      return null;
    }
    return user;
  }

}
