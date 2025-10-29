/**
 * Test API for Hand Analysis Engine Integration
 *
 * Tests basic import and instantiation of the package
 */

import { NextResponse } from 'next/server'
import { HandAnalyzer } from 'hand-analysis-engine'

export async function GET() {
  try {
    // Test 1: Import check
    if (!HandAnalyzer) {
      return NextResponse.json({
        success: false,
        error: 'HandAnalyzer import failed',
      }, { status: 500 })
    }

    // Test 2: Instantiation check
    const analyzer = new HandAnalyzer('test-api-key')

    if (!analyzer) {
      return NextResponse.json({
        success: false,
        error: 'HandAnalyzer instantiation failed',
      }, { status: 500 })
    }

    // Test 3: Method existence check
    const hasAnalyzeVideo = typeof analyzer.analyzeVideo === 'function'
    const hasAnalyzeSingleHand = typeof analyzer.analyzeSingleHand === 'function'

    return NextResponse.json({
      success: true,
      message: 'Hand Analysis Engine integration successful',
      tests: {
        import: true,
        instantiation: true,
        methods: {
          analyzeVideo: hasAnalyzeVideo,
          analyzeSingleHand: hasAnalyzeSingleHand,
        },
      },
      packageInfo: {
        name: 'hand-analysis-engine',
        version: '1.0.0',
      },
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      stack: error.stack,
    }, { status: 500 })
  }
}
