import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { resolve } from 'node:path';
import { User } from './users/entities/user.entity';
import { Message } from './chat/entities/message.entity';

config({ path: resolve(process.cwd(), '.env') });

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Message],
  migrations: [resolve(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: false,
});
