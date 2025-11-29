import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMatchApplicantToNotificationEnums1734569700000 implements MigrationInterface {
  name = 'AddMatchApplicantToNotificationEnums1734569700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'match_applicant' to notifications_type_enum if it doesn't exist
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'match_applicant' 
          AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'notifications_type_enum'
          )
        ) THEN
          ALTER TYPE "notifications_type_enum" ADD VALUE 'match_applicant';
        END IF;
      END $$;
    `);

    // Add 'match_applicant' to notification_preferences_notificationtype_enum if it doesn't exist
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'match_applicant' 
          AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'notification_preferences_notificationtype_enum'
          )
        ) THEN
          ALTER TYPE "notification_preferences_notificationtype_enum" ADD VALUE 'match_applicant';
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL does not support removing enum values directly
    // This would require recreating the enum type, which is complex and risky
    // For now, we'll leave the enum value in place
    // If removal is absolutely necessary, it would require:
    // 1. Creating a new enum without 'match_applicant'
    // 2. Altering the column to use the new enum
    // 3. Dropping the old enum
    // This is not implemented here as it's a destructive operation
    console.warn('Cannot remove enum values in PostgreSQL. Manual intervention required if rollback is needed.');
  }
}

