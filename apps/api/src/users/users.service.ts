import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
    constructor(
  @InjectRepository(User)
  private readonly usersRepository: Repository<User>,
) {}

    async findByUsername(username: string): Promise<User | null> {
        const result = await this.usersRepository.findOne({ where: { username } });
        if (result) {
            return result;
        }
        return null;
    }

    async findPublicById(id: string): Promise<Omit<User, "passwordHash"> | null> {
        const result = await this.usersRepository.findOne({ where: { id } });
        if (result) {
            const { passwordHash, ...publicUser } = result;
            return publicUser;
        }
        return null;
    }

    async findPublicUsers(excludeId: string): Promise<Omit<User, "passwordHash">[] | null> {
        const result = await this.usersRepository.find({ where: { id: Not(excludeId) } });
        if (result) {
            return result.map(({ passwordHash, ...publicUser }) => publicUser);
        }
        return null;
    }

    async create(username: string, displayName: string, passwordHash: string): Promise<User> {
        const user = this.usersRepository.create({ username, displayName, passwordHash });
        return await this.usersRepository.save(user);
    }

}
