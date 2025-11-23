CREATE OR REPLACE VIEW "public"."arbiter_activity_stats" AS
 SELECT "u"."id" AS "arbiter_id",
    "u"."nickname",
    "u"."email",
    "u"."created_at" AS "arbiter_since",
    "count"(DISTINCT "heh"."hand_id") FILTER (WHERE ("heh"."edit_type" = 'create'::"text")) AS "hands_created",
    "count"(DISTINCT "heh"."hand_id") FILTER (WHERE ("heh"."edit_type" = 'update'::"text")) AS "hands_updated",
    "count"(DISTINCT "heh"."hand_id") FILTER (WHERE ("heh"."edit_type" = 'delete'::"text")) AS "hands_deleted",
    "count"(DISTINCT "her"."id") FILTER (WHERE ("her"."status" = 'approved'::"text")) AS "requests_approved",
    "count"(DISTINCT "her"."id") FILTER (WHERE ("her"."status" = 'rejected'::"text")) AS "requests_rejected",
    "max"("heh"."created_at") AS "last_hand_edit",
    "max"("her"."reviewed_at") AS "last_request_review"
   FROM (("public"."users" "u"
     LEFT JOIN "public"."hand_edit_history" "heh" ON ((("u"."id" = "heh"."editor_id") AND ("heh"."created_at" > ("now"() - '30 days'::interval)))))
     LEFT JOIN "public"."hand_edit_requests" "her" ON ((("u"."id" = "her"."reviewed_by") AND ("her"."reviewed_at" > ("now"() - '30 days'::interval)))))
  WHERE (("u"."role" = 'arbiter'::"text") AND ("u"."banned_at" IS NULL))
  GROUP BY "u"."id", "u"."nickname", "u"."email", "u"."created_at"
  ORDER BY ("count"(DISTINCT "heh"."hand_id") FILTER (WHERE ("heh"."edit_type" = 'create'::"text"))) DESC;


ALTER VIEW "public"."arbiter_activity_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."arbiter_activity_stats" IS 'Arbiter activity statistics for the last 30 days';
CREATE OR REPLACE VIEW "public"."tournament_category_stats" AS
 SELECT "public"."normalize_tournament_category"("category") AS "normalized_category",
    "category" AS "original_category",
    "count"(*) AS "tournament_count",
    "min"("start_date") AS "earliest_date",
    "max"("end_date") AS "latest_date"
   FROM "public"."tournaments"
  GROUP BY "category"
  ORDER BY ("count"(*)) DESC;


ALTER VIEW "public"."tournament_category_stats" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_admin_performance_quick_check" AS
 SELECT 'Database Size'::"text" AS "check_name",
    ( SELECT "pg_size_pretty"(("sum"("pg_total_relation_size"((((("pg_tables"."schemaname")::"text" || '.'::"text") || ("pg_tables"."tablename")::"text"))::"regclass")))::bigint) AS "pg_size_pretty"
           FROM "pg_tables"
          WHERE ("pg_tables"."schemaname" = 'public'::"name")) AS "value",
    'OK'::"text" AS "status"
UNION ALL
 SELECT 'Table Cache Hit Ratio'::"text" AS "check_name",
    ( SELECT (("round"((("sum"("pg_statio_user_tables"."heap_blks_hit") / NULLIF(("sum"("pg_statio_user_tables"."heap_blks_hit") + "sum"("pg_statio_user_tables"."heap_blks_read")), (0)::numeric)) * (100)::numeric), 2))::"text" || '%'::"text")
           FROM "pg_statio_user_tables") AS "value",
        CASE
            WHEN (( SELECT "round"((("sum"("pg_statio_user_tables"."heap_blks_hit") / NULLIF(("sum"("pg_statio_user_tables"."heap_blks_hit") + "sum"("pg_statio_user_tables"."heap_blks_read")), (0)::numeric)) * (100)::numeric), 2) AS "round"
               FROM "pg_statio_user_tables") > (95)::numeric) THEN 'GOOD'::"text"
            WHEN (( SELECT "round"((("sum"("pg_statio_user_tables"."heap_blks_hit") / NULLIF(("sum"("pg_statio_user_tables"."heap_blks_hit") + "sum"("pg_statio_user_tables"."heap_blks_read")), (0)::numeric)) * (100)::numeric), 2) AS "round"
               FROM "pg_statio_user_tables") > (90)::numeric) THEN 'OK'::"text"
            ELSE 'WARNING'::"text"
        END AS "status"
