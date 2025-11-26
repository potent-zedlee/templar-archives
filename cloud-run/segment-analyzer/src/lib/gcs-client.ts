/**
 * GCS Client
 *
 * 기존 lib/gcs/client.ts 포팅
 * Cloud Run 환경에 최적화
 */

import { Storage } from '@google-cloud/storage'
import * as fs from 'fs'

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'templar-archives-videos'

export class GCSClient {
  private storage: Storage
  private bucketName: string

  constructor() {
    const projectId = process.env.GCS_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT
    const clientEmail = process.env.GCS_CLIENT_EMAIL
    const privateKey = process.env.GCS_PRIVATE_KEY

    if (!projectId) {
      throw new Error('GCS_PROJECT_ID 또는 GOOGLE_CLOUD_PROJECT 환경 변수가 필요합니다')
    }

    const storageOptions: {
      projectId: string
      credentials?: {
        client_email: string
        private_key: string
      }
    } = { projectId }

    if (clientEmail && privateKey) {
      storageOptions.credentials = {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      }
      console.log(`[GCSClient] 서비스 계정 인증 사용: ${clientEmail}`)
    } else {
      console.log('[GCSClient] ADC(Application Default Credentials) 사용')
    }

    this.storage = new Storage(storageOptions)
    this.bucketName = BUCKET_NAME

    console.log(`[GCSClient] 초기화 완료: ${this.bucketName}`)
  }

  /**
   * Signed URL 생성
   */
  async getSignedUrl(
    filePath: string,
    options: {
      expiresInMinutes?: number
      action?: 'read' | 'write'
    } = {}
  ): Promise<string> {
    const { expiresInMinutes = 60, action = 'read' } = options

    const [url] = await this.storage
      .bucket(this.bucketName)
      .file(filePath)
      .getSignedUrl({
        version: 'v4',
        action,
        expires: Date.now() + expiresInMinutes * 60 * 1000,
      })

    return url
  }

  /**
   * 파일 업로드 (로컬 파일 경로에서)
   */
  async uploadFile(
    destinationPath: string,
    sourceFilePath: string,
    contentType: string = 'application/octet-stream'
  ): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName)
    const file = bucket.file(destinationPath)

    await bucket.upload(sourceFilePath, {
      destination: destinationPath,
      contentType,
    })

    return `gs://${this.bucketName}/${destinationPath}`
  }

  /**
   * 파일 업로드 (Buffer에서)
   */
  async uploadBuffer(
    destinationPath: string,
    buffer: Buffer,
    contentType: string = 'application/octet-stream'
  ): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName)
    const file = bucket.file(destinationPath)

    await file.save(buffer, {
      contentType,
    })

    return `gs://${this.bucketName}/${destinationPath}`
  }

  /**
   * 파일 삭제
   */
  async deleteFile(filePath: string): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName)
    const file = bucket.file(filePath)

    await file.delete()
  }

  /**
   * 파일 존재 확인
   */
  async fileExists(filePath: string): Promise<boolean> {
    const bucket = this.storage.bucket(this.bucketName)
    const file = bucket.file(filePath)

    const [exists] = await file.exists()
    return exists
  }
}

// 싱글톤
let _gcsClient: GCSClient | null = null

export const gcsClient = {
  get instance(): GCSClient {
    if (!_gcsClient) {
      _gcsClient = new GCSClient()
    }
    return _gcsClient
  },

  getSignedUrl: (...args: Parameters<GCSClient['getSignedUrl']>) => {
    return gcsClient.instance.getSignedUrl(...args)
  },

  uploadFile: (...args: Parameters<GCSClient['uploadFile']>) => {
    return gcsClient.instance.uploadFile(...args)
  },

  uploadBuffer: (...args: Parameters<GCSClient['uploadBuffer']>) => {
    return gcsClient.instance.uploadBuffer(...args)
  },

  deleteFile: (...args: Parameters<GCSClient['deleteFile']>) => {
    return gcsClient.instance.deleteFile(...args)
  },

  fileExists: (...args: Parameters<GCSClient['fileExists']>) => {
    return gcsClient.instance.fileExists(...args)
  },
}
