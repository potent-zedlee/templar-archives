/**
 * Sorting Types
 *
 * 재사용 가능한 정렬 관련 타입 정의
 * Phase 33: Comprehensive Sorting & Type Safety Enhancement
 */

/**
 * 정렬 방향
 */
export type SortDirection = "asc" | "desc"

/**
 * 정렬 설정
 */
export interface SortConfig<T = string> {
  field: T
  direction: SortDirection
}

/**
 * Admin Archive 페이지 정렬 필드
 */
export type AdminArchiveSortField = "name" | "category" | "type" | "location" | "date"

/**
 * Unsorted Videos 정렬 필드
 */
export type UnsortedVideosSortField = "name" | "source" | "created" | "published"

/**
 * 정렬 핸들러 props
 */
export interface SortHandlerProps<T> {
  field: T
  currentField: T
  currentDirection: SortDirection
  onSort: (field: T, direction: SortDirection) => void
}

/**
 * 정렬 가능 컬럼 헤더 props
 */
export interface SortableColumnProps<T> {
  field: T
  label: string
  currentField: T
  currentDirection: SortDirection
  onSort: (field: T) => void
  align?: "left" | "center" | "right"
  className?: string
}

/**
 * 정렬 비교 함수 타입
 */
export type SortCompareFn<T> = (a: T, b: T, direction: SortDirection) => number

/**
 * Null-safe 정렬 옵션
 */
export interface NullSafeSortOptions {
  /**
   * null 값을 정렬 시 어디에 배치할지
   * - "first": 정렬 결과의 맨 앞
   * - "last": 정렬 결과의 맨 뒤
   */
  nullPosition?: "first" | "last"
}

/**
 * 페이지네이션 정보
 */
export interface PaginationInfo {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

/**
 * 서버 정렬 파라미터
 */
export interface ServerSortParams<T = string> {
  sortField: T
  sortDirection: SortDirection
  page?: number
  pageSize?: number
}

/**
 * 정렬 결과
 */
export interface SortResult<T> {
  data: T[]
  pagination?: PaginationInfo
}
