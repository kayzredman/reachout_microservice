import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class PostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Clerk organization ID */
  @Column()
  organizationId!: string;

  /** Clerk user ID who created the post */
  @Column()
  createdBy!: string;

  /** The text content of the post */
  @Column({ type: 'text' })
  content!: string;

  /** Optional image URL for image-based platforms (Instagram, Facebook) */
  @Column({ type: 'text', nullable: true })
  imageUrl?: string;

  /** Selected platforms: e.g. ["Instagram", "Facebook", "X (Twitter)"] */
  @Column({ type: 'jsonb', default: [] })
  platforms!: string[];

  /** Overall post status */
  @Column({ default: 'draft' })
  status!: 'draft' | 'scheduled' | 'publishing' | 'published' | 'partially_failed' | 'failed';

  /** Per-platform publish results */
  @Column({ type: 'jsonb', default: [] })
  publishResults!: {
    platform: string;
    status: 'pending' | 'published' | 'failed';
    platformPostId?: string;
    error?: string;
  }[];

  /** Scheduled time (null = immediate publish) */
  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt?: Date;

  /** When the post was actually published */
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  /** Optional series association */
  @Column({ type: 'uuid', nullable: true })
  seriesId?: string;

  /** Order within a series (1, 2, 3...) */
  @Column({ type: 'int', nullable: true })
  seriesNumber?: number;

  /** Broadcast mode: 'direct' (default single send) or 'broadcast' (CSV broadcast) */
  @Column({ type: 'varchar', nullable: true })
  broadcastMode?: 'direct' | 'broadcast';

  /** ID of the BroadcastLog (from platform-integration) when broadcastMode = 'broadcast' */
  @Column({ type: 'uuid', nullable: true })
  broadcastId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
