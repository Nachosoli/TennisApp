import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameVerifiedToPhoneVerified1734568200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename verified column to phone_verified
    await queryRunner.query(`
      ALTER TABLE "users" 
      RENAME COLUMN "verified" TO "phone_verified";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rename phone_verified column back to verified
    await queryRunner.query(`
      ALTER TABLE "users" 
      RENAME COLUMN "phone_verified" TO "verified";
    `);
  }
}

