import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEloDefaultTo15001734568100000 implements MigrationInterface {
  name = 'UpdateEloDefaultTo15001734568100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update default value for singles_elo column
    await queryRunner.query(`
      ALTER TABLE "user_stats" 
      ALTER COLUMN "singles_elo" SET DEFAULT 1500
    `);

    // Update default value for doubles_elo column
    await queryRunner.query(`
      ALTER TABLE "user_stats" 
      ALTER COLUMN "doubles_elo" SET DEFAULT 1500
    `);

    // Update existing users with 1000 ELO to 1500 (optional - uncomment if you want to update existing data)
    // await queryRunner.query(`
    //   UPDATE "user_stats" 
    //   SET "singles_elo" = 1500, "doubles_elo" = 1500 
    //   WHERE "singles_elo" = 1000 OR "doubles_elo" = 1000
    // `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert default value for singles_elo column
    await queryRunner.query(`
      ALTER TABLE "user_stats" 
      ALTER COLUMN "singles_elo" SET DEFAULT 1000
    `);

    // Revert default value for doubles_elo column
    await queryRunner.query(`
      ALTER TABLE "user_stats" 
      ALTER COLUMN "doubles_elo" SET DEFAULT 1000
    `);
  }
}

