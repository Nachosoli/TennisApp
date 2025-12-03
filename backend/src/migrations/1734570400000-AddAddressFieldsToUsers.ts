import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAddressFieldsToUsers1734570400000 implements MigrationInterface {
  name = 'AddAddressFieldsToUsers1734570400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if columns already exist
    const addressExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'address'
      ) as exists;
    `);

    if (addressExists[0]?.exists) {
      console.log('Address fields already exist in users table, skipping...');
      return;
    }

    // Add address component columns
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "address" text,
      ADD COLUMN "city" character varying,
      ADD COLUMN "state" character varying,
      ADD COLUMN "zip_code" character varying,
      ADD COLUMN "country" character varying;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove address component columns
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "country",
      DROP COLUMN IF EXISTS "zip_code",
      DROP COLUMN IF EXISTS "state",
      DROP COLUMN IF EXISTS "city",
      DROP COLUMN IF EXISTS "address";
    `);
  }
}

