import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTicketMessages1743580800000 implements MigrationInterface {
  name = 'AddTicketMessages1743580800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "sender_role_enum" AS ENUM('user','admin','system');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ticket_messages" (
        "id"                uuid DEFAULT uuid_generate_v4() NOT NULL,
        "ticketId"          uuid NOT NULL,
        "senderId"          varchar NOT NULL,
        "senderRole"        "sender_role_enum" NOT NULL,
        "senderName"        varchar,
        "content"           text NOT NULL,
        "sentViaWhatsApp"   boolean DEFAULT false NOT NULL,
        "createdAt"         TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ticket_messages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ticket_messages_ticket"
          FOREIGN KEY ("ticketId")
          REFERENCES "tickets"("id")
          ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_ticket_messages_ticket_created"
      ON "ticket_messages" ("ticketId", "createdAt");
    `);

    // Add whatsappPhone to tickets for WhatsApp reply channel
    await queryRunner.query(`
      ALTER TABLE "tickets"
      ADD COLUMN IF NOT EXISTS "whatsappPhone" varchar;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN IF EXISTS "whatsappPhone"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ticket_messages"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sender_role_enum"`);
  }
}
