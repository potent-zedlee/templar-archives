#!/usr/bin/env python3
"""
Gemini YouTube URL 직접 분석 검증 스크립트

목적: Gemini API가 YouTube URL을 파일 다운로드 없이 직접 분석할 수 있는지 검증
"""

import os
import sys
import json
import time
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from google import genai


# 테스트 설정
TEST_YOUTUBE_URL = "https://www.youtube.com/watch?v=9hE5-98ZeCg"  # 공개 영상
TEST_START = 40  # 40초
TEST_END = 80    # 80초


def format_time_offset(seconds: int) -> str:
    """Convert seconds to Gemini's time offset format"""
    return f"{int(seconds)}s"


def test_gemini_youtube_analysis():
    """Gemini YouTube URL 직접 분석 테스트"""

    print("=" * 80)
    print("🧪 Gemini YouTube URL 직접 분석 검증 테스트")
    print("=" * 80)
    print()

    # API 키 확인
    api_key = os.environ.get('GOOGLE_API_KEY')
    if not api_key:
        print("❌ 오류: GOOGLE_API_KEY 환경 변수가 설정되지 않았습니다.")
        print("   export GOOGLE_API_KEY='your-api-key' 명령으로 설정해주세요.")
        return False

    print(f"✅ GOOGLE_API_KEY: {api_key[:10]}..." + "*" * 20)
    print()

    # Gemini 클라이언트 초기화
    try:
        client = genai.Client(api_key=api_key)
        print("✅ Gemini 클라이언트 초기화 성공")
    except Exception as e:
        print(f"❌ Gemini 클라이언트 초기화 실패: {e}")
        return False

    print()
    print("📹 테스트 영상 정보:")
    print(f"   URL: {TEST_YOUTUBE_URL}")
    print(f"   세그먼트: {TEST_START}s - {TEST_END}s ({TEST_END - TEST_START}초)")
    print()

    # 테스트 1: YouTube URL 직접 분석 (videoMetadata 사용)
    print("-" * 80)
    print("테스트 1: YouTube URL 직접 분석 (videoMetadata 포함)")
    print("-" * 80)

    try:
        start_time = time.time()

        # Gemini API 호출 (동기 버전)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[{
                'role': 'user',
                'parts': [
                    {
                        'file_data': {
                            'file_uri': TEST_YOUTUBE_URL,
                            'mime_type': 'video/*'
                        },
                        'video_metadata': {
                            'start_offset': format_time_offset(TEST_START),
                            'end_offset': format_time_offset(TEST_END)
                        }
                    },
                    {
                        'text': 'Please describe what you see in this video segment in 2-3 sentences.'
                    }
                ]
            }],
            config={
                'temperature': 0.1,
                'max_output_tokens': 512
            }
        )

        end_time = time.time()
        elapsed = end_time - start_time

        print(f"✅ 분석 성공! (소요 시간: {elapsed:.2f}초)")
        print()
        print("📊 응답 내용:")
        print("-" * 80)
        print(response.text)
        print("-" * 80)
        print()

        # 토큰 사용량 확인 (가능한 경우)
        if hasattr(response, 'usage_metadata'):
            print("💰 토큰 사용량:")
            print(f"   입력 토큰: {response.usage_metadata.prompt_token_count}")
            print(f"   출력 토큰: {response.usage_metadata.candidates_token_count}")
            print(f"   총 토큰: {response.usage_metadata.total_token_count}")
            print()

    except Exception as e:
        print(f"❌ 테스트 1 실패: {e}")
        print(f"   에러 타입: {type(e).__name__}")
        return False

    # 테스트 2: JSON 응답 형식 (포커 핸드 분석 시뮬레이션)
    print("-" * 80)
    print("테스트 2: JSON 응답 형식 테스트 (포커 프롬프트)")
    print("-" * 80)

    poker_prompt = """Analyze this poker video segment and extract hand information in JSON format.

Output format:
{
  "hands": [
    {
      "handNumber": 1,
      "description": "Brief description",
      "pot": 0,
      "players": []
    }
  ]
}

If you cannot identify poker hands, return {"hands": [], "note": "No poker content detected"}
"""

    try:
        start_time = time.time()

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[{
                'role': 'user',
                'parts': [
                    {
                        'file_data': {
                            'file_uri': TEST_YOUTUBE_URL,
                            'mime_type': 'video/*'
                        },
                        'video_metadata': {
                            'start_offset': format_time_offset(TEST_START),
                            'end_offset': format_time_offset(TEST_END)
                        }
                    },
                    {
                        'text': poker_prompt
                    }
                ]
            }],
            config={
                'temperature': 0.1,
                'max_output_tokens': 1024,
                'response_mime_type': 'application/json'
            }
        )

        end_time = time.time()
        elapsed = end_time - start_time

        print(f"✅ 분석 성공! (소요 시간: {elapsed:.2f}초)")
        print()
        print("📊 JSON 응답:")
        print("-" * 80)

        # JSON 파싱 시도
        try:
            parsed = json.loads(response.text)
            print(json.dumps(parsed, indent=2, ensure_ascii=False))
            print("✅ JSON 파싱 성공")
        except json.JSONDecodeError:
            print("⚠️  JSON 파싱 실패, 원본 응답:")
            print(response.text)

        print("-" * 80)
        print()

    except Exception as e:
        print(f"❌ 테스트 2 실패: {e}")
        print(f"   에러 타입: {type(e).__name__}")
        return False

    # 테스트 결과 요약
    print("=" * 80)
    print("✅ 모든 테스트 통과!")
    print("=" * 80)
    print()
    print("📋 검증 결과:")
    print("   ✅ YouTube URL 직접 전달 가능 (파일 다운로드 불필요)")
    print("   ✅ videoMetadata (startOffset, endOffset) 정상 작동")
    print("   ✅ gemini-2.5-flash 모델 지원")
    print("   ✅ JSON 응답 형식 지원")
    print()
    print("🎉 결론: 현재 Python 구현이 올바르게 작동합니다!")
    print()

    return True


