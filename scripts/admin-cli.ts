#!/usr/bin/env npx tsx
/**
 * Templar Archives Admin CLI
 *
 * 통합 관리 도구 - 운영 작업을 하나의 CLI로 수행
 *
 * 사용법:
 *   npm run admin -- --action=<action>
 *
 * 예시:
 *   npm run admin -- --action=check-jobs       # KAN 작업 상태 확인
 *   npm run admin -- --action=cleanup-jobs     # STUCK 작업 정리
 *   npm run admin -- --action=check-rls        # RLS 정책 점검
 *   npm run admin -- --action=check-db         # DB 상태 확인
 *   npm run admin -- --action=help             # 도움말
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================================
// CLI Argument Parsing
// ============================================================================

interface Args {
  action: string;
  help: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const result: Args = {
    action: "help",
    help: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--action=")) {
      result.action = arg.split("=")[1];
    } else if (arg === "--help" || arg === "-h") {
      result.help = true;
    }
  }

  return result;
}

// ============================================================================
// Actions
// ============================================================================

async function showHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                    Templar Archives Admin CLI v1.0                         ║
╚════════════════════════════════════════════════════════════════════════════╝

사용법:
  npm run admin -- --action=<action>

가능한 Actions:

  📊 check-jobs      KAN 분석 작업 상태 확인
                     - 최근 5개 작업 상태 표시
                     - STUCK 작업 감지 (10분 초과)

  🧹 cleanup-jobs    STUCK 상태 작업 정리
                     - 10분 이상 processing 상태 작업을 failed로 변경
                     - 새 분석 시작 가능하도록 정리

  🔒 check-rls       RLS 정책 점검
                     - 핵심 테이블 RLS 정책 확인
                     - 익명 사용자 접근 테스트

  🗄️  check-db       DB 상태 확인
                     - 테이블별 레코드 수 확인
                     - 최근 사용자 목록

  ❓ help            이 도움말 표시

예시:
  npm run admin -- --action=check-jobs
  npm run admin -- --action=cleanup-jobs
`);
}

async function checkJobs() {
  console.log("\n📊 KAN 분석 작업 상태 확인");
  console.log("═".repeat(80));

  // 1. 최근 분석 작업 확인
  const { data: jobs, error: jobsError } = await supabase
    .from("analysis_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (jobsError) {
    console.error("❌ analysis_jobs 조회 실패:", jobsError.message);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log("\n⚪ 분석 작업이 없습니다.");
    return;
  }

  console.log(`\n✅ 최근 분석 작업 (${jobs.length}개):`);

  for (const [idx, job] of jobs.entries()) {
    const elapsed = job.started_at
      ? Math.floor((Date.now() - new Date(job.started_at).getTime()) / 1000)
      : null;

    const healthStatus =
      job.status === "processing" && elapsed && elapsed > 600
        ? "🔴 STUCK"
        : job.status === "processing"
          ? "🟢 RUNNING"
          : job.status === "success"
            ? "✅ SUCCESS"
            : job.status === "failed"
              ? "❌ FAILED"
              : "⚪ PENDING";

    console.log(`\n  ${idx + 1}. ${healthStatus}`);
    console.log(`     ID: ${job.id}`);
    console.log(`     Status: ${job.status}`);
    console.log(`     Progress: ${job.progress || 0}%`);
    console.log(`     Hands Found: ${job.hands_found || 0}`);
    console.log(`     Video ID: ${job.video_id || "N/A"}`);
    console.log(`     Stream ID: ${job.stream_id || "N/A"}`);
    console.log(
      `     Created: ${new Date(job.created_at).toLocaleString("ko-KR")}`
    );

    if (job.started_at) {
      console.log(
        `     Started: ${new Date(job.started_at).toLocaleString("ko-KR")}`
      );
      console.log(`     Elapsed: ${elapsed}s`);
    }
    if (job.completed_at) {
      console.log(
        `     Completed: ${new Date(job.completed_at).toLocaleString("ko-KR")}`
      );
    }
    if (job.error_message) {
      console.log(`     Error: ${job.error_message}`);
    }
  }

  // STUCK 작업 수 요약
  const stuckCount = jobs.filter((job) => {
    if (job.status !== "processing" || !job.started_at) return false;
    const elapsed = Math.floor(
      (Date.now() - new Date(job.started_at).getTime()) / 1000
    );
    return elapsed > 600;
  }).length;

  if (stuckCount > 0) {
    console.log(`\n⚠️  ${stuckCount}개의 STUCK 작업이 있습니다.`);
    console.log('   npm run admin -- --action=cleanup-jobs 로 정리하세요.');
  }

  console.log("\n" + "═".repeat(80));
}

async function cleanupJobs() {
  console.log("\n🧹 STUCK 작업 정리");
  console.log("═".repeat(60));

  // Find stuck jobs (processing > 10 minutes)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: stuckJobs, error: findError } = await supabase
    .from("analysis_jobs")
    .select("*")
    .eq("status", "processing")
    .lt("started_at", tenMinutesAgo);

  if (findError) {
    console.error("❌ 조회 실패:", findError.message);
    return;
  }

  if (!stuckJobs || stuckJobs.length === 0) {
    console.log("\n✅ STUCK 상태 작업 없음");
    return;
  }

  console.log(`\n⚠️  ${stuckJobs.length}개의 STUCK 작업 발견:`);
  for (const job of stuckJobs) {
    const elapsed = Math.floor(
      (Date.now() - new Date(job.started_at).getTime()) / 1000
    );
    console.log(`  - ID: ${job.id} (${Math.floor(elapsed / 60)}분 경과)`);
  }

  // Update to failed
  const { data, error } = await supabase
    .from("analysis_jobs")
    .update({
      status: "failed",
      error_message: "STUCK 상태로 인한 자동 정리 (Admin CLI)",
      completed_at: new Date().toISOString(),
    })
    .eq("status", "processing")
    .lt("started_at", tenMinutesAgo)
    .select();

  if (error) {
    console.error("❌ 업데이트 실패:", error.message);
    return;
  }

  console.log(`\n✅ ${data?.length || 0}개 작업 정리 완료`);
  console.log("\n이제 새로운 분석을 시작할 수 있습니다.");
}

async function checkRLS() {
  console.log("\n🔒 RLS 정책 점검");
  console.log("═".repeat(80));

  const tables = [
    "tournaments",
    "sub_events",
    "streams",
    "hands",
    "players",
    "hand_players",
    "hand_actions",
    "users",
    "analysis_jobs",
  ];

  // Get table info
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: ${count || 0} rows`);
    }
  }

  // Test anonymous access
  if (supabaseAnonKey) {
    console.log("\n\n🧪 익명 사용자 접근 테스트...\n");

    const anonSupabase = createClient(supabaseUrl!, supabaseAnonKey);

    for (const table of ["tournaments", "sub_events", "streams"]) {
      const { data, error } = await anonSupabase
        .from(table)
        .select("id")
        .limit(1);

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: SELECT 가능 (${data?.length || 0} rows)`);
      }
    }
  }

  console.log("\n" + "═".repeat(80));
}

async function checkDB() {
  console.log("\n🗄️  DB 상태 확인");
  console.log("═".repeat(80));

  // Core tables count
  const coreTables = [
    "tournaments",
    "sub_events",
    "streams",
    "hands",
    "hand_players",
    "hand_actions",
    "players",
    "users",
    "analysis_jobs",
    "videos",
  ];

  console.log("\n📊 테이블별 레코드 수:\n");

  for (const table of coreTables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.log(`   ${table.padEnd(20)} ❌ ${error.message}`);
    } else {
      const countStr = (count || 0).toLocaleString().padStart(10);
      console.log(`   ${table.padEnd(20)} ${countStr} rows`);
    }
  }

  // Recent users
  console.log("\n\n👥 최근 사용자:");

  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, email, role, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (usersError) {
    console.error("❌ users 조회 실패:", usersError.message);
  } else if (users && users.length > 0) {
    for (const user of users) {
      const roleEmoji =
        user.role === "admin"
          ? "👑"
          : user.role === "high_templar"
            ? "⭐"
            : user.role === "reporter"
              ? "📝"
              : "👤";

      console.log(`   ${roleEmoji} ${user.email} (${user.role})`);
    }
  }

  console.log("\n" + "═".repeat(80));
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = parseArgs();

  if (args.help) {
    await showHelp();
    return;
  }

  switch (args.action) {
    case "check-jobs":
      await checkJobs();
      break;
    case "cleanup-jobs":
      await cleanupJobs();
      break;
    case "check-rls":
      await checkRLS();
      break;
    case "check-db":
      await checkDB();
      break;
    case "help":
    default:
      await showHelp();
      break;
  }
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
