/**
 * Vertex AI Gemini 영상 분석기
 *
 * GCS 저장 영상을 Gemini로 직접 분석 (File API 대신 gs:// URI 사용)
 *
 * 주요 기능:
 * - GCS gs:// URI를 Gemini에 직접 전달 (별도 업로드 불필요)
 * - 플랫폼별 프롬프트 (EPT, Triton, WSOP)
 * - 구간 지정 분석 (startTime, endTime)
 * - 구조화된 JSON 응답
 * - 재시도 로직
 *
 * Gemini File API vs Vertex AI:
 * - File API: Buffer 업로드 → 파일 처리 대기 → URI 생성
 * - Vertex AI: GCS gs:// URI 직접 전달 (더 빠름, 대용량 최적화)
 */

import { VertexAI } from '@google-cloud/vertexai';
import { EPT_PROMPT, TRITON_POKER_PROMPT } from '../ai/prompts';

/**
 * ExtractedHand: gemini-analyzer.ts와 동일한 타입 사용
 */
export interface ExtractedHand {
  handNumber: string | number;
  stakes?: string;
  pot: number;
  board: {
    flop: string[] | null;
    turn: string | null;
    river: string | null;
  };
  players: Array<{
    name: string;
    position: string;
    seat: number;
    stackSize: number;
    holeCards: string[] | null;
  }>;
  actions: Array<{
    player: string;
    street: string;
    action: string;
    amount: number;
  }>;
  winners: Array<{
    name: string;
    amount: number;
    hand?: string;
  }>;
}

export interface AnalysisResult {
  hands: ExtractedHand[];
}

export type Platform = 'ept' | 'triton' | 'wsop';

/**
 * Vertex AI 분석기 클래스
 *
 * Gemini 2.5 Flash 모델 사용 (GA 버전)
 * - 최대 입력 토큰: 1,048,576
 * - 최대 출력 토큰: 65,535
 * - 비디오: 최대 10개, 약 45분~1시간
 * - 구조화된 JSON 출력 지원
 *
 * @see https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash
 */
export class VertexAnalyzer {
  private vertexAI: VertexAI;
  private modelName = 'gemini-2.5-flash'; // GA 버전 (gemini-2.0-flash-exp → gemini-2.5-flash)
  private location: string;

  constructor() {
    const projectId = process.env.GCS_PROJECT_ID;
    const location = process.env.VERTEX_AI_LOCATION || 'asia-northeast3'; // 서울 리전

    if (!projectId) {
      throw new Error('GCS_PROJECT_ID 환경 변수가 필요합니다');
    }

    this.location = location;

    // Vertex AI 클라이언트 초기화
    this.vertexAI = new VertexAI({
      project: projectId,
      location: this.location,
    });

    console.log(
      `[VertexAnalyzer] 초기화 완료: ${projectId} / ${location} / ${this.modelName}`
    );
  }

  /**
   * 플랫폼에 맞는 프롬프트 선택
   */
  private getPrompt(platform: Platform): string {
    switch (platform) {
      case 'ept':
        return EPT_PROMPT;
      case 'triton':
      case 'wsop':
        return TRITON_POKER_PROMPT;
      default:
        return EPT_PROMPT;
    }
  }

  /**
   * 구간 지정 프롬프트 생성
   */
  private buildPromptWithTimeRange(
    basePrompt: string,
    startTime?: number,
    endTime?: number
  ): string {
    if (startTime === undefined && endTime === undefined) {
      return basePrompt;
    }

    const timeRangeInstruction = `

## 분석 구간 (Time Range)

**이 영상의 특정 구간만 분석하세요:**
- 시작 시간: ${startTime !== undefined ? `${startTime}초 (${this.formatTime(startTime)})` : '처음부터'}
- 종료 시간: ${endTime !== undefined ? `${endTime}초 (${this.formatTime(endTime)})` : '끝까지'}

**중요**: 이 구간 밖의 핸드는 무시하고, 구간 내에서 진행된 핸드만 추출하세요.
`;

    return basePrompt + timeRangeInstruction;
  }

