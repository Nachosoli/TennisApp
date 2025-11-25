import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeCoordinatesToText1734569500000 implements MigrationInterface {
  name = 'ChangeCoordinatesToText1734569500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop GIST index on coordinates if it exists (GIST indexes don't work with text type)
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_courts_coordinates";
    `);

    // Change coordinates column from point to text
    // Convert existing point values to text format: (lng,lat)
    // PostgreSQL point type can be cast directly to text, which outputs (x,y)
    await queryRunner.query(`
      ALTER TABLE "courts" 
      ALTER COLUMN "coordinates" TYPE text 
      USING coordinates::text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Convert back from text to point
    // PostgreSQL can cast text in (x,y) format directly to point
    await queryRunner.query(`
      ALTER TABLE "courts" 
      ALTER COLUMN "coordinates" TYPE point 
      USING coordinates::point;
    `);

    // Recreate GIST index if PostGIS is available (optional - may fail if PostGIS not available)
    try {
      await queryRunner.query(`
        CREATE INDEX "IDX_courts_coordinates" ON "courts" USING GIST ("coordinates");
      `);
    } catch (error: any) {
      // GIST index requires PostGIS, so skip if not available
      console.warn('⚠️  Could not recreate GIST index - PostGIS may not be available');
    }
  }
}

