import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1711929600000 implements MigrationInterface {
  name = 'InitialSchema1711929600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orgId" character varying NOT NULL,
        "tier" character varying NOT NULL DEFAULT 'starter',
        "status" character varying NOT NULL DEFAULT 'active',
        "currentPeriodEnd" TIMESTAMP WITH TIME ZONE,
        "paymentProvider" character varying,
        "paymentCustomerId" character varying,
        "paymentSubscriptionId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_subscriptions_orgId" UNIQUE ("orgId"),
        CONSTRAINT "PK_subscriptions_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions"`);
  }
}
