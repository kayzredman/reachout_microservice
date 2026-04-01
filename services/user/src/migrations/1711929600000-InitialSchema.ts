import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1711929600000 implements MigrationInterface {
  name = 'InitialSchema1711929600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" character varying NOT NULL,
        "name" character varying NOT NULL,
        "email" character varying NOT NULL,
        "imageUrl" character varying,
        "role" character varying,
        "organization" character varying,
        "bio" character varying,
        "location" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_email" UNIQUE ("email"),
        CONSTRAINT "PK_user_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user"`);
  }
}