UNION ALL
 SELECT 'Index Cache Hit Ratio'::"text" AS "check_name",
    ( SELECT (("round"((("sum"("pg_statio_user_indexes"."idx_blks_hit") / NULLIF(("sum"("pg_statio_user_indexes"."idx_blks_hit") + "sum"("pg_statio_user_indexes"."idx_blks_read")), (0)::numeric)) * (100)::numeric), 2))::"text" || '%'::"text")
           FROM "pg_statio_user_indexes") AS "value",
        CASE
            WHEN (( SELECT "round"((("sum"("pg_statio_user_indexes"."idx_blks_hit") / NULLIF(("sum"("pg_statio_user_indexes"."idx_blks_hit") + "sum"("pg_statio_user_indexes"."idx_blks_read")), (0)::numeric)) * (100)::numeric), 2) AS "round"
               FROM "pg_statio_user_indexes") > (95)::numeric) THEN 'GOOD'::"text"
            WHEN (( SELECT "round"((("sum"("pg_statio_user_indexes"."idx_blks_hit") / NULLIF(("sum"("pg_statio_user_indexes"."idx_blks_hit") + "sum"("pg_statio_user_indexes"."idx_blks_read")), (0)::numeric)) * (100)::numeric), 2) AS "round"
               FROM "pg_statio_user_indexes") > (90)::numeric) THEN 'OK'::"text"
            ELSE 'WARNING'::"text"
        END AS "status"
UNION ALL
 SELECT 'Unused Indexes'::"text" AS "check_name",
    ( SELECT ("count"(*))::"text" AS "count"
           FROM "pg_stat_user_indexes"
          WHERE (("pg_stat_user_indexes"."idx_scan" = 0) AND ("pg_stat_user_indexes"."indexrelname" !~~ '%_pkey'::"text"))) AS "value",
        CASE
            WHEN (( SELECT "count"(*) AS "count"
               FROM "pg_stat_user_indexes"
              WHERE (("pg_stat_user_indexes"."idx_scan" = 0) AND ("pg_stat_user_indexes"."indexrelname" !~~ '%_pkey'::"text"))) = 0) THEN 'GOOD'::"text"
            WHEN (( SELECT "count"(*) AS "count"
               FROM "pg_stat_user_indexes"
              WHERE (("pg_stat_user_indexes"."idx_scan" = 0) AND ("pg_stat_user_indexes"."indexrelname" !~~ '%_pkey'::"text"))) < 5) THEN 'OK'::"text"
            ELSE 'WARNING'::"text"
        END AS "status";


ALTER VIEW "public"."v_admin_performance_quick_check" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_admin_performance_quick_check" IS 'Quick health check for admins with status indicators.
Usage: SELECT * FROM v_admin_performance_quick_check;
Statuses: GOOD (optimal), OK (acceptable), WARNING (needs attention).';



CREATE OR REPLACE VIEW "public"."v_cache_hit_ratio" AS
 SELECT 'Index'::"text" AS "cache_type",
    "sum"("pg_statio_user_indexes"."idx_blks_hit") AS "hits",
    "sum"("pg_statio_user_indexes"."idx_blks_read") AS "reads",
        CASE
            WHEN (("sum"("pg_statio_user_indexes"."idx_blks_hit") + "sum"("pg_statio_user_indexes"."idx_blks_read")) = (0)::numeric) THEN (0)::numeric
            ELSE "round"((("sum"("pg_statio_user_indexes"."idx_blks_hit") / ("sum"("pg_statio_user_indexes"."idx_blks_hit") + "sum"("pg_statio_user_indexes"."idx_blks_read"))) * (100)::numeric), 2)
        END AS "hit_ratio_pct"
   FROM "pg_statio_user_indexes"
