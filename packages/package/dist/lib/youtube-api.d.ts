export interface VideoMetadata {
    videoId: string;
    title: string;
    description: string;
    channelTitle: string;
    channelId: string;
    tags: string[];
    publishedAt: string;
    thumbnail: string;
}
export interface YouTubeAPIConfig {
    apiKey: string;
    timeout?: number;
}
export declare class YouTubeAPIClient {
    private apiKey;
    private timeout;
    private baseUrl;
    constructor(config: YouTubeAPIConfig);
    extractVideoId(url: string): string | null;
    isYouTubeURL(url: string): boolean;
    getVideoMetadata(videoUrl: string): Promise<VideoMetadata>;
    getMultipleVideoMetadata(videoUrls: string[]): Promise<VideoMetadata[]>;
}
export declare class YouTubeAPIError extends Error {
    constructor(message: string);
}
export default YouTubeAPIClient;
//# sourceMappingURL=youtube-api.d.ts.map