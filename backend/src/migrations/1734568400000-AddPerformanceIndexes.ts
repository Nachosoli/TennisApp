import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1734568400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Index on matches.creator_user_id for faster user match lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_matches_creator_user_id" ON "matches" ("creator_user_id");
    `);

    // Index on matches.date for faster date-based queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_matches_date" ON "matches" ("date");
    `);

    // Index on matches.status for faster status filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_matches_status" ON "matches" ("status");
    `);

    // Index on applications.applicant_user_id for faster user application lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_applications_applicant_user_id" ON "applications" ("applicant_user_id");
    `);

    // Index on applications.status for faster status filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_applications_status" ON "applications" ("status");
    `);

    // Composite index on (applicant_user_id, status) for findUserMatches query optimization
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_applications_applicant_status" ON "applications" ("applicant_user_id", "status");
    `);

    // Index on match_slots.match_id for faster slot lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_match_slots_match_id" ON "match_slots" ("match_id");
    `);

    // Index on results.match_id for faster result lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_results_match_id" ON "results" ("match_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove all indexes in reverse order
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_results_match_id";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_match_slots_match_id";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_applications_applicant_status";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_applications_status";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_applications_applicant_user_id";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_matches_status";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_matches_date";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_matches_creator_user_id";
    `);
  }
}

