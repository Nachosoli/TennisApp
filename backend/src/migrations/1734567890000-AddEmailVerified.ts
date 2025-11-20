import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEmailVerified1734567890000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add email_verified column to users table
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'email_verified',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    // Update existing users: set email_verified = verified (migrate phone verification status)
    await queryRunner.query(`
      UPDATE users 
      SET email_verified = verified
      WHERE email_verified IS NULL OR email_verified = false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove email_verified column
    await queryRunner.dropColumn('users', 'email_verified');
  }
}

