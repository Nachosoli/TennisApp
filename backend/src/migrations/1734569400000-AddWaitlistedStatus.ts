import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWaitlistedStatus1734569400000 implements MigrationInterface {
  name = 'AddWaitlistedStatus1734569400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'waitlisted' value to applications_status_enum
    await queryRunner.query(`
      -- Convert column to text temporarily
      ALTER TABLE "applications" ALTER COLUMN "status" TYPE text;
      
      -- Drop old enum
      DROP TYPE IF EXISTS "applications_status_enum" CASCADE;
      
      -- Create new enum with waitlisted value added
      CREATE TYPE "applications_status_enum" AS ENUM('pending', 'confirmed', 'rejected', 'waitlisted', 'expired');
      
      -- Convert column back to enum
      ALTER TABLE "applications" ALTER COLUMN "status" TYPE "applications_status_enum" USING "status"::"applications_status_enum";
      
      -- Restore default value
      ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'pending'::"applications_status_enum";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove 'waitlisted' value from enum
    // First, update any waitlisted applications to rejected
    await queryRunner.query(`
      UPDATE "applications" 
      SET "status" = 'rejected' 
      WHERE "status" = 'waitlisted';
    `);

    await queryRunner.query(`
      -- Convert column to text temporarily
      ALTER TABLE "applications" ALTER COLUMN "status" TYPE text;
      ALTER TABLE "applications" ALTER COLUMN "status" DROP DEFAULT;
      
      -- Drop old enum
      DROP TYPE IF EXISTS "applications_status_enum" CASCADE;
      
      -- Create enum without waitlisted
      CREATE TYPE "applications_status_enum" AS ENUM('pending', 'confirmed', 'rejected', 'expired');
      
      -- Convert column back to enum
      ALTER TABLE "applications" ALTER COLUMN "status" TYPE "applications_status_enum" USING "status"::"applications_status_enum";
      
      -- Restore default value
      ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'pending'::"applications_status_enum";
    `);
  }
}











