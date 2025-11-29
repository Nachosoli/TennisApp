import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorNotificationsToUseDeliveries1734570000000 implements MigrationInterface {
  name = 'RefactorNotificationsToUseDeliveries1734570000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create notification_deliveries table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_deliveries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "notification_id" uuid NOT NULL,
        "channel" "notification_channel_enum" NOT NULL,
        "status" "notification_status_enum" NOT NULL DEFAULT 'pending',
        "retry_count" integer NOT NULL DEFAULT 0,
        "sent_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_deliveries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_deliveries_notification" 
          FOREIGN KEY ("notification_id") 
          REFERENCES "notifications"("id") 
          ON DELETE CASCADE
      )
    `);

    // Step 2: Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_deliveries_notification_id" 
        ON "notification_deliveries" ("notification_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_deliveries_channel" 
        ON "notification_deliveries" ("channel")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_deliveries_status" 
        ON "notification_deliveries" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_deliveries_created_at" 
        ON "notification_deliveries" ("created_at")
    `);

    // Step 3: Migrate existing data
    // Group notifications by (user_id, type, content) within a 5-second window to create logical notifications
    // For each group, keep the earliest notification and create delivery records for all channels
    await queryRunner.query(`
      DO $$
      DECLARE
        notification_group RECORD;
        logical_notification_id uuid;
        delivery_record RECORD;
        group_created_at timestamp;
      BEGIN
        -- For each unique combination of (user_id, type, content) grouped by time window
        FOR notification_group IN
          SELECT DISTINCT 
            user_id, 
            type, 
            content,
            date_trunc('second', created_at) as created_at_rounded
          FROM notifications
          ORDER BY created_at_rounded DESC
        LOOP
          -- Get the earliest notification ID for this group (we'll keep this one)
          SELECT id, created_at INTO logical_notification_id, group_created_at
          FROM notifications
          WHERE user_id = notification_group.user_id
            AND type = notification_group.type
            AND content = notification_group.content
            AND date_trunc('second', created_at) = notification_group.created_at_rounded
          ORDER BY created_at ASC
          LIMIT 1;

          -- Create delivery records for all notifications in this group
          FOR delivery_record IN
            SELECT id, channel, status, retry_count, sent_at, created_at
            FROM notifications
            WHERE user_id = notification_group.user_id
              AND type = notification_group.type
              AND content = notification_group.content
              AND date_trunc('second', created_at) = notification_group.created_at_rounded
          LOOP
            INSERT INTO notification_deliveries (
              notification_id,
              channel,
              status,
              retry_count,
              sent_at,
              created_at
            ) VALUES (
              logical_notification_id,
              delivery_record.channel,
              delivery_record.status,
              delivery_record.retry_count,
              delivery_record.sent_at,
              delivery_record.created_at
            );
          END LOOP;

          -- Delete duplicate notifications (keep only the first one)
          DELETE FROM notifications
          WHERE user_id = notification_group.user_id
            AND type = notification_group.type
            AND content = notification_group.content
            AND date_trunc('second', created_at) = notification_group.created_at_rounded
            AND id != logical_notification_id;
        END LOOP;
      END $$;
    `);

    // Step 4: Remove old columns from notifications table
    // Note: We can't remove columns that are part of indexes, so we need to drop indexes first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_notifications_status"
    `);

    // Remove columns
    await queryRunner.query(`
      ALTER TABLE "notifications" 
        DROP COLUMN IF EXISTS "channel",
        DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "retry_count",
        DROP COLUMN IF EXISTS "sent_at"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add back columns to notifications table
    await queryRunner.query(`
      ALTER TABLE "notifications"
        ADD COLUMN IF NOT EXISTS "channel" "notification_channel_enum",
        ADD COLUMN IF NOT EXISTS "status" "notification_status_enum" DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS "retry_count" integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "sent_at" timestamp
    `);

    // Step 2: Migrate data back from notification_deliveries
    // For each delivery, create a notification if it doesn't exist
    await queryRunner.query(`
      DO $$
      DECLARE
        delivery_record RECORD;
        notification_exists boolean;
      BEGIN
        FOR delivery_record IN
          SELECT 
            nd.notification_id,
            nd.channel,
            nd.status,
            nd.retry_count,
            nd.sent_at,
            n.user_id,
            n.type,
            n.content,
            n.created_at
          FROM notification_deliveries nd
          INNER JOIN notifications n ON n.id = nd.notification_id
        LOOP
          -- Check if a notification with this combination already exists
          SELECT EXISTS(
            SELECT 1 FROM notifications
            WHERE user_id = delivery_record.user_id
              AND type = delivery_record.type
              AND content = delivery_record.content
              AND created_at = delivery_record.created_at
              AND channel = delivery_record.channel
          ) INTO notification_exists;

          -- If it doesn't exist, create it
          IF NOT notification_exists THEN
            INSERT INTO notifications (
              id,
              user_id,
              type,
              content,
              channel,
              status,
              retry_count,
              sent_at,
              created_at
            ) VALUES (
              uuid_generate_v4(),
              delivery_record.user_id,
              delivery_record.type,
              delivery_record.content,
              delivery_record.channel,
              delivery_record.status,
              delivery_record.retry_count,
              delivery_record.sent_at,
              delivery_record.created_at
            );
          ELSE
            -- Update existing notification with delivery status
            UPDATE notifications
            SET 
              status = delivery_record.status,
              retry_count = delivery_record.retry_count,
              sent_at = delivery_record.sent_at
            WHERE user_id = delivery_record.user_id
              AND type = delivery_record.type
              AND content = delivery_record.content
              AND created_at = delivery_record.created_at
              AND channel = delivery_record.channel;
          END IF;
        END LOOP;
      END $$;
    `);

    // Step 3: Recreate index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_status" 
        ON "notifications" ("status")
    `);

    // Step 4: Drop notification_deliveries table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "notification_deliveries" CASCADE
    `);
  }
}

