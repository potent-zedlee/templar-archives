SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'Public schema with Arbiter system RPC functions';



CREATE TYPE "public"."claim_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."claim_status" OWNER TO "postgres";


CREATE TYPE "public"."game_type" AS ENUM (
    'tournament',
    'cash_game',
    'both'
);


ALTER TYPE "public"."game_type" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'comment',
    'reply',
    'like_post',
    'like_comment',
    'edit_approved',
    'edit_rejected',
    'claim_approved',
    'claim_rejected',
    'mention',
    'timecode_submitted',
    'timecode_approved',
    'timecode_rejected',
    'timecode_ai_completed',
    'timecode_review_ready'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."verification_method" AS ENUM (
    'social_media',
    'email',
    'admin',
    'other'
);


ALTER TYPE "public"."verification_method" OWNER TO "postgres";