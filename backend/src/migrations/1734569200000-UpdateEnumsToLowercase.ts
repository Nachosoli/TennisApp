import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEnumsToLowercase1734569200000 implements MigrationInterface {
  name = 'UpdateEnumsToLowercase1734569200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Update users_ratingtype_enum: UTR, USTA, ULTIMATE, CUSTOM -> utr, usta, ultimate, custom
    await queryRunner.query(`
      -- Convert column to text temporarily
      ALTER TABLE "users" ALTER COLUMN "rating_type" TYPE text;
      
      -- Update existing values to lowercase
      UPDATE "users" SET "rating_type" = LOWER("rating_type") WHERE "rating_type" IS NOT NULL;
      
      -- Drop old enum
      DROP TYPE IF EXISTS "users_ratingtype_enum";
      
      -- Create new enum with lowercase values
      CREATE TYPE "users_ratingtype_enum" AS ENUM('utr', 'usta', 'ultimate', 'custom');
      
      -- Convert column back to enum
      ALTER TABLE "users" ALTER COLUMN "rating_type" TYPE "users_ratingtype_enum" USING "rating_type"::"users_ratingtype_enum";
    `);

    // 2. Update courts_surfacetype_enum: Hard, Clay, Grass, Indoor -> hard, clay, grass, indoor
    // First check if matches.surface_filter exists and convert it too
    await queryRunner.query(`
      DO $$
      BEGIN
        -- Convert matches.surface_filter to text if it exists
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'matches' AND column_name = 'surface_filter'
        ) THEN
          ALTER TABLE "matches" ALTER COLUMN "surface_filter" TYPE text;
          UPDATE "matches" SET "surface_filter" = LOWER("surface_filter") WHERE "surface_filter" IS NOT NULL;
        END IF;
      END $$;
    `);
    
    await queryRunner.query(`
      -- Convert column to text temporarily
      ALTER TABLE "courts" ALTER COLUMN "surface_type" TYPE text;
      
      -- Update existing values to lowercase
      UPDATE "courts" SET "surface_type" = LOWER("surface_type") WHERE "surface_type" IS NOT NULL;
      
      -- Drop old enum (CASCADE to handle dependencies)
      DROP TYPE IF EXISTS "courts_surfacetype_enum" CASCADE;
      
      -- Create new enum with lowercase values
      CREATE TYPE "courts_surfacetype_enum" AS ENUM('hard', 'clay', 'grass', 'indoor');
      
      -- Convert column back to enum
      ALTER TABLE "courts" ALTER COLUMN "surface_type" TYPE "courts_surfacetype_enum" USING "surface_type"::"courts_surfacetype_enum";
    `);
    
    // Convert matches.surface_filter back to enum if it exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'matches' AND column_name = 'surface_filter'
        ) THEN
          ALTER TABLE "matches" ALTER COLUMN "surface_filter" TYPE "courts_surfacetype_enum" USING "surface_filter"::"courts_surfacetype_enum";
        END IF;
      END $$;
    `);

    // 3. Update users_subscription_status_enum: FREE, ACTIVE, EXPIRED, CANCELLED -> free, active, expired, cancelled
    await queryRunner.query(`
      -- Convert column to text temporarily (this will also remove the default)
      ALTER TABLE "users" ALTER COLUMN "subscription_status" TYPE text;
      ALTER TABLE "users" ALTER COLUMN "subscription_status" DROP DEFAULT;
      
      -- Update existing values to lowercase
      UPDATE "users" SET "subscription_status" = LOWER("subscription_status") WHERE "subscription_status" IS NOT NULL;
      
      -- Drop old enum (CASCADE to handle dependencies)
      DROP TYPE IF EXISTS "users_subscription_status_enum" CASCADE;
      
      -- Create new enum with lowercase values
      CREATE TYPE "users_subscription_status_enum" AS ENUM('free', 'active', 'expired', 'cancelled');
      
      -- Convert column back to enum and restore default
      ALTER TABLE "users" ALTER COLUMN "subscription_status" TYPE "users_subscription_status_enum" USING "subscription_status"::"users_subscription_status_enum";
      ALTER TABLE "users" ALTER COLUMN "subscription_status" SET DEFAULT 'free'::"users_subscription_status_enum";
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse: Convert back to original case
    
    // 1. Revert users_ratingtype_enum
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "rating_type" TYPE text;
      UPDATE "users" SET "rating_type" = UPPER("rating_type") WHERE "rating_type" IN ('utr', 'usta', 'custom');
      UPDATE "users" SET "rating_type" = 'ULTIMATE' WHERE "rating_type" = 'ultimate';
      DROP TYPE IF EXISTS "users_ratingtype_enum";
      CREATE TYPE "users_ratingtype_enum" AS ENUM('UTR', 'USTA', 'ULTIMATE', 'CUSTOM');
      ALTER TABLE "users" ALTER COLUMN "rating_type" TYPE "users_ratingtype_enum" USING "rating_type"::"users_ratingtype_enum";
    `);

    // 2. Revert courts_surfacetype_enum
    await queryRunner.query(`
      ALTER TABLE "courts" ALTER COLUMN "surface_type" TYPE text;
      UPDATE "courts" SET "surface_type" = INITCAP("surface_type") WHERE "surface_type" IS NOT NULL;
      DROP TYPE IF EXISTS "courts_surfacetype_enum";
      CREATE TYPE "courts_surfacetype_enum" AS ENUM('Hard', 'Clay', 'Grass', 'Indoor');
      ALTER TABLE "courts" ALTER COLUMN "surface_type" TYPE "courts_surfacetype_enum" USING "surface_type"::"courts_surfacetype_enum";
    `);

    // 3. Revert users_subscription_status_enum
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "subscription_status" TYPE text;
      UPDATE "users" SET "subscription_status" = UPPER("subscription_status") WHERE "subscription_status" IS NOT NULL;
      DROP TYPE IF EXISTS "users_subscription_status_enum";
      CREATE TYPE "users_subscription_status_enum" AS ENUM('FREE', 'ACTIVE', 'EXPIRED', 'CANCELLED');
      ALTER TABLE "users" ALTER COLUMN "subscription_status" TYPE "users_subscription_status_enum" USING "subscription_status"::"users_subscription_status_enum";
    `);

    // 4. Revert matches.surface_filter if it exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'matches' AND column_name = 'surface_filter'
        ) THEN
          ALTER TABLE "matches" ALTER COLUMN "surface_filter" TYPE text;
          UPDATE "matches" SET "surface_filter" = INITCAP("surface_filter") WHERE "surface_filter" IS NOT NULL;
          ALTER TABLE "matches" ALTER COLUMN "surface_filter" TYPE "courts_surfacetype_enum" USING "surface_filter"::"courts_surfacetype_enum";
        END IF;
      END $$;
    `);
  }
}

