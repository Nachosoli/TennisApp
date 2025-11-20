import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentSystem1734568500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for payment method types
    await queryRunner.query(`
      CREATE TYPE "payment_methods_type_enum" AS ENUM('credit_card', 'paypal', 'bank_account', 'other')
    `);

    // Create enum type for subscription status
    await queryRunner.query(`
      CREATE TYPE "users_subscription_status_enum" AS ENUM('FREE', 'ACTIVE', 'EXPIRED', 'CANCELLED')
    `);

    // Create payment_methods table
    await queryRunner.query(`
      CREATE TABLE "payment_methods" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" "payment_methods_type_enum" NOT NULL,
        "provider" character varying(50) NOT NULL,
        "last4" character varying(4),
        "expiry_month" integer,
        "expiry_year" integer,
        "token" text,
        "is_default" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_methods" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payment_methods_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes on payment_methods table
    await queryRunner.query(`
      CREATE INDEX "IDX_payment_methods_user_id" ON "payment_methods" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_methods_user_default" ON "payment_methods" ("user_id", "is_default")
    `);

    // Add payment fields to users table
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "is_paid" boolean NOT NULL DEFAULT true,
      ADD COLUMN "subscription_status" "users_subscription_status_enum" NOT NULL DEFAULT 'FREE',
      ADD COLUMN "subscription_expires_at" TIMESTAMP,
      ADD COLUMN "payment_required" boolean NOT NULL DEFAULT false
    `);

    // Update existing users to have FREE subscription status and is_paid = true
    await queryRunner.query(`
      UPDATE "users" 
      SET "subscription_status" = 'FREE', 
          "is_paid" = true,
          "payment_required" = false
      WHERE "subscription_status" IS NULL OR "is_paid" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove payment fields from users table
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "payment_required",
      DROP COLUMN IF EXISTS "subscription_expires_at",
      DROP COLUMN IF EXISTS "subscription_status",
      DROP COLUMN IF EXISTS "is_paid"
    `);

    // Drop indexes on payment_methods table
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_payment_methods_user_default"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_payment_methods_user_id"
    `);

    // Drop payment_methods table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "payment_methods"
    `);

    // Drop enum types
    await queryRunner.query(`
      DROP TYPE IF EXISTS "users_subscription_status_enum"
    `);

    await queryRunner.query(`
      DROP TYPE IF EXISTS "payment_methods_type_enum"
    `);
  }
}

