import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

    async register(RegisterDto: RegisterDto): Promise<Omit<User, "passwordHash">> {
        const username = RegisterDto.username.toLowerCase().trim();
        const displayName = RegisterDto.displayName.trim();
        if (displayName === '') {
            throw new BadRequestException('Display name cannot be empty');
        }
        const existingUser = await this.usersService.findByUsername(username);
        if (existingUser) {
            throw new ConflictException('Username already exists');
        }
        const passwordHash = await argon2.hash(RegisterDto.password);
        let createdUser: Omit<User, "passwordHash">;
        try {
            createdUser = await this.usersService.create(username, displayName, passwordHash);
            return createdUser;
        }
        catch (error) {
            if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
                throw new ConflictException('Username already exists');
            }
            throw error;
        }
    }

    async login(username: string, password: string): Promise<Omit<User, "passwordHash">> {
        let foundUser: User | null;
        foundUser = await this.usersService.findByUsername(username);
        if (!foundUser) {
            throw new UnauthorizedException('Invalid username');
        }
        if (await argon2.verify(foundUser.passwordHash, password)) {
            const  { passwordHash, ...rest } = foundUser;
            return rest;
        }
        throw new UnauthorizedException('Invalid password');
    }

    async getCurrentUser(id: string): Promise<Omit<User, "passwordHash"> | null> {
        let user = await this.usersService.findPublicById(id);
        if (!user) {
            return null;
        }
        return user;
    }
}