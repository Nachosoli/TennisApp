import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowMultipleApplicationsPerSlot1734569300000 implements MigrationInterface {
  name = 'AllowMultipleApplicationsPerSlot1734569300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the existing unique constraint on match_slot_id
    // This allows multiple users to apply to the same slot
    await queryRunner.query(`
      ALTER TABLE "applications" 
      DROP CONSTRAINT IF EXISTS "UQ_applications_match_slot_id";
    `);

    // Add a composite unique constraint on (match_slot_id, applicant_user_id)
    // This prevents the same user from applying twice to the same slot
    // but allows multiple different users to apply to the same slot
    await queryRunner.query(`
      ALTER TABLE "applications" 
      ADD CONSTRAINT "UQ_applications_match_slot_applicant" 
      UNIQUE ("match_slot_id", "applicant_user_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the composite unique constraint
    await queryRunner.query(`
      ALTER TABLE "applications" 
      DROP CONSTRAINT IF EXISTS "UQ_applications_match_slot_applicant";
    `);

    // Restore the original unique constraint on match_slot_id
    await queryRunner.query(`
      ALTER TABLE "applications" 
      ADD CONSTRAINT "UQ_applications_match_slot_id" 
      UNIQUE ("match_slot_id");
    `);
  }
}










