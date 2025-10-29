export interface FrameExtractorConfig {
    outputDir?: string;
    frameFormat?: 'jpg' | 'png';
    quality?: number;
    resolution?: string;
}
export interface ExtractedFrame {
    framePath: string;
    timestamp: number;
    frameIndex: number;
}
export interface ExtractionResult {
    frames: ExtractedFrame[];
    outputDir: string;
    totalFrames: number;
    processingTime: number;
}
export interface VideoMetadata {
    duration: number;
    width: number;
    height: number;
    fps: number;
    codec: string;
    bitrate: number;
}
export declare class FrameExtractor {
    private config;
    constructor(config?: FrameExtractorConfig);
    extractFramesByInterval(videoPath: string, intervalSeconds: number): Promise<ExtractionResult>;
    extractFramesAtTimestamps(videoPath: string, timestamps: number[]): Promise<ExtractedFrame[]>;
    private extractSingleFrame;
    getVideoMetadata(videoPath: string): Promise<VideoMetadata>;
    private validateVideoFile;
    getConfig(): Required<FrameExtractorConfig>;
    updateConfig(config: Partial<FrameExtractorConfig>): void;
    cleanup(): Promise<void>;
}
export default FrameExtractor;
//# sourceMappingURL=frame-extractor.d.ts.map