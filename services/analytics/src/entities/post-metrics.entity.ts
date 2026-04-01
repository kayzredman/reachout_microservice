import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Read-only mirror of PostMetrics from the post service.
 * Used by analytics to query the same faithreach_post database.
 */
@Entity()
@Index(['postId', 'platform'], { unique: false })
export class PostMetrics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  postId!: string;

  @Column()
  platform!: string;

  @Column()
  platformPostId!: string;

  @Column({ type: 'int', default: 0 })
  impressions!: number;

  @Column({ type: 'int', default: 0 })
  likes!: number;

  @Column({ type: 'int', default: 0 })
  comments!: number;

  @Column({ type: 'int', default: 0 })
  shares!: number;

  @Column({ type: 'int', default: 0 })
  reach!: number;

  @Column({ type: 'int', default: 0 })
  views!: number;

  @Column({ type: 'int', default: 0 })
  saves!: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, default: 0 })
  engagementRate!: number;

  @Column({ nullable: true })
  deliveryStatus?: 'sent' | 'delivered' | 'read' | 'failed';

  @CreateDateColumn()
  fetchedAt!: Date;
}
