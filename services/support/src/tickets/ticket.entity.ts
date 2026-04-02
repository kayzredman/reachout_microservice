import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TicketStatus {
  OPEN = 'open',
  AI_HANDLED = 'ai_handled',
  ESCALATED = 'escalated',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum TicketCategory {
  GENERAL = 'general',
  BILLING = 'billing',
  PLATFORM = 'platform',
  PUBLISHING = 'publishing',
  ACCOUNT = 'account',
  BUG = 'bug',
  FEATURE_REQUEST = 'feature_request',
}

@Entity('tickets')
@Index(['orgId', 'status'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  orgId!: string;

  @Column()
  userId!: string;

  @Column()
  subject!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
  status!: TicketStatus;

  @Column({ type: 'enum', enum: TicketPriority, default: TicketPriority.MEDIUM })
  priority!: TicketPriority;

  @Column({ type: 'enum', enum: TicketCategory, default: TicketCategory.GENERAL })
  category!: TicketCategory;

  /** AI-generated summary of the conversation */
  @Column({ type: 'text', nullable: true })
  aiSummary?: string;

  /** Assigned admin user ID (if escalated) */
  @Column({ nullable: true })
  assignedTo?: string;

  /** Auto-detected issues that triggered this ticket */
  @Column({ type: 'jsonb', nullable: true })
  healthSignals?: Record<string, any>;

  @Column({ nullable: true })
  resolvedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