  /**
   * 초를 MM:SS 형식으로 변환
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * GCS gs:// URI로 영상 분석
   *
   * @param gcsUri - GCS URI (예: "gs://bucket-name/videos/video-123.mp4")
   * @param platform - 플랫폼 (ept, triton, wsop)
   * @param startTime - 분석 시작 시간 (초, 선택)
   * @param endTime - 분석 종료 시간 (초, 선택)
   * @param maxRetries - 최대 재시도 횟수 (기본 3회)
   * @returns ExtractedHand 배열
   *
   * @example
   * ```ts
   * // GCS 업로드 후 분석
   * const gcsUri = await gcsClient.uploadBuffer(
   *   'videos/my-video.mp4',
   *   videoBuffer,
   *   'video/mp4'
   * );
   *
   * // 전체 영상 분석
   * const hands = await vertexAnalyzer.analyzeVideoFromGCS(gcsUri, 'ept');
   *
   * // 구간 분석 (0~300초)
   * const hands = await vertexAnalyzer.analyzeVideoFromGCS(
   *   gcsUri,
   *   'ept',
   *   0,
   *   300
   * );
   * ```
   */
  async analyzeVideoFromGCS(
    gcsUri: string,
    platform: Platform,
    startTime?: number,
    endTime?: number,
    maxRetries: number = 3
  ): Promise<ExtractedHand[]> {
    // gs:// URI 검증
    if (!gcsUri.startsWith('gs://')) {
      throw new Error(`잘못된 GCS URI 형식: ${gcsUri} (gs://로 시작해야 함)`);
    }

    const basePrompt = this.getPrompt(platform);
    const prompt = this.buildPromptWithTimeRange(basePrompt, startTime, endTime);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[VertexAnalyzer] 분석 시도 ${attempt}/${maxRetries} - ${gcsUri}`
        );

        if (startTime !== undefined && endTime !== undefined) {
          console.log(
            `[VertexAnalyzer] 구간: ${this.formatTime(startTime)} ~ ${this.formatTime(endTime)}`
          );
        }

        // Vertex AI Gemini 모델 가져오기
        // Gemini 2.5 Flash 최적 설정:
        // - maxOutputTokens: 65535 (최대값, 복잡한 핸드 히스토리 대응)
        // - temperature: 0.1 (낮은 값으로 정확성 우선)
        // - topP: 0.95 (다양성과 일관성 균형)
        // - topK: 40 (토큰 선택 범위 제한)
        const generativeModel = this.vertexAI.getGenerativeModel({
          model: this.modelName,
          generationConfig: {
            temperature: 0.1,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 65535,
            responseMimeType: 'application/json',
          },
        });

        // GCS URI로 분석 실행
        const request = {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  fileData: {
                    fileUri: gcsUri,
                    mimeType: 'video/mp4',
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
        };

        console.log('[VertexAnalyzer] Gemini 분석 요청 전송...');

        const result = await generativeModel.generateContent(request);
        const response = result.response;

        if (!response || !response.candidates || response.candidates.length === 0) {
          throw new Error('Gemini 응답이 비어있습니다');
        }

        const text = response.candidates[0].content.parts[0].text || '';

        console.log('[VertexAnalyzer] 응답 수신 완료');

        // JSON 파싱 (Self-Healing)
        const hands = this.parseAndValidateResponse(text);

        console.log(
          `[VertexAnalyzer] 분석 완료. 추출된 핸드: ${hands.length}개`
        );

        return hands;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`[VertexAnalyzer] 시도 ${attempt} 실패:`, lastError.message);

        // 마지막 시도가 아니면 재시도
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`[VertexAnalyzer] ${delayMs / 1000}초 후 재시도...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    // 모든 시도 실패
    throw new Error(
      `${maxRetries}회 시도 후 분석 실패: ${lastError?.message}`
    );
  }

  /**
   * Self-Healing JSON 파싱 및 검증
   * Gemini 응답이 올바르지 않으면 복구 시도
   */
  private parseAndValidateResponse(text: string): ExtractedHand[] {
    // 1. JSON 마크다운 블록 제거 (```json ... ```)
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3);
    }
    cleanText = cleanText.trim();

    // 2. JSON 파싱 시도
    let parsed: AnalysisResult;
    try {
      parsed = JSON.parse(cleanText);
    } catch (jsonError) {
      console.error('[VertexAnalyzer] JSON 파싱 오류, 복구 시도 중...');

      // JSON 복구 시도: 첫 번째 { 부터 마지막 } 까지 추출
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const extractedJson = cleanText.substring(firstBrace, lastBrace + 1);
        try {
          parsed = JSON.parse(extractedJson);
          console.log('[VertexAnalyzer] JSON 복구 성공');
        } catch {
          throw new Error(`잘못된 JSON 응답: ${jsonError}`);
        }
      } else {
        throw new Error(`잘못된 JSON 응답: ${jsonError}`);
      }
    }

    // 3. 구조 검증
    if (!parsed.hands || !Array.isArray(parsed.hands)) {
      // hands가 없으면 빈 배열 반환 (에러 대신)
      console.warn('[VertexAnalyzer] hands 배열 누락, 빈 배열 반환');
      return [];
    }

    // 4. 핸드 데이터 정제 및 검증
    const validHands = parsed.hands.filter((hand, index) => {
      // 필수 필드 체크
      if (!hand.players || !Array.isArray(hand.players)) {
        console.warn(
          `[VertexAnalyzer] 핸드 ${index + 1}: players 누락, 스킵`
        );
        return false;
      }
      if (!hand.board) {
        console.warn(`[VertexAnalyzer] 핸드 ${index + 1}: board 누락, 스킵`);
        return false;
      }
      return true;
    });

    if (validHands.length < parsed.hands.length) {
      console.warn(
        `[VertexAnalyzer] ${parsed.hands.length - validHands.length}개 핸드 필터링됨`
      );
    }

    return validHands;
  }
}

// 싱글톤 인스턴스
let _vertexAnalyzer: VertexAnalyzer | null = null;

export const vertexAnalyzer = {
  get instance(): VertexAnalyzer {
    if (!_vertexAnalyzer) {
      _vertexAnalyzer = new VertexAnalyzer();
    }
    return _vertexAnalyzer;
  },

  analyzeVideoFromGCS: (
    ...args: Parameters<VertexAnalyzer['analyzeVideoFromGCS']>
  ) => {
    return vertexAnalyzer.instance.analyzeVideoFromGCS(...args);
  },
};
