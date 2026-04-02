import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1711929600000 implements MigrationInterface {
  name = 'InitialSchema1711929600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "ticket_status_enum" AS ENUM('open','ai_handled','escalated','in_progress','resolved','closed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "ticket_priority_enum" AS ENUM('low','medium','high','critical');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "ticket_category_enum" AS ENUM('general','billing','platform','publishing','account','bug','feature_request');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "message_role_enum" AS ENUM('user','assistant','system');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // Tickets
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tickets" (
        "id"              uuid DEFAULT uuid_generate_v4() NOT NULL,
        "orgId"           varchar NOT NULL,
        "userId"          varchar NOT NULL,
        "subject"         varchar NOT NULL,
        "description"     text NOT NULL,
        "status"          "ticket_status_enum" DEFAULT 'open' NOT NULL,
        "priority"        "ticket_priority_enum" DEFAULT 'medium' NOT NULL,
        "category"        "ticket_category_enum" DEFAULT 'general' NOT NULL,
        "aiSummary"       text,
        "assignedTo"      varchar,
        "healthSignals"   jsonb,
        "resolvedAt"      TIMESTAMP,
        "createdAt"       TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tickets" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tickets_org_status"
      ON "tickets" ("orgId", "status");
    `);

    // Conversations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "conversations" (
        "id"              uuid DEFAULT uuid_generate_v4() NOT NULL,
        "orgId"           varchar NOT NULL,
        "userId"          varchar NOT NULL,
        "ticketId"        varchar,
        "createdAt"       TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversations" PRIMARY KEY ("id")
      );
    `);

    // Messages
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "messages" (
        "id"              uuid DEFAULT uuid_generate_v4() NOT NULL,
        "conversationId"  uuid NOT NULL,
        "role"            "message_role_enum" NOT NULL,
        "content"         text NOT NULL,
        "actions"         jsonb,
        "createdAt"       TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_messages_conversation"
          FOREIGN KEY ("conversationId")
          REFERENCES "conversations"("id")
          ON DELETE CASCADE
      );
    `);

    // uuid-ossp extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "conversations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tickets"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "message_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ticket_category_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ticket_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ticket_status_enum"`);
  }
}
