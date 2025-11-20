import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUltimateToRatingTypeEnum1734567900000 implements MigrationInterface {
  name = 'AddUltimateToRatingTypeEnum1734567900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'ULTIMATE' to the users_ratingtype_enum if it doesn't exist
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'ULTIMATE' 
          AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'users_ratingtype_enum'
          )
        ) THEN
          ALTER TYPE "users_ratingtype_enum" ADD VALUE 'ULTIMATE';
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum type, which is complex
    // For now, we'll leave it as a no-op
    // In production, you'd need to:
    // 1. Create a new enum without ULTIMATE
    // 2. Update all columns to use the new enum
    // 3. Drop the old enum
    // This is a destructive operation, so we skip it
  }
}

