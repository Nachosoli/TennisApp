import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCancelledMatchesToUserStats1734569100000 implements MigrationInterface {
  name = 'AddCancelledMatchesToUserStats1734569100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add cancelled_matches column to user_stats table
    await queryRunner.query(`
      ALTER TABLE "user_stats"
      ADD COLUMN IF NOT EXISTS "cancelled_matches" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove cancelled_matches column from user_stats table
    await queryRunner.query(`
      ALTER TABLE "user_stats"
      DROP COLUMN IF EXISTS "cancelled_matches"
    `);
  }
}

