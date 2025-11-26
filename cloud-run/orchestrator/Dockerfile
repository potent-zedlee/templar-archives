# Orchestrator Service Dockerfile

FROM node:22-slim

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

# 포트 노출
EXPOSE 8080

# 서버 시작
CMD ["node", "dist/index.js"]
