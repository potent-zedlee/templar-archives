/**
 * Google Cloud Storage 클라이언트
 *
 * 기능:
 * - Resumable Upload 세션 생성 (대용량 파일 업로드용)
 * - Signed URL 생성 (다운로드/업로드 권한 부여)
 * - 파일 존재 확인 및 메타데이터 조회
 *
 * 사용 시나리오:
 * 1. YouTube 영상 → GCS 업로드 (Resumable Upload)
 * 2. GCS gs:// URI → Vertex AI Gemini 분석
 * 3. Signed URL → 클라이언트 직접 다운로드
 */

import { Storage } from '@google-cloud/storage';
import type {
  ResumableUploadSession,
  FileMetadata,
  SignedUrlOptions,
  GCSConfig,
} from './types';

/**
 * GCS 클라이언트 싱글톤
 */
export class GCSClient {
  private storage: Storage;
  private bucketName: string;

  constructor(config?: GCSConfig) {
    const projectId = config?.projectId || process.env.GCS_PROJECT_ID;
    const bucketName = config?.bucketName || process.env.GCS_BUCKET_NAME;
    const clientEmail = config?.clientEmail || process.env.GCS_CLIENT_EMAIL;
    const privateKey = config?.privateKey || process.env.GCS_PRIVATE_KEY;

    if (!projectId || !bucketName || !clientEmail || !privateKey) {
      throw new Error(
        'GCS 설정이 누락되었습니다. 필수 환경 변수: GCS_PROJECT_ID, GCS_BUCKET_NAME, GCS_CLIENT_EMAIL, GCS_PRIVATE_KEY'
      );
    }

    this.bucketName = bucketName;

    // Storage 클라이언트 초기화
    this.storage = new Storage({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'), // 환경 변수의 \n 복원
      },
    });

