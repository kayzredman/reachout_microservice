import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Message } from './message.entity.js';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  orgId!: string;

  @Column()
  userId!: string;

  /** Links conversation to a ticket (nullable for quick-chat sessions) */
  @Column({ nullable: true })
  ticketId?: string;

  @OneToMany(() => Message, (m) => m.conversation, { cascade: true })
  messages!: Message[];

  @CreateDateColumn()
  createdAt!: Date;
}
