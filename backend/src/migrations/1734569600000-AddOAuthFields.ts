import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOAuthFields1734569600000 implements MigrationInterface {
  name = 'AddOAuthFields1734569600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make password_hash nullable to support OAuth users
    await queryRunner.query(`
      ALTER TABLE "users" 
      ALTER COLUMN "password_hash" DROP NOT NULL;
    `);

    // Add provider column
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "provider" character varying;
    `);

    // Add provider_id column
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "provider_id" character varying;
    `);

    // Add index on provider and provider_id for faster lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_users_provider_provider_id" 
      ON "users" ("provider", "provider_id") 
      WHERE "provider" IS NOT NULL AND "provider_id" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_users_provider_provider_id";
    `);

    // Drop provider_id column
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "provider_id";
    `);

    // Drop provider column
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "provider";
    `);

    // Make password_hash NOT NULL again (only if all users have passwords)
    // Note: This might fail if there are OAuth users without passwords
    await queryRunner.query(`
      ALTER TABLE "users" 
      ALTER COLUMN "password_hash" SET NOT NULL;
    `);
  }
}

