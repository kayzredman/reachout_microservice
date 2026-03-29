import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class BroadcastRecipient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** The parent broadcast log */
  @Column()
  broadcastId!: string;

  /** Recipient phone number (E.164) */
  @Column()
  phone!: string;

  /** Baileys message ID (for tracking delivery/read receipts) */
  @Column({ nullable: true })
  messageId?: string;

  /** Delivery lifecycle status */
  @Column({ default: 'queued' })
  status!: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

  /** Failure reason if status is 'failed' */
  @Column({ nullable: true })
  failureReason?: string;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  readAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
