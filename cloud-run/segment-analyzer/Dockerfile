# Segment Analyzer Service Dockerfile
# FFmpeg 포함 Node.js 환경

FROM node:22-slim

# FFmpeg 설치
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# 작업 디렉토리
WORKDIR /app

# 패키지 파일 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# TypeScript 빌드
RUN npm run build

# 환경 변수
ENV NODE_ENV=production
ENV PORT=8080
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe

# 포트 노출
EXPOSE 8080

# 서버 시작
CMD ["node", "dist/index.js"]
