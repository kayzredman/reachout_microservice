import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Read-only mirror of PostEntity from the post service.
 * Used by analytics to query the same faithreach_post database.
 */
@Entity()
export class PostEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  organizationId!: string;

  @Column()
  createdBy!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'text', nullable: true })
  imageUrl?: string;

  @Column({ type: 'jsonb', default: [] })
  platforms!: string[];

  @Column({ default: 'draft' })
  status!: 'draft' | 'scheduled' | 'publishing' | 'published' | 'partially_failed' | 'failed';

  @Column({ type: 'jsonb', default: [] })
  publishResults!: {
    platform: string;
    status: 'pending' | 'published' | 'failed';
    platformPostId?: string;
    error?: string;
  }[];

  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  seriesId?: string;

  @Column({ type: 'int', nullable: true })
  seriesNumber?: number;

  @Column({ type: 'varchar', nullable: true })
  broadcastMode?: 'direct' | 'broadcast';

  @Column({ type: 'uuid', nullable: true })
  broadcastId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
