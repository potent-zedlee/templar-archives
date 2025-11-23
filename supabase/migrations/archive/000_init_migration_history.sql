-- ===========================
-- 000: 마이그레이션 히스토리 초기화
-- ===========================
-- 이 파일은 Supabase CLI가 이미 적용된 마이그레이션을 추적할 수 있도록 합니다.
-- 원격 DB에 이미 적용된 마이그레이션 001-012를 schema_migrations에 기록합니다.

-- 기존 테이블 구조 확인
-- SELECT * FROM supabase_migrations.schema_migrations LIMIT 1;

-- 이미 적용된 마이그레이션 기록 (version과 name만 사용)
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
  ('20241001000001', '001_init_schema'),
  ('20241001000002', '002_add_players'),
  ('20241001000003', '003_add_video_sources'),
  ('20241001000004', '004_add_community'),
  ('20241001000005', '005_add_users_table'),
  ('20241001000006', '006_add_hand_likes'),
  ('20241001000007', '007_add_payouts_and_matching'),
  ('20241001000008', '008_add_subevent_details'),
  ('20241001000009', '009_add_hand_details'),
  ('20241001000010', '010_add_player_notes'),
  ('20241001000011', '011_add_player_claims'),
  ('20241001000012', '012_add_hand_bookmarks')
ON CONFLICT (version) DO NOTHING;

-- 확인
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;
