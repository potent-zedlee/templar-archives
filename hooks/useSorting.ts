/**
 * useSorting Hook
 *
 * 클라이언트 사이드 정렬을 위한 재사용 가능한 커스텀 훅
 * Phase 33: Comprehensive Sorting & Type Safety Enhancement
 */

import { useState, useMemo, useCallback } from "react"
import type { SortDirection, NullSafeSortOptions } from "@/lib/types/sorting"

/**
 * useSorting Props
 */
interface UseSortingProps<T, K extends keyof T> {
  /**
   * 정렬할 데이터
   */
  data: T[]
  /**
   * 기본 정렬 필드
   */
  defaultField: K
  /**
   * 기본 정렬 방향
   */
  defaultDirection?: SortDirection
  /**
   * Null 값 처리 옵션
   */
  nullSafeOptions?: NullSafeSortOptions
}

/**
 * useSorting Return Type
 */
interface UseSortingReturn<T, K extends keyof T> {
  /**
   * 정렬된 데이터
   */
  sortedData: T[]
  /**
   * 현재 정렬 필드
   */
  sortField: K
  /**
   * 현재 정렬 방향
   */
  sortDirection: SortDirection
  /**
   * 정렬 핸들러
   */
  handleSort: (field: K) => void
  /**
   * 정렬 상태 초기화
   */
  resetSort: () => void
}

/**
 * Null-safe 비교 함수
 */
function nullSafeCompare<T>(
  a: T | null | undefined,
  b: T | null | undefined,
  direction: SortDirection,
  nullPosition: "first" | "last" = "last"
): number {
  // 둘 다 null
  if (a == null && b == null) return 0

  // a만 null
  if (a == null) {
    return nullPosition === "first" ? -1 : 1
  }

  // b만 null
  if (b == null) {
    return nullPosition === "first" ? 1 : -1
  }

  // 둘 다 값이 있음 - 타입에 따라 비교
  if (typeof a === "string" && typeof b === "string") {
    const result = a.localeCompare(b, "ko-KR", { sensitivity: "base" })
    return direction === "asc" ? result : -result
  }

  if (typeof a === "number" && typeof b === "number") {
    return direction === "asc" ? a - b : b - a
  }

  if (a instanceof Date && b instanceof Date) {
    const diff = a.getTime() - b.getTime()
    return direction === "asc" ? diff : -diff
  }

  // 기본 비교 (toString)
  const aStr = String(a)
  const bStr = String(b)
  const result = aStr.localeCompare(bStr, "ko-KR", { sensitivity: "base" })
  return direction === "asc" ? result : -result
}

/**
 * 클라이언트 사이드 정렬 훅
 *
 * @example
 * ```tsx
 * const { sortedData, sortField, sortDirection, handleSort } = useSorting({
 *   data: tournaments,
 *   defaultField: "name",
 *   defaultDirection: "asc"
 * })
 * ```
 */
export function useSorting<T, K extends keyof T>({
  data,
  defaultField,
  defaultDirection = "asc",
  nullSafeOptions = {},
}: UseSortingProps<T, K>): UseSortingReturn<T, K> {
  const [sortField, setSortField] = useState<K>(defaultField)
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection)

  /**
   * 정렬 핸들러
   */
  const handleSort = useCallback(
    (field: K) => {
      if (sortField === field) {
        // 같은 필드 클릭 시 방향 토글
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
      } else {
        // 다른 필드 클릭 시 해당 필드로 변경, 기본 asc
        setSortField(field)
        setSortDirection("asc")
      }
    },
    [sortField]
  )

  /**
   * 정렬 초기화
   */
  const resetSort = useCallback(() => {
    setSortField(defaultField)
    setSortDirection(defaultDirection)
  }, [defaultField, defaultDirection])

  /**
   * 정렬된 데이터
   */
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return []

    const sorted = [...data].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      return nullSafeCompare(
        aValue,
        bValue,
        sortDirection,
        nullSafeOptions.nullPosition
      )
    })

    return sorted
  }, [data, sortField, sortDirection, nullSafeOptions.nullPosition])

  return {
    sortedData,
    sortField,
    sortDirection,
    handleSort,
    resetSort,
  }
}

/**
 * 정렬 방향 아이콘 헬퍼
 */
export function getSortIcon(
  field: string,
  currentField: string,
  currentDirection: SortDirection
): "asc" | "desc" | "unsorted" {
  if (field !== currentField) return "unsorted"
  return currentDirection
}

/**
 * ARIA 정렬 속성 헬퍼
 */
export function getSortAriaProps(
  field: string,
  currentField: string,
  currentDirection: SortDirection
) {
  const isActive = field === currentField

  return {
    "aria-sort": isActive
      ? currentDirection === "asc"
        ? ("ascending" as const)
        : ("descending" as const)
      : ("none" as const),
    "aria-pressed": isActive,
  }
}
