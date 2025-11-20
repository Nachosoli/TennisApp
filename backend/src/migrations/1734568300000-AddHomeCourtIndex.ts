import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHomeCourtIndex1734568300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add index on users.home_court_id to speed up joins and lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_home_court_id" ON "users" ("home_court_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_users_home_court_id";
    `);
  }
}

