import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity()
@Index(['postId', 'platform'], { unique: false })
export class PostMetrics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** References PostEntity.id */
  @Column()
  postId!: string;

  /** Which platform these metrics are from */
  @Column()
  platform!: string;

  /** Platform-specific post/media ID used to fetch metrics */
  @Column()
  platformPostId!: string;

  /** Number of times the post was shown in feeds */
  @Column({ type: 'int', default: 0 })
  impressions!: number;

  /** Number of likes/reactions */
  @Column({ type: 'int', default: 0 })
  likes!: number;

  /** Number of comments/replies */
  @Column({ type: 'int', default: 0 })
  comments!: number;

  /** Number of shares/retweets/reposts */
  @Column({ type: 'int', default: 0 })
  shares!: number;

  /** Unique accounts that saw the post */
  @Column({ type: 'int', default: 0 })
  reach!: number;

  /** Video views or link clicks */
  @Column({ type: 'int', default: 0 })
  views!: number;

  /** Bookmarks/saves */
  @Column({ type: 'int', default: 0 })
  saves!: number;

  /** Engagement rate = (likes+comments+shares) / impressions */
  @Column({ type: 'decimal', precision: 8, scale: 4, default: 0 })
  engagementRate!: number;

  /** WhatsApp-specific: message delivery status */
  @Column({ nullable: true })
  deliveryStatus?: 'sent' | 'delivered' | 'read' | 'failed';

  /** When these metrics were last fetched from the platform */
  @CreateDateColumn()
  fetchedAt!: Date;
}
