/**
 * OCR Text Extraction Utility
 *
 * Tesseract.js를 사용하여 크롭된 프레임에서 텍스트 추출
 */

import { createWorker } from 'tesseract.js'
import type { CroppedFrame } from '@/lib/frame-cropper'
import type { OcrData, OcrPlayerData, OcrBoardData } from '@/lib/types/ocr'

/**
 * Tesseract Worker 생성 및 초기화
 */
export async function createOcrWorker() {
  const worker = await createWorker('eng', 1, {
    // 로깅 비활성화 (프로덕션)
    logger: process.env.NODE_ENV === 'development' ? (m) => console.log(m) : undefined,
  })

  // PSM (Page Segmentation Mode) 설정
  // 6 = Assume a single uniform block of text
  await worker.setParameters({
    tessedit_pageseg_mode: 6 as any,
  })

  return worker
}

/**
 * 단일 프레임에서 텍스트 추출
 */
export async function extractTextFromFrame(
  frame: CroppedFrame,
  worker: Awaited<ReturnType<typeof createWorker>>
): Promise<string> {
  try {
    const {
      data: { text },
    } = await worker.recognize(frame.buffer)

    return text.trim()
  } catch (error) {
    console.error(`Failed to extract text from frame ${frame.frameNumber}:`, error)
    return ''
  }
}

/**
 * 여러 프레임에서 텍스트 추출
 */
export async function extractTextFromFrames(
  frames: CroppedFrame[]
): Promise<Map<number, string>> {
  const worker = await createOcrWorker()
  const results = new Map<number, string>()

  try {
    for (const frame of frames) {
      const text = await extractTextFromFrame(frame, worker)
      results.set(frame.frameNumber, text)
    }
  } finally {
    await worker.terminate()
  }

  return results
}

/**
 * 플레이어 카드 파싱 (예: "As Ah" 또는 "A♠ A♥")
 */
export function parsePlayerCards(text: string): string[] {
  const cards: string[] = []

  // 카드 패턴 매칭
  // 예: "As", "Ah", "Kc", "Qd", "Jh", "Ts", "9c", "8d", "7h", "6s", "5c", "4d", "3h", "2s"
  // 또는 "A♠", "A♥", "K♣", "Q♦" 등
  const cardPattern = /([AKQJT2-9])([shcdSHCD♠♥♣♦])/g
  const matches = text.matchAll(cardPattern)

  for (const match of matches) {
    const rank = match[1]
    let suit = match[2].toLowerCase()

    // 유니코드 수트를 문자로 변환
    if (suit === '♠') suit = 's'
    else if (suit === '♥') suit = 'h'
    else if (suit === '♣') suit = 'c'
    else if (suit === '♦') suit = 'd'

    cards.push(`${rank}${suit}`)

    // 2장만 추출
    if (cards.length >= 2) break
  }

  return cards
}

/**
 * 스택 크기 파싱 (예: "1500", "$1,500", "1.5K")
 */
export function parseStackSize(text: string): number | null {
  // 숫자 패턴 매칭
  // 예: "1500", "1,500", "$1500", "1.5K", "1.5M"
  const patterns = [
    /\$?(\d{1,3}(?:,\d{3})+)/, // 1,500 or $1,500
    /\$?(\d+\.?\d*)([KkMm])?/, // 1500 or 1.5K or 1.5M
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      let value = parseFloat(match[1].replace(/,/g, ''))
      const multiplier = match[2]?.toUpperCase()

      if (multiplier === 'K') {
        value *= 1000
      } else if (multiplier === 'M') {
        value *= 1000000
      }

      return Math.round(value)
    }
  }

  return null
}

/**
 * 팟 크기 파싱 (예: "POT: 2400", "Pot $2,400")
 */
export function parsePotSize(text: string): number | null {
  // "POT" 키워드 찾기
  const potPattern = /pot[:\s]*\$?(\d{1,3}(?:,\d{3})+|\d+\.?\d*)([KkMm])?/i
  const match = text.match(potPattern)

  if (match) {
    let value = parseFloat(match[1].replace(/,/g, ''))
    const multiplier = match[2]?.toUpperCase()

    if (multiplier === 'K') {
      value *= 1000
    } else if (multiplier === 'M') {
      value *= 1000000
    }

    return Math.round(value)
  }

  return null
}

/**
 * 플레이어 영역 OCR 데이터 추출
 */
export function parsePlayerOcr(text: string): OcrPlayerData {
  const cards = parsePlayerCards(text)
  const stack = parseStackSize(text)

  return {
    raw: text,
    cards,
    stack,
  }
}

/**
 * 보드 영역 OCR 데이터 추출
 */
export function parseBoardOcr(text: string): OcrBoardData {
  const cards = parsePlayerCards(text) // 같은 카드 파싱 로직 사용
  const pot = parsePotSize(text)

  return {
    raw: text,
    cards,
    pot,
  }
}

/**
 * 단일 프레임의 완전한 OCR 데이터 생성
 */
export async function extractOcrDataFromFrames(
  playerFrames: CroppedFrame[],
  boardFrames: CroppedFrame[]
): Promise<OcrData[]> {
  // Worker 생성
  const worker = await createOcrWorker()
  const ocrDataList: OcrData[] = []

  try {
    // 각 프레임 쌍 처리
    for (let i = 0; i < playerFrames.length; i++) {
      const playerFrame = playerFrames[i]
      const boardFrame = boardFrames[i]

      // 텍스트 추출
      const playerText = await extractTextFromFrame(playerFrame, worker)
      const boardText = await extractTextFromFrame(boardFrame, worker)

      // 파싱
      const playerData = parsePlayerOcr(playerText)
      const boardData = parseBoardOcr(boardText)

      // OcrData 생성
      ocrDataList.push({
        frameNumber: playerFrame.frameNumber,
        timestamp: playerFrame.timestamp,
        timestampSeconds: playerFrame.timestampSeconds,
        player: playerData,
        board: boardData,
      })
    }
  } finally {
    await worker.terminate()
  }

  return ocrDataList
}

/**
 * OCR 데이터를 JSON 파일로 저장 (디버깅용)
 */
export function saveOcrDataAsJson(ocrData: OcrData[], outputPath: string): void {
  const fs = require('fs')
  fs.writeFileSync(outputPath, JSON.stringify(ocrData, null, 2))
}

/**
 * OCR 정확도 계산 (빈 결과 비율)
 */
export function calculateOcrAccuracy(ocrData: OcrData[]): number {
  if (ocrData.length === 0) return 0

  let successCount = 0

  for (const data of ocrData) {
    // 플레이어 카드 또는 보드 카드가 하나라도 추출되면 성공
    if (data.player.cards.length > 0 || data.board.cards.length > 0) {
      successCount++
    }
  }

  return successCount / ocrData.length
}
