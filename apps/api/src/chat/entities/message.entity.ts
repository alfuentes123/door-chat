import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";


@Entity('messages')
@Index(['senderId', 'clientMessageId'], { unique: true })
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;
 
  @Column('uuid')
  senderId: string;
 
  @Column('uuid')
  recipientId: string;
 
  @Column('uuid')
  clientMessageId: string;
 
  @Column({ type: 'text' })
  content: string;
 
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
