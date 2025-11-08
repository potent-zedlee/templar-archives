"""HAE (Hand Analysis Engine) - Gemini-based poker hand extraction"""

import os
import json
import re
import time
from typing import List, Dict, Any, Optional
from google import genai
from .prompts import EPT_PROMPT, TRITON_POKER_PROMPT


# Initialize Gemini client
client = genai.Client(api_key=os.environ.get('GOOGLE_API_KEY', ''))

# Constants
MAX_SEGMENT_DURATION = 3600  # 1 hour in seconds
MAX_RETRIES = 3  # Maximum retry attempts
RETRY_DELAY = 2  # Base delay in seconds (exponential backoff)


class HaeSegment:
    """Represents a video segment for analysis"""
    def __init__(self, start: int, end: int, label: Optional[str] = None):
        self.start = start
        self.end = end
        self.label = label or 'Gameplay'


class HaeResult:
    """Result from HAE analysis"""
    def __init__(self, hands: List[Dict], raw_response: str, error: Optional[str] = None):
        self.hands = hands
        self.raw_response = raw_response
        self.error = error

    def to_dict(self):
        return {
            'hands': self.hands,
            'rawResponse': self.raw_response,
            'error': self.error
        }


def is_valid_youtube_url(url: str) -> bool:
    """Validate YouTube URL format"""
    patterns = [
        r'^https?://(www\.)?youtube\.com/watch\?v=[\w-]+',
        r'^https?://youtu\.be/[\w-]+'
    ]
    return any(re.match(pattern, url) for pattern in patterns)


def format_time_offset(seconds: int) -> str:
    """Convert seconds to Gemini's time offset format"""
    return f"{int(seconds)}s"


def split_segment(segment: HaeSegment) -> List[HaeSegment]:
    """Split long segment into chunks (max 1 hour each)"""
    duration = segment.end - segment.start
    if duration <= MAX_SEGMENT_DURATION:
        return [segment]

    chunks = []
    current_start = segment.start

    while current_start < segment.end:
        current_end = min(current_start + MAX_SEGMENT_DURATION, segment.end)
        chunks.append(HaeSegment(
            start=current_start,
            end=current_end,
            label=segment.label
        ))
        current_start = current_end

    return chunks


def should_retry(error: Exception) -> bool:
    """Determine if an error is retryable"""
    error_str = str(error).lower()

    # Don't retry quota errors (need to wait longer)
    if 'quota' in error_str or 'resource_exhausted' in error_str:
        return False

    # Don't retry permanent errors
    if '404' in error_str or 'not found' in error_str:
        return False

    if '403' in error_str or 'forbidden' in error_str:
        return False

    # Retry temporary errors
    if 'timeout' in error_str or 'deadline' in error_str:
        return True

    if '500' in error_str or '502' in error_str or '503' in error_str:
        return True

    if 'connection' in error_str or 'network' in error_str:
        return True

    # Default: don't retry unknown errors
    return False


