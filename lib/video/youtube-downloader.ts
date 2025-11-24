/**
 * YouTube Video Downloader
 *
 * pytubefix (Python) → @distube/ytdl-core (TypeScript) 전환
 *
 * 주요 기능:
 * - YouTube URL에서 스트림 URL 추출
 * - Bot detection 우회
 * - 스트림 다운로드 (Buffer 또는 Stream)
 */

import ytdl from '@distube/ytdl-core';
import type { RequestOptions } from 'https';
import { Readable } from 'stream';

export interface YouTubeDownloadOptions {
  quality?: 'highest' | 'lowest' | '720p' | '480p' | '360p';
  filter?: 'videoandaudio' | 'video' | 'audioonly';
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15';

function buildRequestOptions(): RequestOptions['headers'] | undefined {
  const cookie = process.env.YTDL_COOKIE?.trim();
  const headers: Record<string, string> = {
    'user-agent': process.env.YTDL_USER_AGENT?.trim() || DEFAULT_USER_AGENT,
    'accept-language': process.env.YTDL_ACCEPT_LANGUAGE?.trim() || 'en-US,en;q=0.9',
  };

  if (cookie) {
    headers.cookie = cookie;
  }

  return headers;
}

export class YouTubeDownloader {
  private readonly requestHeaders = buildRequestOptions();

  private ytdlOptions<T extends Record<string, unknown>>(options?: T) {
    return {
      ...options,
      requestOptions: this.requestHeaders ? { headers: this.requestHeaders } : undefined,
    };
  }

  private enhanceError(error: unknown) {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes("sign in to confirm you're not a bot")) {
        error.message =
          "YouTube blocked the request with a bot check. Set YTDL_COOKIE/YTDL_USER_AGENT in the environment so Trigger.dev can reuse an authenticated cookie jar.";
      }
    }
    return error;
  }

  /**
   * YouTube 영상 정보 가져오기
   */
  async getVideoInfo(url: string) {
    try {
      const info = await ytdl.getInfo(url, this.ytdlOptions());

      return {
        title: info.videoDetails.title,
        duration: parseInt(info.videoDetails.lengthSeconds),
        author: info.videoDetails.author.name,
        videoId: info.videoDetails.videoId,
        formats: info.formats.length
      };
    } catch (error) {
      console.error('[YouTubeDownloader] Error getting video info:', error);
      throw this.enhanceError(new Error(`Failed to get video info: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * 재사용 가능한 요청 옵션
   */
  private getRequestOptions() {
    return this.ytdlOptions();
  }

  private getStreamOptions(options: YouTubeDownloadOptions = {}) {
    return {
      ...options,
      requestOptions: this.requestHeaders ? { headers: this.requestHeaders } : undefined,
    };
  }

  private onYouTubeError(error: unknown) {
    const enhanced = this.enhanceError(
      new Error(`Failed to get stream URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    );
    console.error('[YouTubeDownloader] Error getting stream URL:', enhanced);
    return enhanced;
  }

  /**
   * YouTube 영상 다운로드 (Stream 반환)
   *
   * @param url YouTube URL
   * @param options 다운로드 옵션
   * @returns Readable Stream
   */
  downloadAsStream(url: string, options: YouTubeDownloadOptions = {}): Readable {
    const {
      quality = 'highest',
      filter = 'videoandaudio'
    } = options;

    try {
      const stream = ytdl(url, this.getStreamOptions({ quality, filter }));

      stream.on('error', (error) => {
        console.error('[YouTubeDownloader] Stream error:', error);
      });

      return stream;
    } catch (error) {
      console.error('[YouTubeDownloader] Error creating download stream:', error);
      throw this.enhanceError(new Error(`Failed to download video: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * YouTube 영상 다운로드 (Buffer 반환)
   *
   * @param url YouTube URL
   * @param options 다운로드 옵션
   * @returns Buffer
   */
  async downloadAsBuffer(url: string, options: YouTubeDownloadOptions = {}): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = this.downloadAsStream(url, options);

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`[YouTubeDownloader] Download complete: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
        resolve(buffer);
      });

      stream.on('error', (error) => {
        console.error('[YouTubeDownloader] Download error:', error);
        reject(this.enhanceError(error));
      });
    });
  }

  /**
   * 스트림 URL 직접 가져오기 (FFmpeg에서 사용)
   *
   * @param url YouTube URL
   * @param quality 품질 (기본: 720p)
   * @returns 스트림 URL
   */
  async getStreamUrl(url: string, quality: string = '720p'): Promise<string> {
    try {
      const info = await ytdl.getInfo(url, this.getRequestOptions());

      // progressive 형식 찾기 (video+audio 통합)
      const format = info.formats.find(f =>
        f.hasVideo &&
        f.hasAudio &&
        f.qualityLabel === quality
      );

      if (!format || !format.url) {
        // 720p가 없으면 가장 높은 progressive 형식 선택
        const fallbackFormat = info.formats.find(f =>
          f.hasVideo &&
          f.hasAudio
        );

        if (!fallbackFormat || !fallbackFormat.url) {
          throw new Error('No suitable format found');
        }

        console.warn(`[YouTubeDownloader] ${quality} not available, using ${fallbackFormat.qualityLabel}`);
        return fallbackFormat.url;
      }

      console.log(`[YouTubeDownloader] Stream URL obtained: ${quality}`);
      return format.url;
    } catch (error) {
      throw this.onYouTubeError(error);
    }
  }

  /**
   * YouTube 영상 검증
   *
   * @param url YouTube URL
   * @returns 유효 여부
   */
  async validateUrl(url: string): Promise<boolean> {
    try {
      return ytdl.validateURL(url);
    } catch (error) {
      console.error('[YouTubeDownloader] URL validation error:', error);
      return false;
    }
  }
}

