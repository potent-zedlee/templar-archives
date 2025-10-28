/**
 * Frame Cropper Utility
 *
 * Sharp를 사용하여 프레임을 OCR 영역으로 크롭
 */

import sharp from 'sharp'
import type { Frame, Region, OcrRegions } from '@/lib/types/ocr'

export interface CroppedFrame {
  /** 원본 프레임 번호 */
  frameNumber: number
  /** 타임스탬프 (HH:MM:SS) */
  timestamp: string
  /** 타임스탬프 (초) */
  timestampSeconds: number
  /** 크롭된 이미지 (Buffer) */
  buffer: Buffer
  /** 크롭 영역 정보 */
  region: Region
  /** 크롭 영역 타입 */
  regionType: 'player' | 'board'
}

/**
 * Region을 픽셀 좌표로 변환
 */
export function regionToPixels(
  region: Region,
  frameWidth: number,
  frameHeight: number
): {
  left: number
  top: number
  width: number
  height: number
} {
  return {
    left: Math.round((region.x_percent / 100) * frameWidth),
    top: Math.round((region.y_percent / 100) * frameHeight),
    width: Math.round((region.width_percent / 100) * frameWidth),
    height: Math.round((region.height_percent / 100) * frameHeight),
  }
}

/**
 * 단일 프레임을 특정 영역으로 크롭
 */
export async function cropFrame(
  frame: Frame,
  region: Region,
  regionType: 'player' | 'board'
): Promise<CroppedFrame> {
  // Region의 퍼센트 좌표를 픽셀 좌표로 변환
  const { left, top, width, height } = regionToPixels(region, frame.width, frame.height)

  // Sharp로 크롭
  const croppedBuffer = await sharp(frame.buffer)
    .extract({
      left,
      top,
      width,
      height,
    })
    .jpeg({ quality: 90 }) // JPEG 품질 설정
    .toBuffer()

  return {
    frameNumber: frame.number,
    timestamp: frame.timestamp,
    timestampSeconds: frame.timestampSeconds,
    buffer: croppedBuffer,
    region,
    regionType,
  }
}

/**
 * 여러 프레임을 2개 영역(player, board)으로 크롭
 */
export async function cropFrames(
  frames: Frame[],
  ocrRegions: OcrRegions
): Promise<{
  playerFrames: CroppedFrame[]
  boardFrames: CroppedFrame[]
}> {
  const playerFrames: CroppedFrame[] = []
  const boardFrames: CroppedFrame[] = []

  for (const frame of frames) {
    // Player 영역 크롭
    const playerFrame = await cropFrame(frame, ocrRegions.player, 'player')
    playerFrames.push(playerFrame)

    // Board 영역 크롭
    const boardFrame = await cropFrame(frame, ocrRegions.board, 'board')
    boardFrames.push(boardFrame)
  }

  return {
    playerFrames,
    boardFrames,
  }
}

/**
 * CroppedFrame을 Base64로 인코딩 (Claude Vision API 전송용)
 */
export function encodeFrameToBase64(frame: CroppedFrame): string {
  return frame.buffer.toString('base64')
}

/**
 * 여러 CroppedFrame을 Base64 배열로 인코딩
 */
export function encodeFramesToBase64(frames: CroppedFrame[]): string[] {
  return frames.map(encodeFrameToBase64)
}

/**
 * Frame을 JPEG로 저장 (디버깅/테스트용)
 */
export async function saveFrameAsJpeg(
  frame: CroppedFrame,
  outputPath: string
): Promise<void> {
  await sharp(frame.buffer).jpeg({ quality: 90 }).toFile(outputPath)
}

/**
 * 프레임 정보 요약
 */
export function getFrameSummary(frame: CroppedFrame): {
  frameNumber: number
  timestamp: string
  regionType: string
  size: number
} {
  return {
    frameNumber: frame.frameNumber,
    timestamp: frame.timestamp,
    regionType: frame.regionType,
    size: frame.buffer.length,
  }
}

/**
 * 여러 프레임의 총 크기 계산 (MB)
 */
export function getTotalFramesSize(frames: CroppedFrame[]): number {
  const totalBytes = frames.reduce((sum, frame) => sum + frame.buffer.length, 0)
  return totalBytes / (1024 * 1024) // MB로 변환
}

/**
 * 프레임 압축 (품질 조정)
 */
export async function compressFrame(
  frame: CroppedFrame,
  quality: number = 80
): Promise<CroppedFrame> {
  const compressedBuffer = await sharp(frame.buffer).jpeg({ quality }).toBuffer()

  return {
    ...frame,
    buffer: compressedBuffer,
  }
}

/**
 * 여러 프레임 압축
 */
export async function compressFrames(
  frames: CroppedFrame[],
  quality: number = 80
): Promise<CroppedFrame[]> {
  return Promise.all(frames.map((frame) => compressFrame(frame, quality)))
}
