import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGenderToUser1734568000000 implements MigrationInterface {
  name = 'AddGenderToUser1734568000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create gender enum type
    await queryRunner.query(`
      CREATE TYPE "users_gender_enum" AS ENUM('male', 'female', 'other')
    `);

    // Add gender column (nullable initially for existing users)
    await queryRunner.query(`
      ALTER TABLE "users" ADD "gender" "users_gender_enum"
    `);

    // Set default value for existing users
    await queryRunner.query(`
      UPDATE "users" SET "gender" = 'other' WHERE "gender" IS NULL
    `);

    // Make column NOT NULL after setting defaults
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "gender" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove gender column
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "gender"
    `);

    // Drop enum type
    await queryRunner.query(`
      DROP TYPE "users_gender_enum"
    `);
  }
}

