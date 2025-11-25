/**
 * GCS (Google Cloud Storage) 타입 정의
 */

/**
 * Resumable Upload 세션 초기화 결과
 */
export interface ResumableUploadSession {
  /** Resumable Upload URL */
  uploadUrl: string;
  /** GCS URI (gs://bucket/path/to/file) */
  gcsUri: string;
}

/**
 * 파일 메타데이터
 */
export interface FileMetadata {
  name: string;
  bucket: string;
  generation: string;
  metageneration: string;
  contentType: string;
  size: string;
  md5Hash: string;
  crc32c: string;
  etag: string;
  timeCreated: Date;
  updated: Date;
  storageClass: string;
}

/**
 * Signed URL 옵션
 */
export interface SignedUrlOptions {
  /** 만료 시간 (분) */
  expiresInMinutes?: number;
  /** HTTP 메서드 (기본값: 'GET') */
  action?: 'read' | 'write' | 'delete' | 'resumable';
  /** Content-Type */
  contentType?: string;
}

/**
 * GCS 클라이언트 설정
 */
export interface GCSConfig {
  projectId: string;
  bucketName: string;
  clientEmail: string;
  privateKey: string;
}
