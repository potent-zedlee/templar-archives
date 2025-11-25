-- ============================================================================
-- Fix: video_uploads 테이블 컬럼 추가
-- ============================================================================
-- Description: API에서 사용하지만 스키마에 누락된 컬럼 추가
--   - content_type: MIME 타입 (video/mp4 등)
--   - gcs_uri: GCS URI (gs://bucket/path)
-- Created: 2025-11-25
-- ============================================================================

BEGIN;

-- 1. content_type 컬럼 추가
ALTER TABLE "public"."video_uploads"
  ADD COLUMN IF NOT EXISTS "content_type" "text";

COMMENT ON COLUMN "public"."video_uploads"."content_type" IS '파일 MIME 타입 (예: video/mp4)';

-- 2. gcs_uri 컬럼 추가
ALTER TABLE "public"."video_uploads"
  ADD COLUMN IF NOT EXISTS "gcs_uri" "text";

COMMENT ON COLUMN "public"."video_uploads"."gcs_uri" IS 'GCS URI (예: gs://bucket/path/file.mp4)';

COMMIT;
