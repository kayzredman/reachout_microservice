import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity()
@Unique(['organizationId', 'userId'])
export class NotificationPrefs {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  organizationId!: string;

  @Column()
  userId!: string;

  @Column({ default: true })
  scheduled!: boolean;

  @Column({ default: true })
  engagement!: boolean;

  @Column({ default: true })
  followers!: boolean;

  @Column({ default: true })
  tips!: boolean;

  @Column({ default: false })
  push!: boolean;

  @Column({ default: true })
  weeklyReport!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
