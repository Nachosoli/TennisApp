import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeCoordinatesToText1734569500000 implements MigrationInterface {
  name = 'ChangeCoordinatesToText1734569500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
  }
}