async def hae_analyze_single_segment(
    youtube_url: str,
    segment: HaeSegment,
    platform: str = 'ept'
) -> HaeResult:
    """Analyze a single segment using HAE (must be <= 1 hour) with retry logic"""

    # Select prompt based on platform
    prompt = EPT_PROMPT if platform == 'ept' else TRITON_POKER_PROMPT

    # Build the content request
    duration_minutes = int((segment.end - segment.start) / 60)
    full_prompt = f"""{prompt}

Segment: {segment.start}s - {segment.end}s ({duration_minutes} minutes)
Label: {segment.label}

Please analyze this poker video segment and extract all hand histories in the specified JSON format."""

    # Retry loop
    for attempt in range(MAX_RETRIES):
        try:
            # Use async API
            response = await client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=[{
                'role': 'user',
                'parts': [
                    {
                        'file_data': {
                            'file_uri': youtube_url,
                            'mime_type': 'video/*'
                        },
                        'video_metadata': {
                            'start_offset': format_time_offset(segment.start),
                            'end_offset': format_time_offset(segment.end)
                        }
                    },
                    {
                        'text': full_prompt
                    }
                ]
            }],
            config={
                'temperature': 0.1,
                'top_p': 0.95,
                'top_k': 40,
                'max_output_tokens': 8192,
                'response_mime_type': 'application/json'
            }
        )

            raw_response = response.text or ''

            # Parse JSON response
            try:
                parsed_data = json.loads(raw_response)
                return HaeResult(
                    hands=parsed_data.get('hands', []),
                    raw_response=raw_response
                )
            except json.JSONDecodeError:
                # Try to extract JSON from markdown code blocks
                json_match = re.search(r'```json\n([\s\S]*?)\n```', raw_response)
                if json_match:
                    parsed_data = json.loads(json_match.group(1))
                    return HaeResult(
                        hands=parsed_data.get('hands', []),
                        raw_response=raw_response
                    )

                return HaeResult(
                    hands=[],
                    raw_response=raw_response,
                    error='Could not parse JSON from response'
                )

        except Exception as error:
            # Check if we should retry
            if attempt < MAX_RETRIES - 1 and should_retry(error):
                # Exponential backoff
                delay = RETRY_DELAY * (2 ** attempt)
                print(f'Retry attempt {attempt + 1}/{MAX_RETRIES} after {delay}s: {error}')
                time.sleep(delay)
                continue  # Retry
            else:
                # Final error handling
                print(f'Gemini single segment error (final): {error}')

                # Provide more specific error messages
                error_message = str(error)

                if '404' in error_message or 'not found' in error_message.lower():
                    error_message = 'Video not found or not accessible (may be private or deleted)'
                elif '403' in error_message or 'forbidden' in error_message.lower():
                    error_message = 'Video access forbidden (may be private or restricted)'
                elif 'quota' in error_message.lower():
                    error_message = 'API quota exceeded - please try again later'
                elif 'timeout' in error_message.lower():
                    error_message = 'Request timeout - video may be too long or server is busy'

                return HaeResult(
                    hands=[],
                    raw_response='',
                    error=error_message
                )

    # Should never reach here
    return HaeResult(
        hands=[],
        raw_response='',
        error='Max retries exceeded'
    )


async def hae_analyze_segment(
    youtube_url: str,
    segment: HaeSegment,
    platform: str = 'ept'
) -> HaeResult:
    """Analyze a video segment using HAE (Gemini 2.5 Flash) with YouTube URL"""
    try:
        # Validate YouTube URL
        if not is_valid_youtube_url(youtube_url):
            return HaeResult(
                hands=[],
                raw_response='',
                error='Invalid YouTube URL format'
            )

        # Validate segment times
        if segment.start < 0 or segment.end <= segment.start:
            return HaeResult(
                hands=[],
                raw_response='',
                error='Invalid segment time range'
            )

        # Split if segment is longer than 1 hour
        chunks = split_segment(segment)

        if len(chunks) > 1:
            print(f'Segment too long ({segment.end - segment.start}s), split into {len(chunks)} chunks')

            # Analyze each chunk and merge results
            results = []
            for chunk in chunks:
                result = await hae_analyze_single_segment(youtube_url, chunk, platform)
                results.append(result)

            # Merge all hands from chunks
            all_hands = []
            for r in results:
                all_hands.extend(r.hands)

            all_responses = '\n---\n'.join(r.raw_response for r in results)
            errors = [r.error for r in results if r.error]

            return HaeResult(
                hands=all_hands,
                raw_response=all_responses,
                error='; '.join(errors) if errors else None
            )

        return await hae_analyze_single_segment(youtube_url, segment, platform)

    except Exception as error:
        print(f'Gemini API error: {error}')
        return HaeResult(
            hands=[],
            raw_response='',
            error=str(error)
        )


async def hae_analyze_segments(
    youtube_url: str,
    segments: List[Dict],
    platform: str = 'ept'
) -> List[HaeResult]:
    """Analyze multiple segments in parallel using HAE for better performance"""
    segment_objects = [
        HaeSegment(s['start'], s['end'], s.get('label'))
        for s in segments
    ]

    # Note: Python's asyncio would allow parallel processing here
    # For now, sequential processing (can be optimized with asyncio.gather)
    results = []
    for segment in segment_objects:
        result = await hae_analyze_segment(youtube_url, segment, platform)
        results.append(result)

    return results


