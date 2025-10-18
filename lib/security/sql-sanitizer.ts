/**
 * SQL Injection 방지 유틸리티
 *
 * Supabase는 기본적으로 Prepared Statements를 사용하지만,
 * 추가 검증 및 sanitization을 위한 유틸리티
 */

/**
 * 위험한 SQL 키워드 목록
 */
const DANGEROUS_SQL_KEYWORDS = [
  "DROP",
  "DELETE",
  "TRUNCATE",
  "ALTER",
  "CREATE",
  "EXEC",
  "EXECUTE",
  "SCRIPT",
  "UNION",
  "INSERT",
  "UPDATE",
  "--",
  "/*",
  "*/",
  "xp_",
  "sp_",
  "0x",
]

/**
 * SQL 인젝션 시도 감지
 */
export function detectSQLInjection(input: string): boolean {
  const upperInput = input.toUpperCase()

  // 위험한 키워드 검사
  for (const keyword of DANGEROUS_SQL_KEYWORDS) {
    if (upperInput.includes(keyword)) {
      return true
    }
  }

  // 여러 SQL 문장 시도 검사 (;로 구분)
  if (input.includes(";") && input.split(";").length > 2) {
    return true
  }

  // SQL 주석 패턴 검사
  if (/--\s|\/\*|\*\//g.test(input)) {
    return true
  }

  // UNION 기반 인젝션 검사
  if (/UNION\s+SELECT/i.test(input)) {
    return true
  }

  return false
}

/**
 * LIKE 쿼리용 특수문자 이스케이프
 */
export function escapeLikePattern(input: string): string {
  // %, _, \ 문자를 이스케이프
  return input.replace(/[%_\\]/g, "\\$&")
}

/**
 * 식별자(테이블명, 컬럼명) 검증
 */
export function validateIdentifier(identifier: string): boolean {
  // 영문자, 숫자, 언더스코어만 허용
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)
}

/**
 * 안전한 LIKE 쿼리 생성
 */
export function createSafeLikePattern(input: string): string {
  const escaped = escapeLikePattern(input.trim())
  return `%${escaped}%`
}

/**
 * 검색 쿼리 sanitization
 */
export function sanitizeSearchQuery(query: string): {
  safe: boolean
  sanitized: string
  warnings: string[]
} {
  const warnings: string[] = []

  // SQL 인젝션 시도 감지
  if (detectSQLInjection(query)) {
    warnings.push("잠재적인 SQL 인젝션 시도가 감지되었습니다")
    return {
      safe: false,
      sanitized: "",
      warnings,
    }
  }

  // 공백 정규화
  let sanitized = query.trim().replace(/\s+/g, " ")

  // 길이 제한
  if (sanitized.length > 200) {
    warnings.push("검색어가 너무 깁니다 (200자 제한)")
    sanitized = sanitized.substring(0, 200)
  }

  // 안전한 문자만 허용 (알파벳, 숫자, 공백, 기본 구두점)
  const safeChars = /^[a-zA-Z0-9가-힣\s.,!?'"\-:()]+$/
  if (!safeChars.test(sanitized)) {
    warnings.push("허용되지 않는 특수문자가 포함되어 있습니다")
    // 허용되지 않는 문자 제거
    sanitized = sanitized.replace(/[^a-zA-Z0-9가-힣\s.,!?'"\-:()]/g, "")
  }

  return {
    safe: warnings.length === 0 || warnings.every((w) => !w.includes("인젝션")),
    sanitized,
    warnings,
  }
}

/**
 * UUID 검증
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * 정수 검증
 */
export function isValidInteger(value: unknown, min?: number, max?: number): boolean {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return false
  }

  if (min !== undefined && value < min) {
    return false
  }

  if (max !== undefined && value > max) {
    return false
  }

  return true
}

/**
 * 날짜 형식 검증 (YYYY-MM-DD)
 */
export function isValidDateFormat(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    return false
  }

  // 실제 날짜 유효성 검사
  const parsedDate = new Date(date)
  return !isNaN(parsedDate.getTime())
}

/**
 * 허용된 정렬 필드 검증
 */
export function validateSortField(
  field: string,
  allowedFields: string[]
): boolean {
  return allowedFields.includes(field) && validateIdentifier(field)
}

/**
 * 허용된 정렬 방향 검증
 */
export function validateSortDirection(direction: string): direction is "asc" | "desc" {
  return direction === "asc" || direction === "desc"
}
