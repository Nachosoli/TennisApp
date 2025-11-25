import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeCoordinatesToText1734569500000 implements MigrationInterface {
  name = 'ChangeCoordinatesToText1734569500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Change coordinates column from point to text
    // Convert existing point values to text format: (lng,lat)
    await queryRunner.query(`
      ALTER TABLE "courts" 
      ALTER COLUMN "coordinates" TYPE text 
      USING CASE 
        WHEN coordinates IS NULL THEN NULL
        ELSE '(' || coordinates[0]::text || ',' || coordinates[1]::text || ')'
      END;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Convert back from text to point
    // This will only work if the text format is (lng,lat)
    await queryRunner.query(`
      ALTER TABLE "courts" 
      ALTER COLUMN "coordinates" TYPE point 
      USING CASE 
        WHEN coordinates IS NULL THEN NULL
        ELSE point(
          (regexp_match(coordinates, '\\((-?\\d+\\.?\\d*),(-?\\d+\\.?\\d*)\\)'))[1]::float,
          (regexp_match(coordinates, '\\((-?\\d+\\.?\\d*),(-?\\d+\\.?\\d*)\\)'))[2]::float
        )
      END;
    `);
  }
}

