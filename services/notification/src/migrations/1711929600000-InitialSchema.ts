import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1711929600000 implements MigrationInterface {
  name = 'InitialSchema1711929600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_prefs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" character varying NOT NULL,
        "userId" character varying NOT NULL,
        "scheduled" boolean NOT NULL DEFAULT true,
        "engagement" boolean NOT NULL DEFAULT true,
        "followers" boolean NOT NULL DEFAULT true,
        "tips" boolean NOT NULL DEFAULT true,
        "push" boolean NOT NULL DEFAULT false,
        "weeklyReport" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_notification_prefs_org_user" UNIQUE ("organizationId", "userId"),
        CONSTRAINT "PK_notification_prefs_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_prefs"`);
  }
}
