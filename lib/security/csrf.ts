/**
 * CSRF (Cross-Site Request Forgery) 보호
 *
 * Next.js API Routes 및 Server Actions를 위한 CSRF 토큰 검증
 */

import { NextRequest, NextResponse } from "next/server"
import { createHash, randomBytes } from "crypto"

/**
 * CSRF 토큰 생성
 */
export function generateCSRFToken(): string {
  return randomBytes(32).toString("hex")
}

/**
 * CSRF 토큰 해시 생성 (서버 측 저장용)
 */
export function hashCSRFToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/**
 * CSRF 토큰 검증 (API Routes용)
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   const csrfError = await verifyCSRF(request)
 *   if (csrfError) return csrfError
 *
 *   // 계속 진행...
 * }
 */
export async function verifyCSRF(
  request: NextRequest
): Promise<NextResponse | null> {
  // GET, HEAD, OPTIONS 요청은 CSRF 검증 불필요
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return null
  }

  // Origin 검증
  const origin = request.headers.get("origin")
  const host = request.headers.get("host")

  // Origin이 없거나 호스트와 일치하지 않으면 차단
  if (origin) {
    try {
      const originUrl = new URL(origin)
      const expectedOrigin = `${originUrl.protocol}//${host}`

      if (origin !== expectedOrigin) {
        console.warn(`CSRF: Origin mismatch - ${origin} vs ${expectedOrigin}`)
        return NextResponse.json(
          { error: "Invalid origin" },
          { status: 403 }
        )
      }
    } catch (error) {
      console.error("CSRF: Invalid origin header", error)
      return NextResponse.json(
        { error: "Invalid origin" },
        { status: 403 }
      )
    }
  }

  // Referer 검증 (Origin이 없을 때 fallback)
  if (!origin) {
    const referer = request.headers.get("referer")
    if (referer) {
      try {
        const refererUrl = new URL(referer)
        if (refererUrl.host !== host) {
          console.warn(`CSRF: Referer mismatch - ${refererUrl.host} vs ${host}`)
          return NextResponse.json(
            { error: "Invalid referer" },
            { status: 403 }
          )
        }
      } catch (error) {
        console.error("CSRF: Invalid referer header", error)
      }
    }
  }

  // CSRF 토큰 검증 (커스텀 헤더 사용)
  const csrfToken = request.headers.get("x-csrf-token")

  // 개발 환경에서는 경고만 출력
  if (!csrfToken && process.env.NODE_ENV === "development") {
    console.warn("CSRF: No token provided (development mode)")
    return null
  }

  if (!csrfToken && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "CSRF token required" },
      { status: 403 }
    )
  }

  // Double Submit Cookie 패턴을 사용한 CSRF 토큰 검증
  // 쿠키에 저장된 해시 값과 헤더의 토큰을 비교
  if (csrfToken) {
    const cookieToken = request.cookies.get("csrf-token")?.value ?? null

    // 쿠키가 없거나 토큰이 일치하지 않으면 차단
    if (!verifyDoubleSubmitToken(csrfToken, cookieToken)) {
      console.warn("CSRF: Token verification failed")

      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Invalid CSRF token" },
          { status: 403 }
        )
      }
    }
  }

  return null
}

/**
 * Same-Site Cookie 설정
 *
 * CSRF 공격을 방지하기 위해 SameSite 속성 사용
 */
export const SECURE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
}

/**
 * CSRF 보호 미들웨어 (간소화 버전)
 */
export function createCSRFMiddleware() {
  return async (request: NextRequest) => {
    // API 라우트만 검증
    if (request.nextUrl.pathname.startsWith("/api/")) {
      const csrfError = await verifyCSRF(request)
      if (csrfError) {
        return csrfError
      }
    }

    return NextResponse.next()
  }
}

/**
 * Double Submit Cookie 패턴을 위한 토큰 생성
 *
 * 쿠키와 요청 헤더에 동일한 토큰을 사용하여 검증
 */
export function generateDoubleSubmitToken(): {
  token: string
  cookieValue: string
} {
  const token = generateCSRFToken()
  const cookieValue = hashCSRFToken(token)

  return {
    token, // 클라이언트가 헤더에 포함
    cookieValue, // 쿠키에 저장
  }
}

/**
 * Double Submit 토큰 검증
 */
export function verifyDoubleSubmitToken(
  headerToken: string | null,
  cookieToken: string | null
): boolean {
  if (!headerToken || !cookieToken) {
    return false
  }

  const hashedHeaderToken = hashCSRFToken(headerToken)
  return hashedHeaderToken === cookieToken
}

/**
 * API 요청을 위한 CSRF 보호 클라이언트 헬퍼
 *
 * @example
 * const response = await fetchWithCSRF('/api/endpoint', {
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * })
 */
export async function fetchWithCSRF(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // CSRF 토큰 가져오기 (쿠키 또는 meta 태그에서)
  const csrfToken = getCSRFToken()

  const headers = new Headers(options.headers)

  // CSRF 토큰 헤더 추가
  if (csrfToken) {
    headers.set("x-csrf-token", csrfToken)
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

/**
 * 클라이언트에서 CSRF 토큰 가져오기
 */
function getCSRFToken(): string | null {
  // Meta 태그에서 토큰 가져오기
  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="csrf-token"]')
    if (meta) {
      return meta.getAttribute("content")
    }
  }

  return null
}

/**
 * CSRF 토큰을 포함한 폼 필드 생성 헬퍼
 */
export function CSRFTokenInput(): string {
  const token = generateCSRFToken()
  return `<input type="hidden" name="_csrf" value="${token}" />`
}
