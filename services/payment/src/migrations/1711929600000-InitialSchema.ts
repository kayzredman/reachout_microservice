import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1711929600000 implements MigrationInterface {
  name = 'InitialSchema1711929600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orgId" character varying NOT NULL,
        "txRef" character varying NOT NULL,
        "provider" character varying NOT NULL,
        "providerRef" character varying,
        "amount" numeric(10,2) NOT NULL,
        "currency" character varying(3) NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "tier" character varying NOT NULL,
        "customerEmail" character varying,
        "paymentMethod" character varying,
        "meta" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
  }
}
