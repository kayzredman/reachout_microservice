import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class SeriesEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  organizationId!: string;

  @Column()
  createdBy!: string;

  @Column()
  title!: string;

  @Column({ nullable: true })
  theme?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  /** Active | Upcoming | Completed */
  @Column({ default: 'Active' })
  status!: 'Active' | 'Upcoming' | 'Completed';

  @Column({ default: '#10b981' })
  color!: string;

  @Column({ type: 'int', default: 0 })
  totalPosts!: number;

  @Column({ type: 'date', nullable: true })
  startDate?: string;

  @Column({ type: 'date', nullable: true })
  endDate?: string;

  /** Platforms to publish series posts to */
  @Column({ type: 'jsonb', default: [] })
  platforms!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
