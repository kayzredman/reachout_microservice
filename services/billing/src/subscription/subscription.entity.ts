import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type SubscriptionTier = 'starter' | 'creator' | 'ministry_pro';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orgId: string;

  @Column({ type: 'varchar', default: 'starter' })
  tier: SubscriptionTier;

  @Column({ type: 'varchar', default: 'active' })
  status: SubscriptionStatus;

  @Column({ type: 'timestamptz', nullable: true })
  currentPeriodEnd: Date;

  @Column({ type: 'varchar', nullable: true })
  paymentProvider: string;

  @Column({ type: 'varchar', nullable: true })
  paymentCustomerId: string;

  @Column({ type: 'varchar', nullable: true })
  paymentSubscriptionId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
