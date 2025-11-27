/**
 * Hand Thumbnail Generator
 *
 * 핸드 썸네일을 자동으로 생성하고 Firebase Storage에 업로드
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { extractSingleFrame } from './frame-extractor'
import { storage, firestore } from './firebase'
import { COLLECTION_PATHS } from './firestore-types'

/**
 * 타임스탬프를 초 단위로 변환
 * @param timestamp "00:05:23" or "05:23" format
 */
function parseTimestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':').map(Number)

  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1]
  } else {
    throw new Error(`Invalid timestamp format: ${timestamp}`)
  }
}

/**
 * Blob을 File로 변환
 */
function blobToFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, { type: blob.type })
}

/**
 * 핸드 썸네일 생성 및 업로드
 *
 * @param handId 핸드 ID
 * @param videoUrl 비디오 URL (YouTube, 로컬, NAS)
 * @param timestamp 핸드 타임스탬프 (예: "00:05:23")
 * @param onProgress 진행률 콜백 (0-100)
 * @returns 업로드된 썸네일 공개 URL
 */
export async function generateHandThumbnail(
  handId: string,
  videoUrl: string,
  timestamp: string,
  onProgress?: (progress: number, status: string) => void
): Promise<string> {
  try {
    // 1. 타임스탬프를 초 단위로 변환
    onProgress?.(10, '타임스탬프 파싱 중...')
    const timestampSeconds = parseTimestampToSeconds(timestamp)

    // 2. 비디오에서 프레임 추출
    onProgress?.(20, '비디오 프레임 추출 중...')
    const frame = await extractSingleFrame(videoUrl, timestampSeconds, 1280, 720)

    // 3. Blob을 File로 변환
    onProgress?.(60, '이미지 변환 중...')
    const fileName = `${handId}.jpg`
    const file = blobToFile(frame.blob, fileName)

    // 4. Firebase Storage에 업로드
    onProgress?.(70, 'Storage 업로드 중...')
    const storageRef = ref(storage, `hand-thumbnails/${fileName}`)

    // Blob을 Uint8Array로 변환하여 업로드
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    await uploadBytes(storageRef, uint8Array, {
      contentType: 'image/jpeg',
      customMetadata: {
        handId,
        timestamp,
        uploadedAt: new Date().toISOString(),
      },
    })

    // 5. 다운로드 URL 가져오기
    onProgress?.(85, 'URL 생성 중...')
    const thumbnailUrl = await getDownloadURL(storageRef)

    // 6. hands 컬렉션 업데이트
    onProgress?.(90, 'DB 업데이트 중...')
    const handRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
    await updateDoc(handRef, {
      thumbnailUrl,
      updatedAt: serverTimestamp(),
    })

    onProgress?.(100, '완료')
    return thumbnailUrl

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
    throw new Error(`썸네일 생성 실패: ${errorMessage}`)
  }
}

/**
 * 여러 핸드의 썸네일 일괄 생성
 *
 * @param hands 핸드 배열 (id, timestamp 포함)
 * @param videoUrl 공통 비디오 URL
 * @param onProgress 전체 진행률 콜백 (0-100)
 * @param onHandProgress 개별 핸드 진행률 콜백
 */
export async function generateMultipleHandThumbnails(
  hands: Array<{ id: string; timestamp: string }>,
  videoUrl: string,
  onProgress?: (progress: number, handIndex: number, total: number) => void,
  onHandProgress?: (handId: string, progress: number, status: string) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  }

  const total = hands.length

  for (let i = 0; i < total; i++) {
    const hand = hands[i]

    try {
      await generateHandThumbnail(
        hand.id,
        videoUrl,
        hand.timestamp,
        (progress, status) => {
          onHandProgress?.(hand.id, progress, status)
        }
      )

      results.success++
      onProgress?.(Math.round(((i + 1) / total) * 100), i + 1, total)

    } catch (error) {
      results.failed++
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
      results.errors.push(`Hand ${hand.id}: ${errorMessage}`)

      onProgress?.(Math.round(((i + 1) / total) * 100), i + 1, total)
    }
  }

  return results
}

/**
 * YouTube URL에서 썸네일 가져오기 (대체 방법)
 * YouTube API 없이 기본 썸네일 URL 생성
 */
export function getYouTubeThumbnail(youtubeUrl: string, quality: 'default' | 'hq' | 'mq' | 'sd' | 'maxres' = 'hq'): string | null {
  try {
    const videoIdMatch = youtubeUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)

    if (!videoIdMatch || !videoIdMatch[1]) {
      return null
    }

    const videoId = videoIdMatch[1]

    // YouTube 썸네일 URL 패턴
    const qualityMap = {
      'default': 'default.jpg',
      'mq': 'mqdefault.jpg',
      'hq': 'hqdefault.jpg',
      'sd': 'sddefault.jpg',
      'maxres': 'maxresdefault.jpg',
    }

    return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}`

  } catch {
    return null
  }
}

/**
 * 썸네일 삭제 (Firebase Storage에서)
 *
 * @param handId 핸드 ID
 */
export async function deleteThumbnail(handId: string): Promise<void> {
  const { deleteObject } = await import('firebase/storage')
  const storageRef = ref(storage, `hand-thumbnails/${handId}.jpg`)

  try {
    await deleteObject(storageRef)
  } catch (error) {
    // 파일이 없는 경우 무시
    console.warn(`Thumbnail not found for hand ${handId}:`, error)
  }
}