    console.log(`[GCSClient] 초기화 완료: ${projectId} / ${bucketName}`);
  }

  /**
   * Resumable Upload 세션 시작
   *
   * @param path - GCS 내 파일 경로 (예: "videos/2024-01/video-123.mp4")
   * @param contentType - MIME 타입 (예: "video/mp4")
   * @returns Resumable Upload URL과 GCS URI
   *
   * @example
   * ```ts
   * const { uploadUrl, gcsUri } = await gcs.initResumableUpload(
   *   'videos/my-video.mp4',
   *   'video/mp4'
   * );
   *
   * // uploadUrl로 chunked 업로드
   * await fetch(uploadUrl, {
   *   method: 'PUT',
   *   body: videoBuffer,
   *   headers: { 'Content-Type': 'video/mp4' }
   * });
   *
   * // gcsUri를 Vertex AI에 전달
   * await vertexAnalyzer.analyzeVideoFromGCS(gcsUri, 'ept');
   * ```
   */
  async initResumableUpload(
    path: string,
    contentType: string
  ): Promise<ResumableUploadSession> {
    try {
      const file = this.storage.bucket(this.bucketName).file(path);

      const [url] = await file.createResumableUpload({
        metadata: {
          contentType,
        },
      });

      const gcsUri = `gs://${this.bucketName}/${path}`;

      console.log(`[GCSClient] Resumable Upload 세션 생성: ${gcsUri}`);

      return {
        uploadUrl: url,
        gcsUri,
      };
    } catch (error) {
      console.error('[GCSClient] Resumable Upload 세션 생성 실패:', error);
      throw new Error(
        `Resumable Upload 초기화 실패: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Signed URL 생성 (다운로드/업로드 권한 부여)
   *
   * @param path - GCS 파일 경로
   * @param options - Signed URL 옵션
   * @returns Signed URL (시간 제한 있는 접근 URL)
   *
   * @example
   * ```ts
   * // 읽기 전용 URL (1시간 유효)
   * const url = await gcs.getSignedUrl('videos/my-video.mp4', {
   *   expiresInMinutes: 60,
   *   action: 'read'
   * });
   * ```
   */
  async getSignedUrl(
    path: string,
    options: SignedUrlOptions = {}
  ): Promise<string> {
    const {
      expiresInMinutes = 60, // 기본 1시간
      action = 'read',
      contentType,
    } = options;

    try {
      const file = this.storage.bucket(this.bucketName).file(path);

      const [url] = await file.getSignedUrl({
        version: 'v4',
        action,
        expires: Date.now() + expiresInMinutes * 60 * 1000,
        contentType,
      });

      console.log(`[GCSClient] Signed URL 생성: ${path} (${expiresInMinutes}분 유효)`);

      return url;
    } catch (error) {
      console.error('[GCSClient] Signed URL 생성 실패:', error);
      throw new Error(
        `Signed URL 생성 실패: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 파일 존재 확인
   *
   * @param path - GCS 파일 경로
   * @returns 파일 존재 여부
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      const file = this.storage.bucket(this.bucketName).file(path);
      const [exists] = await file.exists();

      console.log(`[GCSClient] 파일 존재 확인: ${path} → ${exists}`);

      return exists;
    } catch (error) {
      console.error('[GCSClient] 파일 존재 확인 실패:', error);
      return false;
    }
  }

  /**
   * 파일 메타데이터 조회
   *
   * @param path - GCS 파일 경로
   * @returns 파일 메타데이터
   */
  async getFileMetadata(path: string): Promise<FileMetadata> {
    try {
      const file = this.storage.bucket(this.bucketName).file(path);
      const [metadata] = await file.getMetadata();

      console.log(`[GCSClient] 메타데이터 조회: ${path}`);

      return {
        name: metadata.name,
        bucket: metadata.bucket,
        generation: metadata.generation,
        metageneration: metadata.metageneration,
        contentType: metadata.contentType,
        size: metadata.size,
        md5Hash: metadata.md5Hash,
        crc32c: metadata.crc32c,
        etag: metadata.etag,
        timeCreated: new Date(metadata.timeCreated),
        updated: new Date(metadata.updated),
        storageClass: metadata.storageClass,
      };
    } catch (error) {
      console.error('[GCSClient] 메타데이터 조회 실패:', error);
      throw new Error(
        `메타데이터 조회 실패: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 파일 삭제
   *
   * @param path - GCS 파일 경로
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const file = this.storage.bucket(this.bucketName).file(path);
      await file.delete();

      console.log(`[GCSClient] 파일 삭제: ${path}`);
    } catch (error) {
      console.error('[GCSClient] 파일 삭제 실패:', error);
      throw new Error(
        `파일 삭제 실패: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 파일 직접 업로드 (작은 파일용)
   *
   * @param path - GCS 파일 경로
   * @param buffer - 파일 데이터
   * @param contentType - MIME 타입
   * @returns GCS URI
   */
  async uploadBuffer(
    path: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    try {
      const file = this.storage.bucket(this.bucketName).file(path);

      await file.save(buffer, {
        contentType,
        metadata: {
          contentType,
        },
      });

      const gcsUri = `gs://${this.bucketName}/${path}`;

      console.log(
        `[GCSClient] 파일 업로드 완료: ${gcsUri} (${(buffer.length / 1024 / 1024).toFixed(2)}MB)`
      );

      return gcsUri;
    } catch (error) {
      console.error('[GCSClient] 파일 업로드 실패:', error);
      throw new Error(
        `파일 업로드 실패: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// 싱글톤 인스턴스
let _gcsClient: GCSClient | null = null;

export const gcsClient = {
  get instance(): GCSClient {
    if (!_gcsClient) {
      _gcsClient = new GCSClient();
    }
    return _gcsClient;
  },

  initResumableUpload: (
    ...args: Parameters<GCSClient['initResumableUpload']>
  ) => {
    return gcsClient.instance.initResumableUpload(...args);
  },

  getSignedUrl: (...args: Parameters<GCSClient['getSignedUrl']>) => {
    return gcsClient.instance.getSignedUrl(...args);
  },

  fileExists: (...args: Parameters<GCSClient['fileExists']>) => {
    return gcsClient.instance.fileExists(...args);
  },

  getFileMetadata: (...args: Parameters<GCSClient['getFileMetadata']>) => {
    return gcsClient.instance.getFileMetadata(...args);
  },

  deleteFile: (...args: Parameters<GCSClient['deleteFile']>) => {
    return gcsClient.instance.deleteFile(...args);
  },

  uploadBuffer: (...args: Parameters<GCSClient['uploadBuffer']>) => {
    return gcsClient.instance.uploadBuffer(...args);
  },
};
