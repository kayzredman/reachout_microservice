import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1711929600000 implements MigrationInterface {
  name = 'InitialSchema1711929600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "post_entity" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" character varying NOT NULL,
        "createdBy" character varying NOT NULL,
        "content" text NOT NULL,
        "imageUrl" text,
        "platforms" jsonb NOT NULL DEFAULT '[]',
        "status" character varying NOT NULL DEFAULT 'draft',
        "publishResults" jsonb NOT NULL DEFAULT '[]',
        "scheduledAt" TIMESTAMP WITH TIME ZONE,
        "publishedAt" TIMESTAMP WITH TIME ZONE,
        "seriesId" uuid,
        "seriesNumber" integer,
        "broadcastMode" character varying,
        "broadcastId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_post_entity_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "series_entity" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organizationId" character varying NOT NULL,
        "createdBy" character varying NOT NULL,
        "title" character varying NOT NULL,
        "theme" character varying,
        "description" text,
        "status" character varying NOT NULL DEFAULT 'Active',
        "color" character varying NOT NULL DEFAULT '#10b981',
        "totalPosts" integer NOT NULL DEFAULT 0,
        "startDate" date,
        "endDate" date,
        "platforms" jsonb NOT NULL DEFAULT '[]',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_series_entity_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "post_metrics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "postId" character varying NOT NULL,
        "platform" character varying NOT NULL,
        "platformPostId" character varying NOT NULL,
        "impressions" integer NOT NULL DEFAULT 0,
        "likes" integer NOT NULL DEFAULT 0,
        "comments" integer NOT NULL DEFAULT 0,
        "shares" integer NOT NULL DEFAULT 0,
        "reach" integer NOT NULL DEFAULT 0,
        "views" integer NOT NULL DEFAULT 0,
        "saves" integer NOT NULL DEFAULT 0,
        "engagementRate" numeric(8,4) NOT NULL DEFAULT 0,
        "deliveryStatus" character varying,
        "fetchedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_post_metrics_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_post_metrics_postId_platform"
      ON "post_metrics" ("postId", "platform")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "post_metrics"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "series_entity"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "post_entity"`);
  }
}