UNION ALL
 SELECT 'Table'::"text" AS "cache_type",
    "sum"("pg_statio_user_tables"."heap_blks_hit") AS "hits",
    "sum"("pg_statio_user_tables"."heap_blks_read") AS "reads",
        CASE
            WHEN (("sum"("pg_statio_user_tables"."heap_blks_hit") + "sum"("pg_statio_user_tables"."heap_blks_read")) = (0)::numeric) THEN (0)::numeric
            ELSE "round"((("sum"("pg_statio_user_tables"."heap_blks_hit") / ("sum"("pg_statio_user_tables"."heap_blks_hit") + "sum"("pg_statio_user_tables"."heap_blks_read"))) * (100)::numeric), 2)
        END AS "hit_ratio_pct"
   FROM "pg_statio_user_tables";


ALTER VIEW "public"."v_cache_hit_ratio" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_cache_hit_ratio" IS 'Shows cache hit ratios for tables and indexes.
Target: >95% hit ratio. Lower values indicate insufficient shared_buffers.
Usage: SELECT * FROM v_cache_hit_ratio;';



CREATE OR REPLACE VIEW "public"."v_database_size" AS
 SELECT "datname" AS "database_name",
    "pg_size_pretty"("pg_database_size"("datname")) AS "size"
   FROM "pg_database"
  WHERE ("datname" = "current_database"());


ALTER VIEW "public"."v_database_size" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_database_size" IS 'Shows total database size';



CREATE OR REPLACE VIEW "public"."v_duplicate_indexes" AS
 SELECT "pg_size_pretty"(("sum"("pg_relation_size"(("idx"."indexrelid")::"regclass")))::bigint) AS "total_size",
    "array_agg"(("idx"."indexrelid")::"regclass") AS "indexes",
    ("idx"."indkey")::"text" AS "columns"
   FROM ("pg_index" "idx"
     JOIN "pg_class" "c" ON (("c"."oid" = "idx"."indexrelid")))
  WHERE (("c"."relnamespace" = ( SELECT "pg_namespace"."oid"
           FROM "pg_namespace"
          WHERE ("pg_namespace"."nspname" = 'public'::"name"))) AND (NOT "idx"."indisprimary"))
  GROUP BY "idx"."indrelid", "idx"."indkey"
 HAVING ("count"(*) > 1);


ALTER VIEW "public"."v_duplicate_indexes" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_duplicate_indexes" IS 'Detects potentially duplicate indexes (same columns).
Usage: SELECT * FROM v_duplicate_indexes;
Action: Review and drop unnecessary duplicates.';



CREATE OR REPLACE VIEW "public"."v_fulltext_search_stats" AS
SELECT
    NULL::"text" AS "table_name",
    NULL::bigint AS "total_rows",
    NULL::bigint AS "indexed_rows",
    NULL::"text" AS "index_size";


ALTER VIEW "public"."v_fulltext_search_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_fulltext_search_stats" IS 'Statistics for full-text search indexes.
Shows coverage and size of FTS indexes.
Usage: SELECT * FROM v_fulltext_search_stats;';



CREATE OR REPLACE VIEW "public"."v_index_sizes" AS
 SELECT "schemaname",
    "relname" AS "tablename",
    "indexrelname" AS "indexname",
    "pg_size_pretty"("pg_relation_size"(("indexrelid")::"regclass")) AS "index_size",
    "idx_scan" AS "scans",
    "idx_tup_read" AS "tuples_read",
    "idx_tup_fetch" AS "tuples_fetched"
   FROM "pg_stat_user_indexes"
  WHERE ("schemaname" = 'public'::"name")
  ORDER BY ("pg_relation_size"(("indexrelid")::"regclass")) DESC;


ALTER VIEW "public"."v_index_sizes" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_index_sizes" IS 'Shows all indexes with their sizes and usage statistics';



