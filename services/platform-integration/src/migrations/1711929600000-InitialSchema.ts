import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1711929600000 implements MigrationInterface {
  name = 'InitialSchema1711929600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_connection" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" character varying NOT NULL,
        "platform" character varying NOT NULL,
        "connected" boolean NOT NULL DEFAULT false,
        "handle" character varying,
        "accessToken" character varying,
        "refreshToken" character varying,
        "tokenExpiresAt" TIMESTAMP WITH TIME ZONE,
        "platformAccountId" character varying,
        "phoneNumber" character varying,
        "channelId" character varying,
        "connectedBy" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_platform_org_platform" UNIQUE ("organizationId", "platform"),
        CONSTRAINT "PK_platform_connection_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "broadcast_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" character varying NOT NULL,
        "postId" character varying,
        "message" text NOT NULL,
        "totalRecipients" integer NOT NULL DEFAULT 0,
        "sent" integer NOT NULL DEFAULT 0,
        "delivered" integer NOT NULL DEFAULT 0,
        "read" integer NOT NULL DEFAULT 0,
        "failed" integer NOT NULL DEFAULT 0,
        "status" character varying NOT NULL DEFAULT 'sending',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_broadcast_log_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "broadcast_recipient" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "broadcastId" character varying NOT NULL,
        "phone" character varying NOT NULL,
        "messageId" character varying,
        "status" character varying NOT NULL DEFAULT 'queued',
        "failureReason" character varying,
        "sentAt" TIMESTAMP WITH TIME ZONE,
        "deliveredAt" TIMESTAMP WITH TIME ZONE,
        "readAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_broadcast_recipient_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "broadcast_recipient"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "broadcast_log"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_connection"`);
  }
}
