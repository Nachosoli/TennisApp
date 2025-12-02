import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripeTransactions1734570200000 implements MigrationInterface {
  name = 'AddStripeTransactions1734570200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if transactions table already exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transactions'
      ) as exists;
    `);

    if (tableExists[0]?.exists) {
      console.log('Transactions table already exists, skipping...');
      return;
    }

    // Create enum types for transactions
    await queryRunner.query(`
      CREATE TYPE "transactions_type_enum" AS ENUM('match_fee', 'subscription', 'refund', 'other')
    `);

    await queryRunner.query(`
      CREATE TYPE "transactions_status_enum" AS ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled')
    `);

    // Create transactions table
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "match_id" uuid,
        "type" "transactions_type_enum" NOT NULL,
        "status" "transactions_status_enum" NOT NULL DEFAULT 'pending',
        "amount" decimal(10,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'usd',
        "stripe_payment_intent_id" character varying(255),
        "stripe_charge_id" character varying(255),
        "stripe_customer_id" character varying(255),
        "description" text,
        "metadata" jsonb,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transactions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_transactions_match_id" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_stripe_payment_intent_id" UNIQUE ("stripe_payment_intent_id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_user_id" ON "transactions" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_match_id" ON "transactions" ("match_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_stripe_payment_intent_id" ON "transactions" ("stripe_payment_intent_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_status" ON "transactions" ("status")
    `);

    // Add stripe_customer_id to users table if it doesn't exist
    const columnExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'stripe_customer_id'
      ) as exists;
    `);

    if (!columnExists[0]?.exists) {
      await queryRunner.query(`
        ALTER TABLE "users" 
        ADD COLUMN "stripe_customer_id" character varying(255) UNIQUE
      `);

      await queryRunner.query(`
        CREATE INDEX "IDX_users_stripe_customer_id" ON "users" ("stripe_customer_id")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop transactions table
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "transactions_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "transactions_type_enum"`);

    // Remove stripe_customer_id from users table
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_users_stripe_customer_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "stripe_customer_id"
    `);
  }
}

