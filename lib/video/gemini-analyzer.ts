/**
 * Gemini Video Analyzer
 *
 * Python google-generativeai → @google/genai (TypeScript) 전환
 *
 * 주요 기능:
 * - Gemini 2.5 Flash 영상 분석
 * - 플랫폼별 프롬프트 (EPT, Triton, WSOP)
 * - 구조화된 JSON 응답
 * - 재시도 로직
 */

import { GoogleGenAI } from '@google/genai';
import { EPT_PROMPT, TRITON_POKER_PROMPT } from '../ai/prompts';

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

export class GeminiAnalyzer {
  private genAI: GoogleGenAI;
  private modelName = 'gemini-2.5-flash';

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenAI({ apiKey });
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
   * 영상 파일을 Gemini File API에 업로드
   */
  private async uploadVideo(videoBuffer: Buffer): Promise<string> {
    try {
      console.log(`[GeminiAnalyzer] Uploading video to Gemini File API (${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB)`);

      // @google/genai SDK의 File API 업로드
      const uploadResult = await this.genAI.files.upload({
        file: new Blob([videoBuffer], { type: 'video/mp4' }),
        config: { mimeType: 'video/mp4' },
      });

      console.log(`[GeminiAnalyzer] Upload complete. File name: ${uploadResult.name}`);

      // 파일 처리 대기
      let processingFile = await this.genAI.files.get({ name: uploadResult.name });
      while (processingFile.state === 'PROCESSING') {
        console.log('[GeminiAnalyzer] Waiting for file processing...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
        processingFile = await this.genAI.files.get({ name: uploadResult.name });
      }

      if (processingFile.state === 'FAILED') {
        throw new Error('File processing failed');
      }

      console.log('[GeminiAnalyzer] File processing complete');
      return uploadResult.uri || '';

    } catch (error) {
      console.error('[GeminiAnalyzer] Error uploading video:', error);
      throw new Error(`Video upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gemini로 영상 분석 (재시도 로직 포함)
   */
  async analyzeVideo(
    videoBuffer: Buffer,
    platform: Platform,
    maxRetries: number = 3
  ): Promise<ExtractedHand[]> {
    const prompt = this.getPrompt(platform);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[GeminiAnalyzer] Analysis attempt ${attempt}/${maxRetries}`);

        // 1. 영상 업로드
        const fileUri = await this.uploadVideo(videoBuffer);

        // 2. Gemini 분석 실행
        console.log('[GeminiAnalyzer] Sending analysis request to Gemini 2.5 Flash...');

        const result = await this.genAI.models.generateContent({
          model: this.modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  fileData: {
                    fileUri: fileUri,
                    mimeType: 'video/mp4'
                  }
                },
                {
                  text: prompt
                }
              ]
            }
          ],
          config: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          }
        });

        const text = result.text || '';

        console.log('[GeminiAnalyzer] Response received');

        // 3. JSON 파싱
        const parsed: AnalysisResult = JSON.parse(text);

        if (!parsed.hands || !Array.isArray(parsed.hands)) {
          throw new Error('Invalid response structure: missing hands array');
        }

        console.log(`[GeminiAnalyzer] Analysis complete. Hands extracted: ${parsed.hands.length}`);
        return parsed.hands;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`[GeminiAnalyzer] Attempt ${attempt} failed:`, lastError.message);

        // 마지막 시도가 아니면 재시도
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`[GeminiAnalyzer] Retrying in ${delayMs / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // 모든 시도 실패
    throw new Error(`Analysis failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * YouTube URL 직접 분석 (Gemini 2.5 Flash는 YouTube URL 지원)
   */
  async analyzeYouTubeUrl(
    youtubeUrl: string,
    platform: Platform,
    startTime?: number,
    endTime?: number
  ): Promise<ExtractedHand[]> {
    const prompt = this.getPrompt(platform);

    try {
      console.log(`[GeminiAnalyzer] Analyzing YouTube URL: ${youtubeUrl}`);

      if (startTime !== undefined && endTime !== undefined) {
        console.log(`[GeminiAnalyzer] Time range: ${startTime}s - ${endTime}s`);
      }

      const result = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: [
          {
            role: 'user',
            parts: [
              { text: youtubeUrl },
              { text: prompt }
            ]
          }
        ],
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        }
      });

      const text = result.text || '';
      const parsed: AnalysisResult = JSON.parse(text);

      console.log(`[GeminiAnalyzer] Analysis complete. Hands extracted: ${parsed.hands.length}`);
      return parsed.hands;

    } catch (error) {
      console.error('[GeminiAnalyzer] Error analyzing YouTube URL:', error);
      throw new Error(`YouTube URL analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// 싱글톤 인스턴스
export const geminiAnalyzer = new GeminiAnalyzer();
