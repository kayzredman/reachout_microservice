import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Ticket } from './ticket.entity.js';

export enum SenderRole {
  USER = 'user',
  ADMIN = 'admin',
  SYSTEM = 'system',
}

@Entity('ticket_messages')
@Index(['ticketId', 'createdAt'])
export class TicketMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  ticketId!: string;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket!: Ticket;

  /** Clerk user ID of the sender */
  @Column()
  senderId!: string;

  @Column({ type: 'enum', enum: SenderRole })
  senderRole!: SenderRole;

  /** Display name (cached at send time) */
  @Column({ nullable: true })
  senderName?: string;

  @Column({ type: 'text' })
  content!: string;

  /** Whether this message was also sent via WhatsApp */
  @Column({ default: false })
  sentViaWhatsApp!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