CREATE OR REPLACE VIEW "public"."v_index_statistics" AS
 SELECT "schemaname",
    "relname" AS "tablename",
    "indexrelname" AS "indexname",
    "idx_scan",
    "idx_tup_read",
    "idx_tup_fetch",
    "pg_size_pretty"("pg_relation_size"(("indexrelid")::"regclass")) AS "size"
   FROM "pg_stat_user_indexes"
  WHERE ("schemaname" = 'public'::"name")
  ORDER BY ("pg_relation_size"(("indexrelid")::"regclass")) DESC;


ALTER VIEW "public"."v_index_statistics" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_index_statistics" IS 'Shows index usage and size statistics';



CREATE OR REPLACE VIEW "public"."v_index_usage_stats" AS
 SELECT "schemaname",
    "relname" AS "tablename",
    "indexrelname" AS "indexname",
    "idx_scan" AS "scans",
    "idx_tup_read" AS "tuples_read",
    "idx_tup_fetch" AS "tuples_fetched",
    "pg_size_pretty"("pg_relation_size"(("indexrelid")::"regclass")) AS "size",
        CASE
            WHEN ("idx_scan" = 0) THEN 'UNUSED'::"text"
            WHEN ("idx_scan" < 100) THEN 'LOW'::"text"
            WHEN ("idx_scan" < 1000) THEN 'MEDIUM'::"text"
            ELSE 'HIGH'::"text"
        END AS "usage_level"
   FROM "pg_stat_user_indexes"
  WHERE ("schemaname" = 'public'::"name")
  ORDER BY "idx_scan", ("pg_relation_size"(("indexrelid")::"regclass")) DESC;


ALTER VIEW "public"."v_index_usage_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_index_usage_stats" IS 'Shows index usage statistics with usage level classification.
Usage: SELECT * FROM v_index_usage_stats WHERE usage_level = ''UNUSED'';
Helps identify: unused indexes, underutilized indexes.';



CREATE OR REPLACE VIEW "public"."v_monitoring_dashboard" AS
 SELECT ( SELECT "count"(*) AS "count"
           FROM "pg_stat_user_tables") AS "total_tables",
    ( SELECT "count"(*) AS "count"
           FROM "pg_stat_user_indexes"
          WHERE ("pg_stat_user_indexes"."indexrelname" !~~ '%_pkey'::"text")) AS "total_indexes",
    ( SELECT "count"(*) AS "count"
           FROM "pg_stat_user_indexes"
          WHERE (("pg_stat_user_indexes"."idx_scan" = 0) AND ("pg_stat_user_indexes"."indexrelname" !~~ '%_pkey'::"text"))) AS "unused_indexes",
    ( SELECT "pg_size_pretty"(("sum"("pg_total_relation_size"((((("pg_tables"."schemaname")::"text" || '.'::"text") || ("pg_tables"."tablename")::"text"))::"regclass")))::bigint) AS "pg_size_pretty"
           FROM "pg_tables"
          WHERE ("pg_tables"."schemaname" = 'public'::"name")) AS "total_db_size",
    ( SELECT "round"((("sum"("pg_statio_user_tables"."heap_blks_hit") / NULLIF(("sum"("pg_statio_user_tables"."heap_blks_hit") + "sum"("pg_statio_user_tables"."heap_blks_read")), (0)::numeric)) * (100)::numeric), 2) AS "round"
           FROM "pg_statio_user_tables") AS "table_cache_hit_pct",
    ( SELECT "round"((("sum"("pg_statio_user_indexes"."idx_blks_hit") / NULLIF(("sum"("pg_statio_user_indexes"."idx_blks_hit") + "sum"("pg_statio_user_indexes"."idx_blks_read")), (0)::numeric)) * (100)::numeric), 2) AS "round"
           FROM "pg_statio_user_indexes") AS "index_cache_hit_pct";


ALTER VIEW "public"."v_monitoring_dashboard" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_monitoring_dashboard" IS 'Single-row dashboard with key database health metrics.
Usage: SELECT * FROM v_monitoring_dashboard;
Use for: Quick health checks, monitoring alerts.';



