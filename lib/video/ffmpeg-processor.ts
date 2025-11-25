/**
 * FFmpeg Video Processor
 *
 * Python FFmpeg → fluent-ffmpeg (TypeScript) 전환
 *
 * 주요 기능:
 * - 특정 시간 구간 추출 (stream copy, 재인코딩 없음)
 * - 메모리 내 처리 (디스크 I/O 없음)
 * - MP4 스트리밍 최적화
 *
 * 배포 환경:
 * - Trigger.dev: FFmpeg extension이 FFMPEG_PATH 환경 변수 설정
 * - 로컬: @ffmpeg-installer/ffmpeg 패키지 사용
 */

import ffmpeg from 'fluent-ffmpeg';
import { spawn } from 'child_process';
import { Readable, PassThrough } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

// FFmpeg 바이너리 경로 설정 (지연 초기화)
let ffmpegInitialized = false;

function initializeFfmpeg(): void {
  if (ffmpegInitialized) return;

  // 1. 환경 변수에서 FFmpeg 경로 확인 (Trigger.dev extension)
  if (process.env.FFMPEG_PATH) {
    console.log(`[FFmpegProcessor] Using FFMPEG_PATH: ${process.env.FFMPEG_PATH}`);
    ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
    ffmpegInitialized = true;
    return;
  }

  // 2. 로컬 개발 환경: @ffmpeg-installer/ffmpeg 사용
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    console.log(`[FFmpegProcessor] Using @ffmpeg-installer/ffmpeg: ${ffmpegInstaller.path}`);
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
    ffmpegInitialized = true;
  } catch {
    console.warn('[FFmpegProcessor] @ffmpeg-installer/ffmpeg not found, using system ffmpeg');
    // 시스템 ffmpeg 사용 (PATH에 있다고 가정)
    ffmpegInitialized = true;
  }
}

export interface FFmpegExtractOptions {
  startTime: number;      // 시작 시간 (초)
  duration: number;       // 지속 시간 (초)
  videoCodec?: string;    // 기본: 'copy' (재인코딩 없음)
  audioCodec?: string;    // 기본: 'copy'
  format?: string;        // 기본: 'mp4'
}

