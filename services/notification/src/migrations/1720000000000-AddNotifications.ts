import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotifications1720000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "organizationId" character varying NOT NULL,
        "title" character varying NOT NULL,
        "body" text NOT NULL,
        "read" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user_org_read"
      ON "notifications" ("userId", "organizationId", "read")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_notifications_user_org_read"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
