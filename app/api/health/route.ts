/**
 * Health Check API Endpoint
 *
 * Returns the health status of the application.
 * Used by uptime monitoring services (BetterStack, Checkly, etc.)
 */

import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  try {
    // Basic health check
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'templar-archives',
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'production',
    }

    return NextResponse.json(health, { status: 200 })
  } catch (error) {
    // Return error status if something goes wrong
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
