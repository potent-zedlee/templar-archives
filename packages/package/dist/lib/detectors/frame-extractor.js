import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
export class FrameExtractor {
    config;
    constructor(config = {}) {
        this.config = {
            outputDir: config.outputDir ?? './frames',
            frameFormat: config.frameFormat ?? 'jpg',
            quality: config.quality ?? 2,
            resolution: config.resolution ?? '',
        };
    }
    async extractFramesByInterval(videoPath, intervalSeconds) {
        const startTime = Date.now();
        await this.validateVideoFile(videoPath);
        const metadata = await this.getVideoMetadata(videoPath);
        const timestamps = [];
        for (let time = 0; time < metadata.duration; time += intervalSeconds) {
            timestamps.push(time);
        }
        const frames = await this.extractFramesAtTimestamps(videoPath, timestamps);
        return {
            frames,
            outputDir: this.config.outputDir,
            totalFrames: frames.length,
            processingTime: Date.now() - startTime,
        };
    }
    async extractFramesAtTimestamps(videoPath, timestamps) {
        await this.validateVideoFile(videoPath);
        await fs.mkdir(this.config.outputDir, { recursive: true });
        const frames = [];
        for (let i = 0; i < timestamps.length; i++) {
            const timestamp = timestamps[i];
            const framePath = path.join(this.config.outputDir, `frame_${String(i).padStart(4, '0')}_${timestamp.toFixed(2)}s.${this.config.frameFormat}`);
            await this.extractSingleFrame(videoPath, timestamp, framePath);
            frames.push({
                framePath,
                timestamp,
                frameIndex: i,
            });
        }
        return frames;
    }
    async extractSingleFrame(videoPath, timestamp, outputPath) {
        return new Promise((resolve, reject) => {
            let command = ffmpeg(videoPath)
                .seekInput(timestamp)
                .frames(1)
                .output(outputPath);
            if (this.config.frameFormat === 'jpg') {
                command = command.outputOptions([`-q:v ${this.config.quality}`]);
            }
            if (this.config.resolution) {
                command = command.size(this.config.resolution);
            }
            command
                .on('end', () => resolve())
                .on('error', (err) => reject(new Error(`Frame extraction failed: ${err.message}`)))
                .run();
        });
    }
    async getVideoMetadata(videoPath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) {
                    reject(new Error(`Failed to get video metadata: ${err.message}`));
                    return;
                }
                const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
                if (!videoStream) {
                    reject(new Error('No video stream found'));
                    return;
                }
                const fpsMatch = videoStream.r_frame_rate?.match(/(\d+)\/(\d+)/);
                const fps = fpsMatch
                    ? parseInt(fpsMatch[1]) / parseInt(fpsMatch[2])
                    : 30;
                resolve({
                    duration: metadata.format.duration || 0,
                    width: videoStream.width || 0,
                    height: videoStream.height || 0,
                    fps,
                    codec: videoStream.codec_name || 'unknown',
                    bitrate: metadata.format.bit_rate || 0,
                });
            });
        });
    }
    async validateVideoFile(videoPath) {
        try {
            await fs.access(videoPath);
        }
        catch {
            throw new Error(`Video file not found or not accessible: ${videoPath}`);
        }
    }
    getConfig() {
        return { ...this.config };
    }
    updateConfig(config) {
        if (config.outputDir !== undefined) {
            this.config.outputDir = config.outputDir;
        }
        if (config.frameFormat !== undefined) {
            if (!['jpg', 'png'].includes(config.frameFormat)) {
                throw new Error('frameFormat must be "jpg" or "png"');
            }
            this.config.frameFormat = config.frameFormat;
        }
        if (config.quality !== undefined) {
            if (config.quality < 1 || config.quality > 31) {
                throw new Error('quality must be between 1 and 31');
            }
            this.config.quality = config.quality;
        }
        if (config.resolution !== undefined) {
            this.config.resolution = config.resolution;
        }
    }
    async cleanup() {
        try {
            const files = await fs.readdir(this.config.outputDir);
            for (const file of files) {
                if (file.startsWith('frame_') && (file.endsWith('.jpg') || file.endsWith('.png'))) {
                    await fs.unlink(path.join(this.config.outputDir, file));
                }
            }
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }
}
export default FrameExtractor;
//# sourceMappingURL=frame-extractor.js.map