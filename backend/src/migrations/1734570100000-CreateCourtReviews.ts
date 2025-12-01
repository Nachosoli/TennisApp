import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCourtReviews1734570100000 implements MigrationInterface {
  name = 'CreateCourtReviews1734570100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if migration already ran
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'court_reviews'
      ) as exists;
    `);

    if (tableExists[0]?.exists) {
      console.log('Migration already applied, skipping...');
      return;
    }

    // Create court_reviews table
    await queryRunner.query(`
      CREATE TABLE "court_reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "court_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "rating" integer NOT NULL,
        "comment" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_court_reviews" PRIMARY KEY ("id"),
        CONSTRAINT "FK_court_reviews_court" FOREIGN KEY ("court_id") 
          REFERENCES "courts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_court_reviews_user" FOREIGN KEY ("user_id") 
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "CHK_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5),
        CONSTRAINT "UQ_court_user_review" UNIQUE ("court_id", "user_id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_court_reviews_court_id" ON "court_reviews" ("court_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_court_reviews_user_id" ON "court_reviews" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "court_reviews"`);
  }
}

