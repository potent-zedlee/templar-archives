import { GeminiClient } from '../../lib/gemini-client.js';
import { MasterPromptBuilder } from '../../lib/master-prompt-builder.js';
import { PromptOptimizer } from '../../lib/prompt-optimizer.js';
export class HandAnalyzer {
    geminiClient;
    promptBuilder;
    promptOptimizer;
    constructor(apiKey) {
        this.geminiClient = new GeminiClient({ apiKey });
        this.promptBuilder = new MasterPromptBuilder();
        this.promptOptimizer = new PromptOptimizer();
    }
    async analyzeVideo(options) {
        const startTime = Date.now();
        if (!options.videoUrl && !options.videoPath) {
            throw new Error('Either videoUrl or videoPath must be provided');
        }
        const videoSource = options.videoUrl || options.videoPath;
        const masterPrompt = await this.promptBuilder.buildPrompt({
            layout: options.layout || 'triton',
        });
        const fullPrompt = `${masterPrompt.prompt}

IMPORTANT: Analyze the ENTIRE video and extract ALL poker hands.
Return the result as a JSON array of hands, where each hand follows the structure defined above.

Example format:
[
  { "hand_id": "1", "timestamp": 0, "players": [...], ... },
  { "hand_id": "2", "timestamp": 120, "players": [...], ... },
  ...
]

If no hands are found, return an empty array: []`;
        const response = await this.geminiClient.analyzeVideo({
            videoPath: videoSource,
            prompt: fullPrompt,
        });
        let hands = response.data;
        if (!Array.isArray(hands)) {
            hands = [hands];
        }
        const processingTime = Date.now() - startTime;
        const totalHands = hands.length;
        const successfulHands = hands.filter((h) => h.confidence >= this.promptOptimizer.getConfidenceThreshold(1)).length;
        const averageConfidence = totalHands > 0
            ? hands.reduce((sum, h) => sum + h.confidence, 0) / totalHands
            : 0;
        return {
            hands,
            totalHands,
            successfulHands,
            failedHands: totalHands - successfulHands,
            averageConfidence,
            totalIterations: 1,
            processingTime,
        };
    }
    async analyzeSingleHand(videoSource, startTime, endTime, layout) {
        const masterPrompt = await this.promptBuilder.buildPrompt({
            layout: layout || 'triton',
        });
        const response = await this.geminiClient.analyzeVideo({
            videoPath: videoSource,
            prompt: `${masterPrompt.prompt}\n\nAnalyze the hand between ${startTime} and ${endTime}.`,
        });
        return response.data;
    }
}
export default HandAnalyzer;
//# sourceMappingURL=hand-analyzer.js.map