CREATE OR REPLACE VIEW "public"."v_rls_function_test" AS
 SELECT 'is_admin'::"text" AS "function_name",
    "public"."is_admin"() AS "result",
    'Should be fast with STABLE'::"text" AS "note"
UNION ALL
 SELECT 'is_reporter'::"text" AS "function_name",
    "public"."is_reporter"() AS "result",
    'Should be fast with STABLE'::"text" AS "note"
UNION ALL
 SELECT 'is_banned'::"text" AS "function_name",
    "public"."is_banned"() AS "result",
    'Should be fast with STABLE'::"text" AS "note";


ALTER VIEW "public"."v_rls_function_test" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_rls_function_test" IS 'Test view to verify RLS helper functions are working correctly.
Run: SELECT * FROM v_rls_function_test;';



CREATE OR REPLACE VIEW "public"."v_rls_policy_stats" AS
 SELECT "schemaname",
    "tablename",
    "count"(*) AS "policy_count",
    "string_agg"(("policyname")::"text", ', '::"text" ORDER BY (("policyname")::"text")) AS "policies"
   FROM "pg_policies"
  WHERE ("schemaname" = 'public'::"name")
  GROUP BY "schemaname", "tablename"
  ORDER BY ("count"(*)) DESC, "tablename";


ALTER VIEW "public"."v_rls_policy_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_rls_policy_stats" IS 'Shows RLS policy count per table.
Usage: SELECT * FROM v_rls_policy_stats;
Helps identify tables with many policies.';



CREATE OR REPLACE VIEW "public"."v_table_bloat" AS
 SELECT "s"."schemaname",
    "s"."relname" AS "tablename",
    "pg_size_pretty"("pg_relation_size"((((("s"."schemaname")::"text" || '.'::"text") || ("s"."relname")::"text"))::"regclass")) AS "table_size",
    "round"(((("pg_relation_size"((((("s"."schemaname")::"text" || '.'::"text") || ("s"."relname")::"text"))::"regclass"))::numeric / (NULLIF(("pg_stat_get_live_tuples"("c"."oid") + "pg_stat_get_dead_tuples"("c"."oid")), 0))::numeric) * ("pg_stat_get_dead_tuples"("c"."oid"))::numeric), 2) AS "estimated_bloat_bytes",
    "pg_stat_get_dead_tuples"("c"."oid") AS "dead_tuples",
    "pg_stat_get_live_tuples"("c"."oid") AS "live_tuples",
        CASE
            WHEN (("pg_stat_get_live_tuples"("c"."oid") + "pg_stat_get_dead_tuples"("c"."oid")) = 0) THEN (0)::numeric
            ELSE "round"(((("pg_stat_get_dead_tuples"("c"."oid"))::numeric / (("pg_stat_get_live_tuples"("c"."oid") + "pg_stat_get_dead_tuples"("c"."oid")))::numeric) * (100)::numeric), 2)
        END AS "bloat_pct"
   FROM ("pg_stat_user_tables" "s"
     JOIN "pg_class" "c" ON ((("c"."relname" = "s"."relname") AND ("c"."relnamespace" = ( SELECT "pg_namespace"."oid"
           FROM "pg_namespace"
          WHERE ("pg_namespace"."nspname" = "s"."schemaname"))))))
  WHERE ("s"."schemaname" = 'public'::"name")
  ORDER BY ("pg_stat_get_dead_tuples"("c"."oid")) DESC;


ALTER VIEW "public"."v_table_bloat" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_table_bloat" IS 'Estimates table bloat from dead tuples.
Bloat >20%: Consider running VACUUM.
Usage: SELECT * FROM v_table_bloat WHERE bloat_pct > 20;';