// 싱글톤 인스턴스
export const youtubeDownloader = new YouTubeDownloader();
      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        console.log(`[YouTubeDownloader] Download complete: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
        resolve(buffer);
      });

      stream.on('error', (error) => {
        console.error('[YouTubeDownloader] Download error:', error);
        reject(error);
      });
    });
  }

  /**
   * 스트림 URL 직접 가져오기 (FFmpeg에서 사용)
   *
   * @param url YouTube URL
   * @param quality 품질 (기본: 720p)
   * @returns 스트림 URL
   */
  async getStreamUrl(url: string, quality: string = '720p'): Promise<string> {
    try {
      const info = await ytdl.getInfo(url);

      // progressive 형식 찾기 (video+audio 통합)
      const format = info.formats.find(f =>
        f.hasVideo &&
        f.hasAudio &&
        f.qualityLabel === quality
      );

      if (!format || !format.url) {
        // 720p가 없으면 가장 높은 progressive 형식 선택
        const fallbackFormat = info.formats.find(f =>
          f.hasVideo &&
          f.hasAudio
        );

        if (!fallbackFormat || !fallbackFormat.url) {
          throw new Error('No suitable format found');
        }

        console.warn(`[YouTubeDownloader] ${quality} not available, using ${fallbackFormat.qualityLabel}`);
        return fallbackFormat.url;
      }

      console.log(`[YouTubeDownloader] Stream URL obtained: ${quality}`);
      return format.url;
    } catch (error) {
      console.error('[YouTubeDownloader] Error getting stream URL:', error);
      throw new Error(`Failed to get stream URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * YouTube 영상 검증
   *
   * @param url YouTube URL
   * @returns 유효 여부
   */
  async validateUrl(url: string): Promise<boolean> {
    try {
      return ytdl.validateURL(url);
    } catch (error) {
      console.error('[YouTubeDownloader] URL validation error:', error);
      return false;
    }
  }
}

// 싱글톤 인스턴스
export const youtubeDownloader = new YouTubeDownloader();
