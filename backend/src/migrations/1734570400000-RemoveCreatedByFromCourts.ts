import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCreatedByFromCourts1734570400000 implements MigrationInterface {
  name = 'RemoveCreatedByFromCourts1734570400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the foreign key constraint first
    await queryRunner.query(`ALTER TABLE "courts" DROP CONSTRAINT IF EXISTS "FK_courts_created_by"`);
    
    // Drop the index on created_by_user_id
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_courts_created_by_user_id"`);
    
    // Drop the column
    await queryRunner.query(`ALTER TABLE "courts" DROP COLUMN IF EXISTS "created_by_user_id"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the column
    await queryRunner.query(`ALTER TABLE "courts" ADD COLUMN "created_by_user_id" uuid`);
    
    // Re-add the index
    await queryRunner.query(`CREATE INDEX "IDX_courts_created_by_user_id" ON "courts" ("created_by_user_id")`);
    
    // Re-add the foreign key constraint with CASCADE
    await queryRunner.query(
      `ALTER TABLE "courts" ADD CONSTRAINT "FK_courts_created_by" 
       FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE`
    );
  }
}

