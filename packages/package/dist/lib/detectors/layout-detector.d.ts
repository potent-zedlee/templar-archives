import { VideoMetadata } from '../youtube-api.js';
import { LayoutType } from '../layouts.js';
export interface LayoutDetectionResult {
    layout: LayoutType;
    confidence: number;
    matchedKeywords: string[];
    source: 'youtube_metadata' | 'fallback' | 'manual';
    metadata?: VideoMetadata;
    processingTime: number;
}
export interface LayoutDetectorConfig {
    youtubeApiKey: string;
    confidenceThreshold?: number;
    enableFallback?: boolean;
}
export declare class LayoutDetector {
    private youtubeClient;
    private confidenceThreshold;
    private enableFallback;
    constructor(config: LayoutDetectorConfig);
    detectLayout(videoUrl: string): Promise<LayoutDetectionResult>;
    detectFromMetadata(metadata: VideoMetadata): LayoutDetectionResult;
    private calculateScores;
    private getMatchedKeywords;
    forceLayout(layout: LayoutType): LayoutDetectionResult;
    getConfidenceThreshold(): number;
    setConfidenceThreshold(threshold: number): void;
}
export default LayoutDetector;
//# sourceMappingURL=layout-detector.d.ts.map