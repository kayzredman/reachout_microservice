import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class BroadcastLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  organizationId!: string;

  /** Reference to the post that triggered this broadcast */
  @Column({ nullable: true })
  postId?: string;

  /** The message content that was broadcast */
  @Column('text')
  message!: string;

  /** Total number of recipients in this broadcast */
  @Column({ default: 0 })
  totalRecipients!: number;

  /** Count of messages successfully sent */
  @Column({ default: 0 })
  sent!: number;

  /** Count of messages confirmed delivered */
  @Column({ default: 0 })
  delivered!: number;

  /** Count of messages confirmed read (blue checks) */
  @Column({ default: 0 })
  read!: number;

  /** Count of messages that failed */
  @Column({ default: 0 })
  failed!: number;

  /** Overall broadcast status */
  @Column({ default: 'sending' })
  status!: 'sending' | 'completed' | 'partial' | 'failed';

  @CreateDateColumn()
  createdAt!: Date;
}
