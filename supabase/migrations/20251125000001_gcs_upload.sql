-- ============================================================================
-- GCS Upload Feature Migration
-- ============================================================================
-- Description: GCS 기반 영상 업로드 기능 추가
--   1. streams 테이블에 GCS 관련 컬럼 추가
--   2. video_uploads 테이블 생성 (업로드 트래킹)
--   3. 인덱스 및 제약조건 추가
-- Created: 2025-11-25
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. streams 테이블 확장
-- ============================================================================

-- GCS 관련 컬럼 추가
ALTER TABLE "public"."streams"
  ADD COLUMN IF NOT EXISTS "gcs_path" "text",
  ADD COLUMN IF NOT EXISTS "gcs_uri" "text",
  ADD COLUMN IF NOT EXISTS "gcs_file_size" bigint,
  ADD COLUMN IF NOT EXISTS "gcs_uploaded_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "upload_status" "text" DEFAULT 'none'::"text",
  ADD COLUMN IF NOT EXISTS "video_duration" integer;

-- 컬럼 코멘트 추가
COMMENT ON COLUMN "public"."streams"."gcs_path" IS 'GCS 객체 경로 (예: templar-archives/uploads/2025/11/video.mp4)';
COMMENT ON COLUMN "public"."streams"."gcs_uri" IS 'GCS URI (예: gs://templar-archives/uploads/2025/11/video.mp4)';
COMMENT ON COLUMN "public"."streams"."gcs_file_size" IS '업로드된 파일 크기 (bytes)';
COMMENT ON COLUMN "public"."streams"."gcs_uploaded_at" IS '업로드 완료 시각';
COMMENT ON COLUMN "public"."streams"."upload_status" IS '업로드 상태: none, uploading, uploaded, analyzing, completed, failed';
COMMENT ON COLUMN "public"."streams"."video_duration" IS '영상 길이 (초)';

-- CHECK 제약조건 추가
ALTER TABLE "public"."streams"
  ADD CONSTRAINT "streams_upload_status_check"
    CHECK ("upload_status" = ANY (ARRAY[
      'none'::"text",
      'uploading'::"text",
      'uploaded'::"text",
      'analyzing'::"text",
      'completed'::"text",
      'failed'::"text"
    ]));

ALTER TABLE "public"."streams"
  ADD CONSTRAINT "streams_video_duration_check"
    CHECK ("video_duration" IS NULL OR "video_duration" > 0);

ALTER TABLE "public"."streams"
  ADD CONSTRAINT "streams_gcs_file_size_check"
    CHECK ("gcs_file_size" IS NULL OR "gcs_file_size" > 0);

-- ============================================================================
-- 2. video_uploads 테이블 생성
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."video_uploads" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "stream_id" "uuid" NOT NULL,
  "user_id" "uuid" NOT NULL,
  "filename" "text" NOT NULL,
  "file_size" bigint NOT NULL,
  "gcs_path" "text",
  "upload_url" "text",
  "status" "text" DEFAULT 'pending'::"text" NOT NULL,
  "progress" integer DEFAULT 0 NOT NULL,
  "error_message" "text",
  "started_at" timestamp with time zone DEFAULT "now"(),
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT "now"(),
  CONSTRAINT "video_uploads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "video_uploads_stream_id_fkey"
    FOREIGN KEY ("stream_id")
    REFERENCES "public"."streams"("id")
    ON DELETE CASCADE,
  CONSTRAINT "video_uploads_status_check"
    CHECK ("status" = ANY (ARRAY[
      'pending'::"text",
      'uploading'::"text",
      'paused'::"text",
      'completed'::"text",
      'failed'::"text",
      'cancelled'::"text"
    ])),
  CONSTRAINT "video_uploads_progress_check"
    CHECK ("progress" >= 0 AND "progress" <= 100),
  CONSTRAINT "video_uploads_file_size_check"
    CHECK ("file_size" > 0),
  CONSTRAINT "video_uploads_filename_check"
    CHECK ("length"(TRIM(BOTH FROM "filename")) > 0)
);

-- 테이블 소유자 설정
ALTER TABLE "public"."video_uploads" OWNER TO "postgres";

-- 테이블 코멘트
COMMENT ON TABLE "public"."video_uploads" IS 'GCS 영상 업로드 트래킹 테이블';

-- 컬럼 코멘트
COMMENT ON COLUMN "public"."video_uploads"."stream_id" IS '연결된 스트림 ID (streams 테이블 참조)';
COMMENT ON COLUMN "public"."video_uploads"."user_id" IS '업로드한 사용자 ID';
COMMENT ON COLUMN "public"."video_uploads"."filename" IS '원본 파일명';
COMMENT ON COLUMN "public"."video_uploads"."file_size" IS '파일 크기 (bytes)';
COMMENT ON COLUMN "public"."video_uploads"."gcs_path" IS 'GCS 객체 경로';
COMMENT ON COLUMN "public"."video_uploads"."upload_url" IS 'Resumable upload URL (세션 토큰)';
COMMENT ON COLUMN "public"."video_uploads"."status" IS '업로드 상태: pending, uploading, paused, completed, failed, cancelled';
COMMENT ON COLUMN "public"."video_uploads"."progress" IS '업로드 진행률 (0-100%)';
COMMENT ON COLUMN "public"."video_uploads"."error_message" IS '에러 메시지 (실패 시)';
COMMENT ON COLUMN "public"."video_uploads"."started_at" IS '업로드 시작 시각';
COMMENT ON COLUMN "public"."video_uploads"."completed_at" IS '업로드 완료 시각';

-- ============================================================================
-- 3. 인덱스 추가
-- ============================================================================

-- streams 테이블 인덱스
CREATE INDEX IF NOT EXISTS "idx_streams_upload_status"
  ON "public"."streams"("upload_status")
  WHERE "upload_status" != 'none';

CREATE INDEX IF NOT EXISTS "idx_streams_gcs_uploaded_at"
  ON "public"."streams"("gcs_uploaded_at" DESC NULLS LAST)
  WHERE "gcs_uploaded_at" IS NOT NULL;

-- video_uploads 테이블 인덱스
CREATE INDEX IF NOT EXISTS "idx_video_uploads_stream_id"
  ON "public"."video_uploads"("stream_id");

CREATE INDEX IF NOT EXISTS "idx_video_uploads_user_id"
  ON "public"."video_uploads"("user_id");

CREATE INDEX IF NOT EXISTS "idx_video_uploads_status"
  ON "public"."video_uploads"("status")
  WHERE "status" IN ('pending', 'uploading', 'paused');

CREATE INDEX IF NOT EXISTS "idx_video_uploads_created_at"
  ON "public"."video_uploads"("created_at" DESC);

-- 복합 인덱스 (사용자별 최근 업로드 조회)
CREATE INDEX IF NOT EXISTS "idx_video_uploads_user_created"
  ON "public"."video_uploads"("user_id", "created_at" DESC);

-- ============================================================================
-- 4. RLS 정책 (기본 비활성화, 나중에 추가)
-- ============================================================================

-- video_uploads 테이블은 RLS 비활성화 상태로 생성됨
-- 필요시 별도 마이그레이션에서 RLS 정책 추가

COMMIT;