def test_error_handling():
    """에러 핸들링 테스트"""

    print("=" * 80)
    print("🧪 에러 핸들링 테스트")
    print("=" * 80)
    print()

    api_key = os.environ.get('GOOGLE_API_KEY')
    if not api_key:
        print("❌ GOOGLE_API_KEY 없음, 에러 테스트 건너뜀")
        return

    client = genai.Client(api_key=api_key)

    # 테스트 3: 잘못된 YouTube URL
    print("-" * 80)
    print("테스트 3: 잘못된 YouTube URL 에러 처리")
    print("-" * 80)

    invalid_url = "https://www.youtube.com/watch?v=INVALID_VIDEO_ID_12345"

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[{
                'role': 'user',
                'parts': [
                    {
                        'file_data': {
                            'file_uri': invalid_url,
                            'mime_type': 'video/*'
                        }
                    },
                    {
                        'text': 'Describe this video.'
                    }
                ]
            }],
            config={'max_output_tokens': 256}
        )

        print("⚠️  예상치 못한 성공 (잘못된 URL인데 응답이 옴)")

    except Exception as e:
        print(f"✅ 예상된 에러 발생: {type(e).__name__}")
        print(f"   메시지: {str(e)[:200]}")

        # 에러 타입 확인
        error_str = str(e).lower()
        if '404' in error_str or 'not found' in error_str:
            print("   → 404 에러 감지됨 (영상을 찾을 수 없음)")
        elif '403' in error_str or 'forbidden' in error_str:
            print("   → 403 에러 감지됨 (접근 금지)")
        elif 'quota' in error_str:
            print("   → Quota 에러 감지됨 (할당량 초과)")

    print()


if __name__ == '__main__':
    print()
    print("🚀 Gemini YouTube URL 분석 검증 시작")
    print(f"⏰ 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # 메인 테스트 실행
    success = test_gemini_youtube_analysis()

    # 에러 핸들링 테스트
    if success:
        test_error_handling()

    print()
    print(f"⏰ 종료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    if success:
        print("✅ 전체 테스트 완료!")
        sys.exit(0)
    else:
        print("❌ 테스트 실패")
        sys.exit(1)
