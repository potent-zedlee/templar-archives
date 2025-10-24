/**
 * File Upload Validator
 *
 * 파일 업로드 보안 검증 모듈
 * - 파일 타입 whitelist
 * - 파일 크기 제한
 * - 파일명 sanitization
 * - Magic number 검증 (실제 파일 형식 확인)
 */

// ==================== Constants ====================

/**
 * 허용된 이미지 MIME 타입
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

/**
 * 허용된 영상 MIME 타입
 */
export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  'video/x-matroska', // .mkv
  'video/webm',
] as const

/**
 * 파일 크기 제한 (bytes)
 */
export const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB
  video: 500 * 1024 * 1024, // 500MB
  avatar: 2 * 1024 * 1024, // 2MB
} as const

/**
 * Magic Numbers (파일 시그니처)
 *
 * 실제 파일 내용의 첫 몇 바이트로 파일 형식을 확인
 */
export const MAGIC_NUMBERS: Record<string, number[][]> = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF], // JPEG
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG
  ],
  'image/webp': [
    [0x52, 0x49, 0x46, 0x46], // RIFF (WebP는 RIFF 컨테이너)
  ],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  'video/mp4': [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp
    [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70],
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
  ],
  'video/quicktime': [
    [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74], // ftypqt
  ],
  'video/webm': [
    [0x1A, 0x45, 0xDF, 0xA3], // EBML
  ],
}

// ==================== Types ====================

export type FileType = 'image' | 'video' | 'avatar'

export interface FileValidationResult {
  valid: boolean
  error?: string
  sanitizedName?: string
}

// ==================== Validation Functions ====================

/**
 * 파일명 sanitization
 *
 * 위험한 문자 제거 및 안전한 파일명 생성
 */
export function sanitizeFilename(filename: string): string {
  // 확장자 분리
  const lastDot = filename.lastIndexOf('.')
  const name = lastDot !== -1 ? filename.substring(0, lastDot) : filename
  const ext = lastDot !== -1 ? filename.substring(lastDot) : ''

  // 파일명 정제 (영문, 숫자, 하이픈, 언더스코어만 허용)
  const sanitizedName = name
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .substring(0, 100) // 최대 100자

  // 확장자 정제
  const sanitizedExt = ext
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '')
    .substring(0, 10) // 최대 10자

  // 타임스탬프 추가 (중복 방지)
  const timestamp = Date.now()

  return `${sanitizedName}_${timestamp}${sanitizedExt}`
}

/**
 * Magic Number 검증
 *
 * 파일의 실제 내용을 확인하여 MIME 타입과 일치하는지 검증
 */
export async function verifyMagicNumber(
  file: File,
  mimeType: string
): Promise<boolean> {
  const magicNumbers = MAGIC_NUMBERS[mimeType]
  if (!magicNumbers || magicNumbers.length === 0) {
    // Magic number가 정의되지 않은 타입은 통과
    return true
  }

  try {
    // 파일의 첫 8바이트 읽기
    const arrayBuffer = await file.slice(0, 8).arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    // 각 magic number 패턴과 비교
    for (const pattern of magicNumbers) {
      let match = true
      for (let i = 0; i < pattern.length && i < bytes.length; i++) {
        if (bytes[i] !== pattern[i]) {
          match = false
          break
        }
      }
      if (match) return true
    }

    return false
  } catch (error) {
    console.error('Magic number verification failed:', error)
    return false
  }
}

/**
 * 파일 검증 (통합)
 *
 * @param file - 업로드할 파일
 * @param type - 파일 타입 (image, video, avatar)
 * @returns 검증 결과
 */
export async function validateFile(
  file: File,
  type: FileType
): Promise<FileValidationResult> {
  // 1. 파일 타입 검증
  const allowedTypes =
    type === 'video'
      ? ALLOWED_VIDEO_TYPES
      : type === 'avatar'
      ? ['image/jpeg', 'image/png', 'image/webp']
      : ALLOWED_IMAGE_TYPES

  if (!allowedTypes.includes(file.type as any)) {
    return {
      valid: false,
      error: `지원하지 않는 파일 형식입니다. 허용된 형식: ${allowedTypes.join(', ')}`
    }
  }

  // 2. 파일 크기 검증
  const maxSize = FILE_SIZE_LIMITS[type]
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0)
    return {
      valid: false,
      error: `파일 크기는 ${maxSizeMB}MB를 초과할 수 없습니다`
    }
  }

  // 3. Magic Number 검증 (실제 파일 형식 확인)
  const isMagicNumberValid = await verifyMagicNumber(file, file.type)
  if (!isMagicNumberValid) {
    return {
      valid: false,
      error: '파일 형식이 확장자와 일치하지 않습니다'
    }
  }

  // 4. 파일명 sanitization
  const sanitizedName = sanitizeFilename(file.name)

  return {
    valid: true,
    sanitizedName
  }
}

/**
 * 이미지 파일 검증
 */
export async function validateImageFile(file: File): Promise<FileValidationResult> {
  return validateFile(file, 'image')
}

/**
 * 영상 파일 검증
 */
export async function validateVideoFile(file: File): Promise<FileValidationResult> {
  return validateFile(file, 'video')
}

/**
 * 아바타 이미지 검증
 */
export async function validateAvatarFile(file: File): Promise<FileValidationResult> {
  return validateFile(file, 'avatar')
}
