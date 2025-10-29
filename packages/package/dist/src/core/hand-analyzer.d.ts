import type { Hand } from '../../lib/types/hand.js';
export interface AnalysisOptions {
    videoUrl?: string;
    videoPath?: string;
    layout?: string;
    maxIterations?: number;
}
export interface AnalysisResult {
    hands: Hand[];
    totalHands: number;
    successfulHands: number;
    failedHands: number;
    averageConfidence: number;
    totalIterations: number;
    processingTime: number;
}
export declare class HandAnalyzer {
    private geminiClient;
    private promptBuilder;
    private promptOptimizer;
    constructor(apiKey: string);
    analyzeVideo(options: AnalysisOptions): Promise<AnalysisResult>;
    analyzeSingleHand(videoSource: string, startTime: string, endTime: string, layout?: string): Promise<Hand>;
}
export default HandAnalyzer;
//# sourceMappingURL=hand-analyzer.d.ts.map