import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable PostGIS extension (optional - may not be available in all PostgreSQL instances)
    try {
      await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`);
    } catch (error: any) {
      if (error.code === '0A000' || error.message?.includes('extension "postgis" is not available')) {
        console.warn('⚠️  PostGIS extension is not available - location-based features will be disabled');
      } else {
        throw error; // Re-throw if it's a different error
      }
    }

    // Create enum types
    await queryRunner.query(
      `CREATE TYPE "public"."users_ratingtype_enum" AS ENUM('UTR', 'USTA', 'CUSTOM')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."courts_surfacetype_enum" AS ENUM('Hard', 'Clay', 'Grass', 'Indoor')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."matches_format_enum" AS ENUM('singles', 'doubles')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."matches_status_enum" AS ENUM('pending', 'confirmed', 'cancelled', 'completed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."match_slots_status_enum" AS ENUM('available', 'locked', 'confirmed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."applications_status_enum" AS ENUM('pending', 'confirmed', 'rejected', 'expired')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."elo_logs_matchtype_enum" AS ENUM('singles', 'doubles')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('match_created', 'match_accepted', 'match_confirmed', 'court_changes', 'score_reminder', 'new_chat')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_channel_enum" AS ENUM('email', 'sms')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_status_enum" AS ENUM('pending', 'sent', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notification_preferences_notificationtype_enum" AS ENUM('match_created', 'match_accepted', 'match_confirmed', 'court_changes', 'score_reminder', 'new_chat')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."admin_actions_actiontype_enum" AS ENUM('suspend_user', 'ban_user', 'edit_user', 'delete_court', 'edit_court', 'resolve_dispute', 'override_confirmation', 'adjust_score', 'force_cancel_match')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."admin_actions_targettype_enum" AS ENUM('user', 'court', 'match', 'result')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reports_reporttype_enum" AS ENUM('user', 'match', 'court')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reports_status_enum" AS ENUM('pending', 'reviewing', 'resolved', 'dismissed')`,
    );

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "phone" character varying,
        "verified" boolean NOT NULL DEFAULT false,
        "first_name" character varying NOT NULL,
        "last_name" character varying NOT NULL,
        "photo_url" character varying,
        "bio" text,
        "play_style" character varying,
        "rating_type" "public"."users_ratingtype_enum",
        "rating_value" numeric(5,2),
        "home_court_id" uuid,
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'user',
        "is_active" boolean NOT NULL DEFAULT true,
        "suspended_until" TIMESTAMP,
        "banned_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // Create courts table
    // Try with geography type (PostGIS), fall back to point if PostGIS not available
    let hasPostGIS = false;
    try {
      const result = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_extension WHERE extname = 'postgis'
        ) as has_postgis;
      `);
      hasPostGIS = result[0]?.has_postgis === true;
    } catch (error) {
      // If we can't check, assume no PostGIS
      hasPostGIS = false;
    }
    
    const coordinatesType = hasPostGIS ? 'geography(Point,4326)' : 'point';
    
    await queryRunner.query(`
      CREATE TABLE "courts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "address" text NOT NULL,
        "coordinates" ${coordinatesType},
        "surface_type" "public"."courts_surfacetype_enum" NOT NULL,
        "is_public" boolean NOT NULL DEFAULT true,
        "created_by_user_id" uuid NOT NULL,
        "deleted_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_courts" PRIMARY KEY ("id")
      )
    `);

    // Create matches table
    await queryRunner.query(`
      CREATE TABLE "matches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "creator_user_id" uuid NOT NULL,
        "court_id" uuid NOT NULL,
        "date" date NOT NULL,
        "format" "public"."matches_format_enum" NOT NULL,
        "skill_level_min" numeric(5,2),
        "skill_level_max" numeric(5,2),
        "gender_filter" character varying,
        "max_distance" integer,
        "surface_filter" "public"."courts_surfacetype_enum",
        "status" "public"."matches_status_enum" NOT NULL DEFAULT 'pending',
        "cancelled_at" TIMESTAMP,
        "cancelled_by_user_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_matches" PRIMARY KEY ("id")
      )
    `);

    // Create match_slots table
    await queryRunner.query(`
      CREATE TABLE "match_slots" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "match_id" uuid NOT NULL,
        "start_time" time NOT NULL,
        "end_time" time NOT NULL,
        "status" "public"."match_slots_status_enum" NOT NULL DEFAULT 'available',
        "locked_by_user_id" uuid,
        "locked_at" TIMESTAMP,
        "expires_at" TIMESTAMP,
        "confirmed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_match_slots" PRIMARY KEY ("id")
      )
    `);

    // Create applications table
    await queryRunner.query(`
      CREATE TABLE "applications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "match_slot_id" uuid NOT NULL,
        "applicant_user_id" uuid NOT NULL,
        "guest_partner_name" character varying,
        "status" "public"."applications_status_enum" NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_applications_match_slot_id" UNIQUE ("match_slot_id"),
        CONSTRAINT "PK_applications" PRIMARY KEY ("id")
      )
    `);

    // Create chat_messages table
    await queryRunner.query(`
      CREATE TABLE "chat_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "match_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "message" text NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_messages" PRIMARY KEY ("id")
      )
    `);

    // Create results table
    await queryRunner.query(`
      CREATE TABLE "results" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "match_id" uuid NOT NULL,
        "player1_user_id" uuid,
        "player2_user_id" uuid,
        "guest_player1_name" character varying,
        "guest_player2_name" character varying,
        "score" text NOT NULL,
        "submitted_by_user_id" uuid NOT NULL,
        "disputed" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_results_match_id" UNIQUE ("match_id"),
        CONSTRAINT "PK_results" PRIMARY KEY ("id")
      )
    `);

    // Create elo_logs table
    await queryRunner.query(`
      CREATE TABLE "elo_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "match_id" uuid NOT NULL,
        "match_type" "public"."elo_logs_matchtype_enum" NOT NULL,
        "elo_before" numeric(7,2) NOT NULL,
        "elo_after" numeric(7,2) NOT NULL,
        "opponent_user_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_elo_logs" PRIMARY KEY ("id")
      )
    `);

    // Create user_stats table
    await queryRunner.query(`
      CREATE TABLE "user_stats" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "singles_elo" numeric(7,2) NOT NULL DEFAULT 1000,
        "doubles_elo" numeric(7,2) NOT NULL DEFAULT 1000,
        "win_streak_singles" integer NOT NULL DEFAULT 0,
        "win_streak_doubles" integer NOT NULL DEFAULT 0,
        "total_matches" integer NOT NULL DEFAULT 0,
        "total_wins" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_user_stats_user_id" UNIQUE ("user_id"),
        CONSTRAINT "PK_user_stats" PRIMARY KEY ("id")
      )
    `);

    // Create notifications table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" "public"."notifications_type_enum" NOT NULL,
        "channel" "public"."notifications_channel_enum" NOT NULL,
        "status" "public"."notifications_status_enum" NOT NULL DEFAULT 'pending',
        "content" text NOT NULL,
        "retry_count" integer NOT NULL DEFAULT 0,
        "sent_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      )
    `);

    // Create notification_preferences table
    await queryRunner.query(`
      CREATE TABLE "notification_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "notification_type" "public"."notification_preferences_notificationtype_enum" NOT NULL,
        "email_enabled" boolean NOT NULL DEFAULT false,
        "sms_enabled" boolean NOT NULL DEFAULT false,
        CONSTRAINT "UQ_notification_preferences_user_id_notification_type" UNIQUE ("user_id", "notification_type"),
        CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("id")
      )
    `);

    // Create admin_actions table
    await queryRunner.query(`
      CREATE TABLE "admin_actions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "admin_user_id" uuid NOT NULL,
        "action_type" "public"."admin_actions_actiontype_enum" NOT NULL,
        "target_type" "public"."admin_actions_targettype_enum" NOT NULL,
        "target_id" character varying NOT NULL,
        "details" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_actions" PRIMARY KEY ("id")
      )
    `);

    // Create reports table
    await queryRunner.query(`
      CREATE TABLE "reports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "reporter_user_id" uuid NOT NULL,
        "report_type" "public"."reports_reporttype_enum" NOT NULL,
        "target_id" character varying NOT NULL,
        "reason" text NOT NULL,
        "status" "public"."reports_status_enum" NOT NULL DEFAULT 'pending',
        "admin_user_id" uuid,
        "resolved_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reports" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_phone" ON "users" ("phone")`);
    // Create GIST index for coordinates (requires PostGIS - skip if not available)
    try {
      await queryRunner.query(
        `CREATE INDEX "IDX_courts_coordinates" ON "courts" USING GIST ("coordinates")`,
      );
    } catch (error: any) {
      if (error.message?.includes('data type geography has no default operator class') || 
          error.message?.includes('PostGIS')) {
        console.warn('⚠️  Skipping GIST index on coordinates - PostGIS not available');
      } else {
        throw error; // Re-throw if it's a different error
      }
    }
    await queryRunner.query(`CREATE INDEX "IDX_courts_created_by_user_id" ON "courts" ("created_by_user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_matches_creator_user_id" ON "matches" ("creator_user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_matches_court_id" ON "matches" ("court_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_matches_date" ON "matches" ("date")`);
    await queryRunner.query(`CREATE INDEX "IDX_matches_status" ON "matches" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_match_slots_match_id" ON "match_slots" ("match_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_match_slots_status" ON "match_slots" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_match_slots_locked_by_user_id" ON "match_slots" ("locked_by_user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_applications_match_slot_id" ON "applications" ("match_slot_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_applications_applicant_user_id" ON "applications" ("applicant_user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_applications_status" ON "applications" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_chat_messages_match_id" ON "chat_messages" ("match_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_chat_messages_user_id" ON "chat_messages" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_chat_messages_created_at" ON "chat_messages" ("created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_results_match_id" ON "results" ("match_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_results_player1_user_id" ON "results" ("player1_user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_results_player2_user_id" ON "results" ("player2_user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_elo_logs_user_id" ON "elo_logs" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_elo_logs_match_id" ON "elo_logs" ("match_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_elo_logs_match_type" ON "elo_logs" ("match_type")`);
    await queryRunner.query(`CREATE INDEX "IDX_elo_logs_created_at" ON "elo_logs" ("created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_user_id" ON "notifications" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_type" ON "notifications" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_status" ON "notifications" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_created_at" ON "notifications" ("created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_notification_preferences_user_id" ON "notification_preferences" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_admin_actions_admin_user_id" ON "admin_actions" ("admin_user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_admin_actions_action_type" ON "admin_actions" ("action_type")`);
    await queryRunner.query(`CREATE INDEX "IDX_admin_actions_target_type" ON "admin_actions" ("target_type")`);
    await queryRunner.query(`CREATE INDEX "IDX_admin_actions_created_at" ON "admin_actions" ("created_at")`);
    await queryRunner.query(`CREATE INDEX "IDX_reports_reporter_user_id" ON "reports" ("reporter_user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_reports_report_type" ON "reports" ("report_type")`);
    await queryRunner.query(`CREATE INDEX "IDX_reports_status" ON "reports" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_reports_created_at" ON "reports" ("created_at")`);

    // Create foreign keys
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_home_court" FOREIGN KEY ("home_court_id") REFERENCES "courts"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "courts" ADD CONSTRAINT "FK_courts_created_by" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_matches_creator" FOREIGN KEY ("creator_user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_matches_court" FOREIGN KEY ("court_id") REFERENCES "courts"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "matches" ADD CONSTRAINT "FK_matches_cancelled_by" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_slots" ADD CONSTRAINT "FK_match_slots_match" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "match_slots" ADD CONSTRAINT "FK_match_slots_locked_by" FOREIGN KEY ("locked_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" ADD CONSTRAINT "FK_applications_match_slot" FOREIGN KEY ("match_slot_id") REFERENCES "match_slots"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" ADD CONSTRAINT "FK_applications_applicant" FOREIGN KEY ("applicant_user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_chat_messages_match" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_chat_messages_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "results" ADD CONSTRAINT "FK_results_match" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "results" ADD CONSTRAINT "FK_results_player1" FOREIGN KEY ("player1_user_id") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "results" ADD CONSTRAINT "FK_results_player2" FOREIGN KEY ("player2_user_id") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "results" ADD CONSTRAINT "FK_results_submitted_by" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "elo_logs" ADD CONSTRAINT "FK_elo_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "elo_logs" ADD CONSTRAINT "FK_elo_logs_match" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "elo_logs" ADD CONSTRAINT "FK_elo_logs_opponent" FOREIGN KEY ("opponent_user_id") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_stats" ADD CONSTRAINT "FK_user_stats_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD CONSTRAINT "FK_notification_preferences_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin_actions" ADD CONSTRAINT "FK_admin_actions_admin" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_reports_reporter" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "reports" ADD CONSTRAINT "FK_reports_admin" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`ALTER TABLE "reports" DROP CONSTRAINT "FK_reports_admin"`);
    await queryRunner.query(`ALTER TABLE "reports" DROP CONSTRAINT "FK_reports_reporter"`);
    await queryRunner.query(`ALTER TABLE "admin_actions" DROP CONSTRAINT "FK_admin_actions_admin"`);
    await queryRunner.query(`ALTER TABLE "notification_preferences" DROP CONSTRAINT "FK_notification_preferences_user"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user"`);
    await queryRunner.query(`ALTER TABLE "user_stats" DROP CONSTRAINT "FK_user_stats_user"`);
    await queryRunner.query(`ALTER TABLE "elo_logs" DROP CONSTRAINT "FK_elo_logs_opponent"`);
    await queryRunner.query(`ALTER TABLE "elo_logs" DROP CONSTRAINT "FK_elo_logs_match"`);
    await queryRunner.query(`ALTER TABLE "elo_logs" DROP CONSTRAINT "FK_elo_logs_user"`);
    await queryRunner.query(`ALTER TABLE "results" DROP CONSTRAINT "FK_results_submitted_by"`);
    await queryRunner.query(`ALTER TABLE "results" DROP CONSTRAINT "FK_results_player2"`);
    await queryRunner.query(`ALTER TABLE "results" DROP CONSTRAINT "FK_results_player1"`);
    await queryRunner.query(`ALTER TABLE "results" DROP CONSTRAINT "FK_results_match"`);
    await queryRunner.query(`ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_chat_messages_user"`);
    await queryRunner.query(`ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_chat_messages_match"`);
    await queryRunner.query(`ALTER TABLE "applications" DROP CONSTRAINT "FK_applications_applicant"`);
    await queryRunner.query(`ALTER TABLE "applications" DROP CONSTRAINT "FK_applications_match_slot"`);
    await queryRunner.query(`ALTER TABLE "match_slots" DROP CONSTRAINT "FK_match_slots_locked_by"`);
    await queryRunner.query(`ALTER TABLE "match_slots" DROP CONSTRAINT "FK_match_slots_match"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_matches_cancelled_by"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_matches_court"`);
    await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_matches_creator"`);
    await queryRunner.query(`ALTER TABLE "courts" DROP CONSTRAINT "FK_courts_created_by"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_home_court"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "reports"`);
    await queryRunner.query(`DROP TABLE "admin_actions"`);
    await queryRunner.query(`DROP TABLE "notification_preferences"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "user_stats"`);
    await queryRunner.query(`DROP TABLE "elo_logs"`);
    await queryRunner.query(`DROP TABLE "results"`);
    await queryRunner.query(`DROP TABLE "chat_messages"`);
    await queryRunner.query(`DROP TABLE "applications"`);
    await queryRunner.query(`DROP TABLE "match_slots"`);
    await queryRunner.query(`DROP TABLE "matches"`);
    await queryRunner.query(`DROP TABLE "courts"`);
    await queryRunner.query(`DROP TABLE "users"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE "public"."reports_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."reports_reporttype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."admin_actions_targettype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."admin_actions_actiontype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."notification_preferences_notificationtype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_channel_enum"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."elo_logs_matchtype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."applications_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."match_slots_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."matches_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."matches_format_enum"`);
    await queryRunner.query(`DROP TYPE "public"."courts_surfacetype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_ratingtype_enum"`);
  }
}