CREATE OR REPLACE VIEW "public"."v_table_sizes" AS
 SELECT "schemaname",
    "tablename",
    "pg_size_pretty"("pg_total_relation_size"((((("schemaname")::"text" || '.'::"text") || ("tablename")::"text"))::"regclass")) AS "total_size",
    "pg_size_pretty"("pg_relation_size"((((("schemaname")::"text" || '.'::"text") || ("tablename")::"text"))::"regclass")) AS "table_size",
    "pg_size_pretty"(("pg_total_relation_size"((((("schemaname")::"text" || '.'::"text") || ("tablename")::"text"))::"regclass") - "pg_relation_size"((((("schemaname")::"text" || '.'::"text") || ("tablename")::"text"))::"regclass"))) AS "indexes_size",
    "pg_total_relation_size"((((("schemaname")::"text" || '.'::"text") || ("tablename")::"text"))::"regclass") AS "total_bytes"
   FROM "pg_tables"
  WHERE ("schemaname" = 'public'::"name")
  ORDER BY ("pg_total_relation_size"((((("schemaname")::"text" || '.'::"text") || ("tablename")::"text"))::"regclass")) DESC;


ALTER VIEW "public"."v_table_sizes" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_table_sizes" IS 'Shows table and index sizes sorted by total size.
Usage: SELECT * FROM v_table_sizes;
Helps identify: large tables, index bloat, storage issues.';



CREATE OR REPLACE VIEW "public"."v_table_statistics" AS
 SELECT "schemaname",
    "relname" AS "tablename",
    "pg_size_pretty"("pg_total_relation_size"((((("schemaname")::"text" || '.'::"text") || ("relname")::"text"))::"regclass")) AS "total_size",
    "pg_size_pretty"("pg_relation_size"((((("schemaname")::"text" || '.'::"text") || ("relname")::"text"))::"regclass")) AS "table_size",
    "pg_size_pretty"(("pg_total_relation_size"((((("schemaname")::"text" || '.'::"text") || ("relname")::"text"))::"regclass") - "pg_relation_size"((((("schemaname")::"text" || '.'::"text") || ("relname")::"text"))::"regclass"))) AS "indexes_size",
    "n_live_tup" AS "live_rows",
    "n_dead_tup" AS "dead_rows",
    "n_tup_ins" AS "inserts",
    "n_tup_upd" AS "updates",
    "n_tup_del" AS "deletes",
    "last_vacuum",
    "last_autovacuum",
    "last_analyze",
    "last_autoanalyze"
   FROM "pg_stat_user_tables"
  WHERE ("schemaname" = 'public'::"name")
  ORDER BY ("pg_total_relation_size"((((("schemaname")::"text" || '.'::"text") || ("relname")::"text"))::"regclass")) DESC;


ALTER VIEW "public"."v_table_statistics" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_table_statistics" IS 'Shows table sizes, row counts, and maintenance statistics';



CREATE OR REPLACE VIEW "public"."v_unused_indexes" AS
 SELECT "schemaname",
    "relname" AS "tablename",
    "indexrelname" AS "indexname",
    "idx_scan" AS "index_scans",
    "pg_size_pretty"("pg_relation_size"(("indexrelid")::"regclass")) AS "index_size",
    "pg_relation_size"(("indexrelid")::"regclass") AS "index_size_bytes"
   FROM "pg_stat_user_indexes"
  WHERE (("schemaname" = 'public'::"name") AND ("idx_scan" = 0) AND ("indexrelid" IS NOT NULL))
  ORDER BY ("pg_relation_size"(("indexrelid")::"regclass")) DESC;


ALTER VIEW "public"."v_unused_indexes" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_unused_indexes" IS 'Identifies potentially unused indexes for removal consideration. Run after 7+ days of production usage.';



CREATE OR REPLACE VIEW "public"."v_user_ban_status" AS
 SELECT "id",
    "email",
    "nickname",
    ("banned_at" IS NOT NULL) AS "is_banned_computed",
    "banned_at",
    "ban_reason",
    "banned_by",
        CASE
            WHEN ("banned_at" IS NOT NULL) THEN (EXTRACT(epoch FROM ("now"() - "banned_at")) / 86400.0)
            ELSE NULL::numeric
        END AS "days_since_ban"
   FROM "public"."users";


ALTER VIEW "public"."v_user_ban_status" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_user_ban_status" IS 'Helper view for ban status. Use is_banned_computed instead of is_banned column.';
