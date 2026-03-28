import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity()
@Unique(['organizationId', 'platform'])
export class PlatformConnection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Clerk organization ID (org_xxx) */
  @Column()
  organizationId!: string;

  /** Platform name: Instagram | Facebook | X (Twitter) | YouTube | WhatsApp */
  @Column()
  platform!: string;

  /** Whether this connection is currently active */
  @Column({ default: false })
  connected!: boolean;

  /** Display handle/name for the connected account */
  @Column({ nullable: true })
  handle?: string;

  /** OAuth access token (encrypted at rest in production) */
  @Column({ nullable: true })
  accessToken?: string;

  /** OAuth refresh token */
  @Column({ nullable: true })
  refreshToken?: string;

  /** Token expiry timestamp */
  @Column({ type: 'timestamptz', nullable: true })
  tokenExpiresAt?: Date;

  /** Platform-specific account/page ID */
  @Column({ nullable: true })
  platformAccountId?: string;

  /** WhatsApp-specific: verified phone number */
  @Column({ nullable: true })
  phoneNumber?: string;

  /** WhatsApp Channel ID for broadcasting via Channels */
  @Column({ nullable: true })
  channelId?: string;

  /** Clerk user ID who connected this platform */
  @Column()
  connectedBy!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
