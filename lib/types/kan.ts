/**
 * KAN (Khalai Archive Network) TypeScript Type Definitions
 *
 * These types match the Python backend's result structure from Worker (job_poller.py)
 */

import type { KanHand } from '@/app/actions/kan-analysis'

/**
 * Segment analysis result returned by Worker
 */
export interface SegmentResult {
  /** Unique segment identifier (e.g., "seg_0", "seg_1") */
  segment_id: string

  /** Analysis status */
  status: 'pending' | 'completed' | 'failed'

  /** Number of hands found in this segment */
  hands_found: number

  /** Segment start time in seconds */
  start_time: number

  /** Segment end time in seconds */
  end_time: number
}

/**
 * Complete analysis result stored in analysis_jobs.result column (JSONB)
 */
export interface KanAnalysisResult {
  /** Overall analysis success */
  success: boolean

  /** Total number of segments processed (after auto-split) */
  segments_processed: number

  /** Total hands found across all segments */
  total_hands: number

  /** All extracted hands from all segments */
  hands: KanHand[]

  /** Per-segment analysis results (for frontend UI tracking) */
  segment_results: SegmentResult[]
}

/**
 * Type guard to check if a value is a valid KanAnalysisResult
 */
export function isKanAnalysisResult(value: unknown): value is KanAnalysisResult {
  if (typeof value !== 'object' || value === null) return false

  const result = value as Partial<KanAnalysisResult>

  return (
    typeof result.success === 'boolean' &&
    typeof result.segments_processed === 'number' &&
    typeof result.total_hands === 'number' &&
    Array.isArray(result.hands) &&
    Array.isArray(result.segment_results)
  )
}
