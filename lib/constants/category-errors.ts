/**
 * Category Error Messages
 * 카테고리 관련 에러 메시지 상수
 */

export const CATEGORY_ERRORS = {
  // Fetch errors
  FETCH_FAILED: (error: string) => `Failed to fetch categories: ${error}`,
  FETCH_BY_REGION_FAILED: (error: string) => `Failed to fetch categories by region: ${error}`,
  FETCH_BY_ID_FAILED: (error: string) => `Failed to fetch category: ${error}`,
  FETCH_BY_ALIAS_FAILED: (error: string) => `Failed to fetch category by alias: ${error}`,
  SEARCH_FAILED: (error: string) => `Failed to search categories: ${error}`,

  // CRUD errors
  DUPLICATE_ID: (id: string) => `Category with ID "${id}" already exists`,
  CREATE_FAILED: (error: string) => `Failed to create category: ${error}`,
  UPDATE_FAILED: (error: string) => `Failed to update category: ${error}`,
  NOT_FOUND: (id: string) => `Category with ID "${id}" not found`,

  // Delete errors
  DELETE_IN_USE: (count: number) =>
    `Cannot delete category because it is used by ${count} tournament(s). ` +
    `Please reassign or delete those tournaments first.`,
  DELETE_FAILED: (error: string) => `Failed to delete category: ${error}`,

  // Usage count errors
  USAGE_COUNT_FAILED: (error: string) => `Failed to get category usage count: ${error}`,
  USAGE_COUNTS_FAILED: (error: string) => `Failed to get category usage counts: ${error}`,

  // Reorder errors
  REORDER_FAILED: (id: string, error: string) => `Failed to reorder category ${id}: ${error}`,

  // Logo upload errors
  FILE_TOO_LARGE: 'File size must be less than 5MB',
  INVALID_FILE_TYPE: 'File must be SVG, PNG, or JPEG',
  UPLOAD_FAILED: (error: string) => `Failed to upload logo: ${error}`,
} as const

export const CATEGORY_VALIDATIONS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: ['image/svg+xml', 'image/png', 'image/jpeg'],
} as const
