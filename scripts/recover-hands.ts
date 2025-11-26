/**
 * Recovery Script - 완료된 Trigger.dev 작업에서 핸드 복구
 *
 * 사용법:
 * npx tsx scripts/recover-hands.ts <run_id> [--delete-existing]
 *
 * 예시:
 * npx tsx scripts/recover-hands.ts run_cmifltdyp7jc52yn5vzt0znz9 --delete-existing
 */

import { runs, configure } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";
import { saveHandsToDatabase, updateStreamStatus } from "../lib/database/hand-saver";

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are not set");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

async function deleteExistingHands(streamId: string): Promise<number> {
  const supabase = createSupabaseClient();

  // 먼저 hand_actions 삭제 (FK 종속)
  const { data: hands } = await supabase
    .from("hands")
    .select("id")
    .eq("day_id", streamId);

  if (hands && hands.length > 0) {
    const handIds = hands.map((h) => h.id);

    // hand_actions 삭제
    await supabase.from("hand_actions").delete().in("hand_id", handIds);

    // hand_players 삭제
    await supabase.from("hand_players").delete().in("hand_id", handIds);
  }

  // hands 삭제
  const { count } = await supabase
    .from("hands")
    .delete()
    .eq("day_id", streamId)
    .select("*", { count: "exact", head: true });

  return count || 0;
}

async function recoverHands(runId: string, deleteExisting: boolean = false) {
  console.log(`[Recovery] Starting recovery for run: ${runId}`);
  console.log(`[Recovery] Delete existing: ${deleteExisting}`);

  // Trigger.dev SDK 설정
  const secretKey = process.env.TRIGGER_SECRET_KEY;
  if (!secretKey) {
    console.error("[Recovery] TRIGGER_SECRET_KEY is not set!");
    process.exit(1);
  }

  configure({ secretKey });

  try {
    // 작업 결과 조회
    console.log("[Recovery] Retrieving run output...");
    const run = await runs.retrieve(runId);

    console.log(`[Recovery] Run status: ${run.status}`);

    if (run.status !== "COMPLETED") {
      console.error(`[Recovery] Run is not completed: ${run.status}`);
      process.exit(1);
    }

    const output = run.output as {
      success: boolean;
      streamId: string;
      hands?: any[];
      handCount?: number;
    };

    if (!output || !output.success) {
      console.error("[Recovery] Run output is invalid:", output);
      process.exit(1);
    }

    console.log(`[Recovery] Stream ID: ${output.streamId}`);
    console.log(`[Recovery] Hand count: ${output.handCount || output.hands?.length || 0}`);

    // hands 배열이 있으면 저장
    if (output.hands && output.hands.length > 0) {
      console.log(`[Recovery] Found ${output.hands.length} hands to save`);

      // 기존 핸드 삭제 (중복 방지)
      if (deleteExisting) {
        console.log("[Recovery] Deleting existing hands for this stream...");
        const deletedCount = await deleteExistingHands(output.streamId);
        console.log(`[Recovery] Deleted ${deletedCount} existing hands`);
      } else {
        console.warn("[Recovery] WARNING: Existing hands will remain. Use --delete-existing to remove them first.");
      }

      // 핸드 저장
      const result = await saveHandsToDatabase(output.streamId, output.hands);

      console.log(`[Recovery] Save result:`, result);

      if (result.success) {
        console.log(`[Recovery] Successfully saved ${result.saved} hands!`);
        console.log(`[Recovery] Errors: ${result.errors}`);

        // 스트림 상태 업데이트
        await updateStreamStatus(output.streamId, "completed");
        console.log("[Recovery] Stream status updated to 'completed'");
      } else {
        console.error(`[Recovery] Failed to save hands: ${result.error}`);
      }
    } else {
      console.log("[Recovery] No hands array in output - checking if already saved to DB");
      console.log("[Recovery] Output:", JSON.stringify(output, null, 2));
    }
  } catch (error) {
    console.error("[Recovery] Error:", error);
    process.exit(1);
  }
}

// 실행
const args = process.argv.slice(2);
const runId = args.find(arg => !arg.startsWith('--'));
const deleteExisting = args.includes('--delete-existing');

if (!runId) {
  console.error("Usage: npx tsx scripts/recover-hands.ts <run_id> [--delete-existing]");
  console.error("");
  console.error("Options:");
  console.error("  --delete-existing  기존 핸드를 삭제하고 새로 저장");
  process.exit(1);
}

recoverHands(runId, deleteExisting).catch(console.error);