export class FFmpegProcessor {
  /**
   * 스트림 URL에서 특정 구간 추출 (메모리 내 처리)
   *
   * @param inputUrl 입력 스트림 URL (YouTube 등)
   * @param options 추출 옵션
   * @returns Promise<Buffer>
   */
  async extractSegment(
    inputUrl: string,
    options: FFmpegExtractOptions
  ): Promise<Buffer> {
    // FFmpeg 초기화 (지연 로딩)
    initializeFfmpeg();

    const {
      startTime,
      duration,
      videoCodec = 'copy',
      audioCodec = 'copy',
      format = 'mp4'
    } = options;

    console.log(`[FFmpegProcessor] Extracting segment: ${startTime}s - ${startTime + duration}s`);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const outputStream = new PassThrough();

      // FFmpeg 명령 생성
      // 중요: -ss를 입력 전에 설정하여 입력 seeking 활성화 (메모리 효율적)
      const command = ffmpeg(inputUrl)
        .inputOptions([
          '-ss', String(startTime),           // 입력 seeking (입력 전 = 빠름)
          '-analyzeduration', '20000000',     // 분석 시간 제한 (20초)
          '-probesize', '20000000',           // 프로브 크기 제한 (20MB)
          '-reconnect', '1',                  // HTTP 재연결 활성화
          '-reconnect_streamed', '1',         // 스트리밍 중 재연결
          '-reconnect_delay_max', '5'         // 최대 재연결 지연 5초
        ])
        .setDuration(duration)
        .videoCodec(videoCodec)
        .audioCodec(audioCodec)
        .format(format);

      // MP4 스트리밍 최적화 (faststart, fragmented)
      if (format === 'mp4') {
        command
          .outputOptions([
            '-movflags', 'frag_keyframe+empty_moov',  // 스트리밍 최적화
            '-frag_duration', '1000000',               // 1초 프래그먼트
            '-max_muxing_queue_size', '1024'           // 멀티플렉싱 큐 제한
          ]);
      }

      // 출력을 PassThrough 스트림으로
      command
        .on('start', (commandLine) => {
          console.log(`[FFmpegProcessor] Command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[FFmpegProcessor] Progress: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('error', (error) => {
          console.error('[FFmpegProcessor] Error:', error);
          reject(new Error(`FFmpeg processing failed: ${error.message}`));
        })
        .on('end', () => {
          const buffer = Buffer.concat(chunks);
          const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
          console.log(`[FFmpegProcessor] Extraction complete: ${sizeMB}MB`);
          resolve(buffer);
        });

      // 데이터 수집
      outputStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      // 스트림 파이프 연결
      command.pipe(outputStream, { end: true });
    });
  }

  /**
   * 스트림 URL에서 특정 구간 추출 (파일 기반 처리 - Native FFmpeg)
   *
   * fluent-ffmpeg 대신 child_process.spawn을 직접 사용하여
   * SIGSEGV 문제를 회피합니다.
   *
   * @param inputUrl 입력 스트림 URL (GCS Signed URL 등)
   * @param options 추출 옵션 (outputPath 포함)
   * @returns Promise<{ filePath: string; size: number }>
   */
  async extractSegmentToFile(
    inputUrl: string,
    options: FFmpegExtractOptions & { outputPath: string }
  ): Promise<{ filePath: string; size: number }> {
    const {
      startTime,
      duration,
      videoCodec = 'copy',
      audioCodec = 'copy',
      outputPath
    } = options;

    // 출력 디렉토리 생성
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // FFmpeg 바이너리 경로 결정
    let ffmpegPath = 'ffmpeg';
    if (process.env.FFMPEG_PATH) {
      ffmpegPath = process.env.FFMPEG_PATH;
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
        ffmpegPath = ffmpegInstaller.path;
      } catch {
        // 시스템 ffmpeg 사용
      }
    }

    console.log(`[FFmpegProcessor] Using FFmpeg: ${ffmpegPath}`);
    console.log(`[FFmpegProcessor] Extracting segment to file: ${startTime}s - ${startTime + duration}s`);
    console.log(`[FFmpegProcessor] Output path: ${outputPath}`);

    // 입력 URL 로그 (보안을 위해 서명 파라미터 제외)
    const urlForLog = inputUrl.split('?')[0];
    console.log(`[FFmpegProcessor] Input URL (base): ${urlForLog}`);
    console.log(`[FFmpegProcessor] Input URL has query params: ${inputUrl.includes('?')}`);

    // FFmpeg 인자 구성 (디버그 로깅 + HTTP 재연결 옵션 포함)
    const args = [
      '-y',                                    // 출력 파일 덮어쓰기
      '-loglevel', 'verbose',                  // 상세 로그 출력
      '-reconnect', '1',                       // HTTP 재연결 활성화
      '-reconnect_streamed', '1',              // 스트리밍 중 재연결
      '-reconnect_delay_max', '5',             // 최대 재연결 지연 5초
      '-ss', String(startTime),                // 입력 seeking (입력 전)
      '-i', inputUrl,                          // 입력 URL
      '-t', String(duration),                  // 출력 지속 시간
      '-c:v', videoCodec,                      // 비디오 코덱
      '-c:a', audioCodec,                      // 오디오 코덱
      '-movflags', 'frag_keyframe+empty_moov', // MP4 스트리밍 최적화
      '-f', 'mp4',                             // 출력 포맷
      outputPath                               // 출력 파일
    ];

    console.log(`[FFmpegProcessor] Command: ${ffmpegPath} ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
      const ffmpegProcess = spawn(ffmpegPath, args, {
        stdio: ['ignore', 'pipe', 'pipe']  // stdin 무시, stdout/stderr 캡처
      });

      let stderr = '';

      ffmpegProcess.stderr?.on('data', (data: Buffer) => {
        const line = data.toString();
        stderr += line;
        // 진행률 로그 (frame= 포함 라인만)
        if (line.includes('frame=') || line.includes('time=')) {
          const timeMatch = line.match(/time=(\d{2}:\d{2}:\d{2})/);
          if (timeMatch) {
            console.log(`[FFmpegProcessor] Progress: ${timeMatch[1]}`);
          }
        }
      });

      ffmpegProcess.on('error', (error) => {
        console.error('[FFmpegProcessor] Spawn error:', error);
        reject(new Error(`FFmpeg spawn failed: ${error.message}`));
      });

      ffmpegProcess.on('close', (code, signal) => {
        if (signal) {
          console.error(`[FFmpegProcessor] FFmpeg killed by signal: ${signal}`);
          console.error(`[FFmpegProcessor] Stderr (last 5000 chars): ${stderr.slice(-5000)}`);
          // 실패 시 임시 파일 정리
          if (fs.existsSync(outputPath)) {
            try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
          }
          reject(new Error(`FFmpeg was killed with signal ${signal}`));
          return;
        }

        if (code !== 0) {
          console.error(`[FFmpegProcessor] FFmpeg exited with code: ${code}`);
          console.error(`[FFmpegProcessor] Stderr: ${stderr.slice(-2000)}`);
          // 실패 시 임시 파일 정리
          if (fs.existsSync(outputPath)) {
            try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
          }
          reject(new Error(`FFmpeg exited with code ${code}`));
          return;
        }

        // 성공
        if (!fs.existsSync(outputPath)) {
          reject(new Error('FFmpeg completed but output file not found'));
          return;
        }

        const stats = fs.statSync(outputPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`[FFmpegProcessor] Extraction complete: ${sizeMB}MB -> ${outputPath}`);
        resolve({ filePath: outputPath, size: stats.size });
      });
    });
  }

  /**
   * Readable Stream을 입력으로 받아 처리
   *
   * @param inputStream 입력 스트림
   * @param options 추출 옵션
   * @returns Promise<Buffer>
   */
  async processStream(
    inputStream: Readable,
    options: Omit<FFmpegExtractOptions, 'startTime'> & { startTime?: number }
  ): Promise<Buffer> {
    // FFmpeg 초기화 (지연 로딩)
    initializeFfmpeg();

    const {
      startTime,
      duration,
      videoCodec = 'copy',
      audioCodec = 'copy',
      format = 'mp4'
    } = options;

    console.log(`[FFmpegProcessor] Processing stream (duration: ${duration}s)`);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const outputStream = new PassThrough();

      // FFmpeg 명령 생성
      const command = ffmpeg(inputStream)
        .inputFormat('mp4')  // 입력 포맷 명시
        .videoCodec(videoCodec)
        .audioCodec(audioCodec)
        .format(format);

      // 시작 시간이 지정된 경우
      if (startTime !== undefined) {
        command.setStartTime(startTime);
      }

      // 지속 시간 설정
      command.setDuration(duration);

      // MP4 스트리밍 최적화
      if (format === 'mp4') {
        command.outputOptions([
          '-movflags', 'frag_keyframe+empty_moov',
          '-frag_duration', '1000000'
        ]);
      }

      // 이벤트 핸들러
      command
        .on('error', (error) => {
          console.error('[FFmpegProcessor] Stream processing error:', error);
          reject(new Error(`FFmpeg processing failed: ${error.message}`));
        })
        .on('end', () => {
          const buffer = Buffer.concat(chunks);
          const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
          console.log(`[FFmpegProcessor] Stream processing complete: ${sizeMB}MB`);
          resolve(buffer);
        });

      // 데이터 수집
      outputStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      // 스트림 파이프
      command.pipe(outputStream, { end: true });
    });
  }

  /**
   * FFmpeg 버전 확인
   */
  async getVersion(): Promise<string> {
    // FFmpeg 초기화 (지연 로딩)
    initializeFfmpeg();

    return new Promise((resolve, reject) => {
      ffmpeg.getAvailableFormats((err, formats) => {
        if (err) {
          reject(err);
        } else {
          ffmpeg.ffprobe('-version', (err, data: any) => {
            if (err) {
              reject(err);
            } else {
              resolve(data.toString().split('\n')[0]);
            }
          });
        }
      });
    });
  }
}

// 싱글톤 인스턴스
export const ffmpegProcessor = new FFmpegProcessor();
