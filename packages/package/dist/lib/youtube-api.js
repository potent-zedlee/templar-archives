export class YouTubeAPIClient {
    apiKey;
    timeout;
    baseUrl = 'https://www.googleapis.com/youtube/v3';
    constructor(config) {
        if (!config.apiKey) {
            throw new Error('YouTube API key is required');
        }
        this.apiKey = config.apiKey;
        this.timeout = config.timeout || 10000;
    }
    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
            /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
            /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
            /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
            /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    }
    isYouTubeURL(url) {
        return this.extractVideoId(url) !== null;
    }
    async getVideoMetadata(videoUrl) {
        const videoId = this.extractVideoId(videoUrl);
        if (!videoId) {
            throw new Error(`Invalid YouTube URL: ${videoUrl}`);
        }
        const apiUrl = `${this.baseUrl}/videos?` + new URLSearchParams({
            part: 'snippet',
            id: videoId,
            key: this.apiKey,
        }).toString();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            const response = await fetch(apiUrl, {
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorData = (await response.json().catch(() => ({})));
                throw new YouTubeAPIError(`YouTube API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
            }
            const data = (await response.json());
            if (!data.items || data.items.length === 0) {
                throw new YouTubeAPIError(`Video not found: ${videoId}`);
            }
            const snippet = data.items[0].snippet;
            return {
                videoId,
                title: snippet?.title || '',
                description: snippet?.description || '',
                channelTitle: snippet?.channelTitle || '',
                channelId: snippet?.channelId || '',
                tags: snippet?.tags || [],
                publishedAt: snippet?.publishedAt || '',
                thumbnail: snippet?.thumbnails?.high?.url || snippet?.thumbnails?.default?.url || '',
            };
        }
        catch (error) {
            if (error.name === 'AbortError') {
                throw new YouTubeAPIError(`YouTube API request timeout after ${this.timeout}ms`);
            }
            if (error instanceof YouTubeAPIError) {
                throw error;
            }
            throw new YouTubeAPIError(`Failed to fetch video metadata: ${error.message}`);
        }
    }
    async getMultipleVideoMetadata(videoUrls) {
        if (videoUrls.length === 0) {
            return [];
        }
        if (videoUrls.length > 50) {
            throw new Error('YouTube API supports maximum 50 videos per batch request');
        }
        const videoIds = videoUrls
            .map((url) => this.extractVideoId(url))
            .filter((id) => id !== null);
        if (videoIds.length === 0) {
            throw new Error('No valid YouTube URLs provided');
        }
        const apiUrl = `${this.baseUrl}/videos?` + new URLSearchParams({
            part: 'snippet',
            id: videoIds.join(','),
            key: this.apiKey,
        }).toString();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout * 2);
            const response = await fetch(apiUrl, {
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new YouTubeAPIError(`YouTube API error: ${response.status}`);
            }
            const data = (await response.json());
            return (data.items || []).map((item) => ({
                videoId: item.id,
                title: item.snippet.title || '',
                description: item.snippet.description || '',
                channelTitle: item.snippet.channelTitle || '',
                channelId: item.snippet.channelId || '',
                tags: item.snippet.tags || [],
                publishedAt: item.snippet.publishedAt || '',
                thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
            }));
        }
        catch (error) {
            if (error.name === 'AbortError') {
                throw new YouTubeAPIError(`YouTube API batch request timeout after ${this.timeout * 2}ms`);
            }
            throw new YouTubeAPIError(`Failed to fetch batch metadata: ${error.message}`);
        }
    }
}
export class YouTubeAPIError extends Error {
    constructor(message) {
        super(message);
        this.name = 'YouTubeAPIError';
    }
}
export default YouTubeAPIClient;
//# sourceMappingURL=youtube-api.js.map