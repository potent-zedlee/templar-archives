/**
 * WebView Detection Utility
 *
 * Detects if the current browser is running in a WebView (embedded browser)
 * which may cause Google OAuth login issues.
 */

export type BrowserType =
  | 'chrome'
  | 'safari'
  | 'firefox'
  | 'edge'
  | 'webview-kakao'
  | 'webview-instagram'
  | 'webview-facebook'
  | 'webview-line'
  | 'webview-ios'
  | 'webview-android'
  | 'webview-unknown'
  | 'unknown'

export interface WebViewDetectionResult {
  isWebView: boolean
  browserType: BrowserType
  browserName: string
  userAgent: string
}

/**
 * Detects if the browser is a WebView and identifies the type
 */
export function detectWebView(): WebViewDetectionResult {
  // Server-side rendering fallback
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isWebView: false,
      browserType: 'unknown',
      browserName: 'Unknown',
      userAgent: ''
    }
  }

  const ua = navigator.userAgent.toLowerCase()

  // Kakao Talk in-app browser
  if (ua.includes('kakaotalk')) {
    return {
      isWebView: true,
      browserType: 'webview-kakao',
      browserName: 'KakaoTalk',
      userAgent: navigator.userAgent
    }
  }

  // Instagram in-app browser
  if (ua.includes('instagram')) {
    return {
      isWebView: true,
      browserType: 'webview-instagram',
      browserName: 'Instagram',
      userAgent: navigator.userAgent
    }
  }

  // Facebook in-app browser
  if (ua.includes('fbav') || ua.includes('fban') || ua.includes('fb_iab')) {
    return {
      isWebView: true,
      browserType: 'webview-facebook',
      browserName: 'Facebook',
      userAgent: navigator.userAgent
    }
  }

  // Line in-app browser
  if (ua.includes('line')) {
    return {
      isWebView: true,
      browserType: 'webview-line',
      browserName: 'Line',
      userAgent: navigator.userAgent
    }
  }

  // iOS WebView detection
  if (/(iphone|ipod|ipad).*applewebkit(?!.*safari)/i.test(ua)) {
    // Check for standalone mode (PWA)
    const isStandalone = (navigator as any).standalone === true

    if (!isStandalone) {
      return {
        isWebView: true,
        browserType: 'webview-ios',
        browserName: 'iOS WebView',
        userAgent: navigator.userAgent
      }
    }
  }

  // Android WebView detection
  if (ua.includes('wv') || (ua.includes('android') && !ua.includes('chrome'))) {
    return {
      isWebView: true,
      browserType: 'webview-android',
      browserName: 'Android WebView',
      userAgent: navigator.userAgent
    }
  }

  // Generic WebView detection (fallback)
  if (ua.includes('webview')) {
    return {
      isWebView: true,
      browserType: 'webview-unknown',
      browserName: 'WebView',
      userAgent: navigator.userAgent
    }
  }

  // Standard browsers
  if (ua.includes('chrome') && !ua.includes('edg')) {
    return {
      isWebView: false,
      browserType: 'chrome',
      browserName: 'Chrome',
      userAgent: navigator.userAgent
    }
  }

  if (ua.includes('safari') && !ua.includes('chrome')) {
    return {
      isWebView: false,
      browserType: 'safari',
      browserName: 'Safari',
      userAgent: navigator.userAgent
    }
  }

  if (ua.includes('firefox')) {
    return {
      isWebView: false,
      browserType: 'firefox',
      browserName: 'Firefox',
      userAgent: navigator.userAgent
    }
  }

  if (ua.includes('edg')) {
    return {
      isWebView: false,
      browserType: 'edge',
      browserName: 'Edge',
      userAgent: navigator.userAgent
    }
  }

  return {
    isWebView: false,
    browserType: 'unknown',
    browserName: 'Unknown Browser',
    userAgent: navigator.userAgent
  }
}

/**
 * Gets a user-friendly message for opening in default browser
 */
export function getOpenInBrowserMessage(browserType: BrowserType): string {
  switch (browserType) {
    case 'webview-kakao':
      return '우측 상단 [...] 메뉴 → "다른 브라우저에서 열기"를 선택해주세요'
    case 'webview-instagram':
      return '우측 상단 [...] 메뉴 → "브라우저에서 열기"를 선택해주세요'
    case 'webview-facebook':
      return '우측 상단 메뉴 → "브라우저에서 열기"를 선택해주세요'
    case 'webview-line':
      return '우측 상단 메뉴 → "Safari에서 열기" 또는 "브라우저에서 열기"를 선택해주세요'
    case 'webview-ios':
    case 'webview-android':
    case 'webview-unknown':
      return 'Safari, Chrome 등 기본 브라우저에서 직접 열어주세요'
    default:
      return '기본 브라우저(Safari, Chrome 등)에서 열어주세요'
  }
}

/**
 * React hook for WebView detection
 */
export function useWebViewDetection(): WebViewDetectionResult {
  if (typeof window === 'undefined') {
    return {
      isWebView: false,
      browserType: 'unknown',
      browserName: 'Unknown',
      userAgent: ''
    }
  }

  return detectWebView()
}
