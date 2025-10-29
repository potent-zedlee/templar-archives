import { YouTubeAPIClient } from '../youtube-api.js';
const LAYOUT_KEYWORDS = {
    triton: {
        primary: ['triton poker', 'triton', 'triton series'],
        secondary: [
            'monte carlo',
            'cyprus',
            'jeju',
            'london',
            'high stakes',
            'high roller',
            'super high roller',
        ],
        channelNames: ['Triton Poker', 'PokerGO'],
    },
    hustler: {
        primary: ['hustler casino live', 'hustler casino', 'hcl'],
        secondary: [
            'los angeles',
            'gardena',
            'hustler',
            'garrett adelstein',
            'nick vertucci',
        ],
        channelNames: ['Hustler Casino Live'],
    },
    wsop: {
        primary: ['wsop', 'world series of poker', 'world series'],
        secondary: [
            'main event',
            'bracelet',
            'rio',
            'horseshoe',
            'bally',
            'espn',
            'caesars',
        ],
        channelNames: ['World Series of Poker', 'ESPN', 'PokerGO', 'WSOP'],
    },
    apt: {
        primary: ['apt', 'asia poker tour', 'asian poker tour'],
        secondary: ['macau', 'manila', 'tokyo', 'seoul', 'bangkok', 'vietnam'],
        channelNames: ['Asia Poker Tour', 'APT Poker'],
    },
    base: {
        primary: [],
        secondary: [],
        channelNames: [],
    },
};
export class LayoutDetector {
    youtubeClient;
    confidenceThreshold;
    enableFallback;
    constructor(config) {
        this.youtubeClient = new YouTubeAPIClient({
            apiKey: config.youtubeApiKey,
        });
        this.confidenceThreshold = config.confidenceThreshold ?? 0.7;
        this.enableFallback = config.enableFallback ?? true;
    }
    async detectLayout(videoUrl) {
        const startTime = Date.now();
        if (!this.youtubeClient.isYouTubeURL(videoUrl)) {
            return {
                layout: 'base',
                confidence: 0.5,
                matchedKeywords: [],
                source: 'fallback',
                processingTime: Date.now() - startTime,
            };
        }
        try {
            const metadata = await this.youtubeClient.getVideoMetadata(videoUrl);
            const result = this.detectFromMetadata(metadata);
            result.processingTime = Date.now() - startTime;
            result.metadata = metadata;
            return result;
        }
        catch (error) {
            if (this.enableFallback) {
                return {
                    layout: 'base',
                    confidence: 0.5,
                    matchedKeywords: [],
                    source: 'fallback',
                    processingTime: Date.now() - startTime,
                };
            }
            throw error;
        }
    }
    detectFromMetadata(metadata) {
        const scores = this.calculateScores(metadata);
        const entries = Object.entries(scores);
        const sorted = entries.sort((a, b) => b[1] - a[1]);
        const [winner, winnerScore] = sorted[0];
        const confidence = Math.min(winnerScore / 100, 1.0);
        if (confidence < this.confidenceThreshold && this.enableFallback) {
            return {
                layout: 'base',
                confidence: 0.5,
                matchedKeywords: [],
                source: 'fallback',
                processingTime: 0,
            };
        }
        const matchedKeywords = this.getMatchedKeywords(metadata, winner);
        return {
            layout: winner,
            confidence,
            matchedKeywords,
            source: 'youtube_metadata',
            processingTime: 0,
        };
    }
    calculateScores(metadata) {
        const scores = {
            triton: 0,
            hustler: 0,
            wsop: 0,
            apt: 0,
            base: 0,
        };
        const combinedText = `
      ${metadata.title}
      ${metadata.description}
      ${metadata.channelTitle}
      ${metadata.tags.join(' ')}
    `.toLowerCase();
        for (const [layout, keywords] of Object.entries(LAYOUT_KEYWORDS)) {
            if (layout === 'base')
                continue;
            for (const keyword of keywords.primary) {
                if (combinedText.includes(keyword.toLowerCase())) {
                    scores[layout] += 50;
                }
            }
            for (const keyword of keywords.secondary) {
                if (combinedText.includes(keyword.toLowerCase())) {
                    scores[layout] += 20;
                }
            }
            for (const channelName of keywords.channelNames) {
                if (metadata.channelTitle.toLowerCase().includes(channelName.toLowerCase())) {
                    scores[layout] += 30;
                }
            }
        }
        return scores;
    }
    getMatchedKeywords(metadata, layout) {
        if (layout === 'base')
            return [];
        const keywords = LAYOUT_KEYWORDS[layout];
        const matched = [];
        const combinedText = `
      ${metadata.title}
      ${metadata.description}
      ${metadata.channelTitle}
      ${metadata.tags.join(' ')}
    `.toLowerCase();
        for (const keyword of keywords.primary) {
            if (combinedText.includes(keyword.toLowerCase())) {
                matched.push(keyword);
            }
        }
        for (const keyword of keywords.secondary) {
            if (combinedText.includes(keyword.toLowerCase())) {
                matched.push(keyword);
            }
        }
        for (const channelName of keywords.channelNames) {
            if (metadata.channelTitle.toLowerCase().includes(channelName.toLowerCase())) {
                matched.push(`channel:${channelName}`);
            }
        }
        return matched;
    }
    forceLayout(layout) {
        return {
            layout,
            confidence: 1.0,
            matchedKeywords: [`manual:${layout}`],
            source: 'manual',
            processingTime: 0,
        };
    }
    getConfidenceThreshold() {
        return this.confidenceThreshold;
    }
    setConfidenceThreshold(threshold) {
        if (threshold < 0 || threshold > 1) {
            throw new Error('Confidence threshold must be between 0 and 1');
        }
        this.confidenceThreshold = threshold;
    }
}
export default LayoutDetector;
//# sourceMappingURL=layout-detector.js.map