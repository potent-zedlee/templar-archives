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
║                    Templar Archives Admin CLI v2.0                         ║
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

  👥 check-players   플레이어 DB 상태 확인
                     - 전체 플레이어 수, 국가별 분포
                     - Top 플레이어 목록

  🔍 diagnose        전체 시스템 진단
                     - DB, RLS, KAN 작업 한 번에 확인

  ❓ help            이 도움말 표시

예시:
  npm run admin -- --action=check-jobs
  npm run admin -- --action=cleanup-jobs
  npm run admin -- --action=diagnose
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

async function checkPlayers() {
  console.log("\n👥 플레이어 DB 상태 확인");
  console.log("═".repeat(80));

  // Total count
  const { count: totalCount, error: countError } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("❌ players 조회 실패:", countError.message);
    return;
  }

  console.log(`\n📊 전체 플레이어 수: ${totalCount?.toLocaleString() || 0}명`);

  // Players without country
  const { data: noCountryPlayers, error: noCountryError } = await supabase
    .from("players")
    .select("id, name")
    .is("country", null);

  if (!noCountryError) {
    console.log(`📍 국가 정보 없는 플레이어: ${noCountryPlayers?.length || 0}명`);
  }

  // Country distribution (top 10)
  const { data: countries, error: countriesError } = await supabase
    .from("players")
    .select("country")
    .not("country", "is", null);

  if (!countriesError && countries) {
    const countryMap: Record<string, number> = {};
    countries.forEach((p) => {
      if (p.country) {
        countryMap[p.country] = (countryMap[p.country] || 0) + 1;
      }
    });

    const sortedCountries = Object.entries(countryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log("\n🌍 국가별 분포 (Top 10):");
    for (const [country, count] of sortedCountries) {
      console.log(`   ${country.padEnd(20)} ${count.toString().padStart(5)}명`);
    }
  }

  // Top players by winnings
  const { data: topPlayers, error: topError } = await supabase
    .from("players")
    .select("name, country, total_winnings")
    .order("total_winnings", { ascending: false, nullsFirst: false })
    .limit(5);

  if (!topError && topPlayers && topPlayers.length > 0) {
    console.log("\n🏆 상금 Top 5 플레이어:");
    topPlayers.forEach((p, i) => {
      const winnings = p.total_winnings
        ? `$${(p.total_winnings / 100).toLocaleString()}`
        : "$0";
      console.log(`   ${i + 1}. ${p.name} (${p.country || "N/A"}) - ${winnings}`);
    });
  }

  // Gender distribution
  const { data: genderData, error: genderError } = await supabase
    .from("players")
    .select("gender");

  if (!genderError && genderData) {
    const genderMap: Record<string, number> = { male: 0, female: 0, other: 0, unknown: 0 };
    genderData.forEach((p) => {
      const g = p.gender || "unknown";
      genderMap[g] = (genderMap[g] || 0) + 1;
    });

    console.log("\n👤 성별 분포:");
    console.log(`   남성: ${genderMap.male}명`);
    console.log(`   여성: ${genderMap.female}명`);
    console.log(`   기타/미설정: ${genderMap.other + genderMap.unknown}명`);
  }

  console.log("\n" + "═".repeat(80));
}

async function diagnose() {
  console.log("\n🔍 전체 시스템 진단");
  console.log("═".repeat(80));
  console.log("DB, RLS, KAN 작업 상태를 순차 확인합니다.\n");

  // 1. DB 상태
  await checkDB();

  // 2. RLS 상태 (간략)
  console.log("\n🔒 RLS 정책 점검 (간략)");
  console.log("─".repeat(40));

  const rlsTables = ["tournaments", "sub_events", "streams", "hands"];
  for (const table of rlsTables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.log(`   ${table.padEnd(15)} ❌ ${error.message}`);
    } else {
      console.log(`   ${table.padEnd(15)} ✅ OK (${count || 0} rows)`);
    }
  }

  // 3. KAN 작업 상태 (간략)
  console.log("\n📊 KAN 작업 상태 (간략)");
  console.log("─".repeat(40));

  const { data: jobs, error: jobsError } = await supabase
    .from("analysis_jobs")
    .select("status")
    .order("created_at", { ascending: false })
    .limit(10);

  if (jobsError) {
    console.log("   ❌ analysis_jobs 조회 실패");
  } else if (jobs && jobs.length > 0) {
    const statusCount: Record<string, number> = {};
    jobs.forEach((j) => {
      statusCount[j.status] = (statusCount[j.status] || 0) + 1;
    });

    console.log("   최근 10개 작업 상태:");
    for (const [status, count] of Object.entries(statusCount)) {
      const emoji =
        status === "success" ? "✅" :
        status === "failed" ? "❌" :
        status === "processing" ? "🔄" :
        "⚪";
      console.log(`     ${emoji} ${status}: ${count}개`);
    }
  } else {
    console.log("   ⚪ 분석 작업 없음");
  }

  console.log("\n" + "═".repeat(80));
  console.log("✅ 진단 완료\n");
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
    case "check-players":
      await checkPlayers();
      break;
    case "diagnose":
      await diagnose();
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
