# Tournament & Channel Logos

이 디렉토리에는 각 대회 및 YouTube 채널의 로고 파일을 보관합니다.

## 파일 명명 규칙

각 카테고리에 대응하는 SVG 파일을 다음과 같이 명명하세요:

- `wsop.svg` - WSOP 로고
- `triton.svg` - Triton 로고
- `ept.svg` - EPT 로고
- `hustler.svg` - Hustler Casino Live 로고
- `apt.svg` - APT 로고
- `apl.svg` - APL 로고
- `ggpoker.svg` - GGPOKER 로고

## SVG 요구사항

### 1. 다크/라이트 모드 자동 적응

SVG 파일이 다크/라이트 모드에 자동으로 적응하도록 하려면 다음 방법 중 하나를 사용하세요:

#### 방법 1: `currentColor` 사용 (권장)
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path fill="currentColor" d="M..."/>
</svg>
```

이 방법을 사용하면 Next.js의 Image 컴포넌트가 자동으로 테마에 맞는 색상을 적용합니다.

#### 방법 2: CSS 변수 사용
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <style>
    .logo-primary { fill: var(--logo-color, #000000); }
  </style>
  <path class="logo-primary" d="M..."/>
</svg>
```

### 2. 권장 사양

- **포맷**: SVG
- **크기**: 최소 100x100px (벡터이므로 정확한 크기는 중요하지 않음)
- **색상**: 단색 또는 2-3가지 색상 (다크/라이트 모드 모두에서 잘 보이도록)
- **파일 크기**: 50KB 미만 권장

### 3. 사용 위치

로고는 다음 세 곳에 자동으로 표시됩니다:

1. **Archive 카테고리 필터 버튼** (작은 크기, 16x16px)
2. **Tournament/Event 카드** (중간 크기, 24x24px)
3. **Folder 리스트** (중간 크기, 24x24px)

## 로고 추가 방법

1. SVG 파일을 이 디렉토리(`public/logos/`)에 추가
2. 파일명이 위의 명명 규칙과 일치하는지 확인
3. 페이지 새로고침

로고가 없는 카테고리는 자동으로 텍스트 또는 아이콘으로 폴백됩니다.

## 예시

### WSOP 로고 (`wsop.svg`)
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
  <text x="5" y="35" font-size="30" font-weight="bold" fill="currentColor">WSOP</text>
</svg>
```

### Triton 로고 (`triton.svg`)
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="currentColor" opacity="0.2"/>
  <text x="50" y="60" font-size="20" font-weight="bold" fill="currentColor" text-anchor="middle">TRITON</text>
</svg>
```

## 테마 적응 동작

- **라이트 모드**: `currentColor`는 어두운 색상(foreground)으로 렌더링
- **다크 모드**: `currentColor`는 밝은 색상(foreground)으로 렌더링
- 추가로 `dark:brightness-110 dark:contrast-90` 필터가 적용되어 다크 모드에서 더 선명하게 표시됩니다.

## 문제 해결

### 로고가 표시되지 않는 경우

1. 파일명이 정확한지 확인 (소문자, `.svg` 확장자)
2. 파일이 `public/logos/` 디렉토리에 있는지 확인
3. SVG가 유효한 XML 형식인지 확인
4. 브라우저 캐시 클리어 후 새로고침

### 색상이 이상한 경우

1. SVG 내부의 `fill` 또는 `stroke` 속성을 `currentColor`로 변경
2. 하드코딩된 색상 값(예: `#000000`) 제거
3. CSS 변수 사용 시 폴백 색상 지정
