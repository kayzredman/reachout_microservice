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
  status!: 'draft' | 'publishing' | 'published' | 'partially_failed' | 'failed';

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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