async def generate_hand_summary(hand_data: Dict) -> str:
    """Generate a 2-3 sentence summary of a poker hand for display"""
    try:
        # Build a structured hand description
        players_desc = '\n'.join([
            f"- {p['name']} ({p.get('position', 'Unknown')}): "
            f"{' '.join(p.get('holeCards', [])) if isinstance(p.get('holeCards'), list) else p.get('holeCards', 'Unknown')}"
            for p in hand_data.get('players', [])
        ])

        board = hand_data.get('board', {})
        flop = ' '.join(board.get('flop', [])) if board.get('flop') else 'N/A'
        turn = board.get('turn') or 'N/A'
        river = board.get('river') or 'N/A'

        actions_desc = '\n'.join([
            f"- {a['player']}: {a['action'].upper()} "
            f"{a.get('amount', '')} ({a['street']})"
            for a in (hand_data.get('actions', [])[:10])
        ]) or 'No actions recorded'

        winners_desc = '\n'.join([
            f"- {w['name']}: {w.get('hand', 'Won')} ({w.get('amount', 0)})"
            for w in hand_data.get('winners', [])
        ]) or 'No winners recorded'

        hand_description = f"""
Hand #{hand_data.get('handNumber', 'N/A')}
Stakes: {hand_data.get('stakes', 'Unknown')}
Pot: {hand_data.get('pot', 0)}

Players:
{players_desc}

Board:
Flop: {flop}
Turn: {turn}
River: {river}

Key Actions:
{actions_desc}

Winners:
{winners_desc}
"""

        prompt = f"""Summarize this poker hand in exactly 2-3 engaging sentences. Focus on:
1. Key preflop action (if significant)
2. Critical decision points on flop/turn/river
3. Final outcome and winner

Be concise, clear, and exciting. Use poker terminology appropriately.

Hand Data:
{hand_description}

Example style:
"Daniel Negreanu raises AsAd from UTG to 300k. Flop comes Ah9d3c giving him top set. He bets 125k, gets called by OSTASH with 9c5c. Turn As gives Negreanu quads and he wins a 2.4M pot."

Your summary:"""

        response = await client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={
                'temperature': 0.7,
                'max_output_tokens': 256
            }
        )

        summary = (response.text or '').strip() or 'Hand summary not available'

        # Ensure it's not too long (max 500 chars)
        if len(summary) > 500:
            summary = summary[:497] + '...'

        return summary

    except Exception as error:
        print(f'Failed to generate hand summary: {error}')
        return 'Summary generation failed - please check hand data'


# Vercel Serverless Function handler
from http.server import BaseHTTPRequestHandler
import asyncio


class handler(BaseHTTPRequestHandler):
    """Vercel Python Function handler"""

    def do_GET(self):
        """Health check endpoint"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        response = json.dumps({
            'status': 'ok',
            'service': 'HAE Analysis API',
            'version': '1.0.0'
        })

        self.wfile.write(response.encode())

    def do_POST(self):
        """Analyze video segments"""
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            body = json.loads(post_data.decode())

            # Extract parameters
            youtube_url = body.get('youtubeUrl')
            segments = body.get('segments', [])
            platform = body.get('platform', 'ept')

            # Validate input
            if not youtube_url:
                self.send_error(400, 'youtubeUrl is required')
                return

            if not segments:
                self.send_error(400, 'segments is required')
                return

            # Run async analysis in sync context
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            results = loop.run_until_complete(
                hae_analyze_segments(youtube_url, segments, platform)
            )
            loop.close()

            # Convert results to dicts
            results_dict = [r.to_dict() for r in results]

            # Send response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()

            response = json.dumps({
                'success': True,
                'results': results_dict
            })

            self.wfile.write(response.encode())

        except Exception as error:
            print(f'Analyze error: {error}')

            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()

            error_response = json.dumps({
                'success': False,
                'error': str(error)
            })

            self.wfile.write(error_response.encode())
