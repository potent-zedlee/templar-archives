# Orchestrator Service Dockerfile

FROM node:22-slim

WORKDIR /app

# 패키지 파일 복사
COPY package*.json ./

# 전체 의존성 설치 (빌드용 devDependencies 포함)
RUN npm install

# 소스 코드 복사
COPY tsconfig.json ./
COPY src ./src

# TypeScript 빌드
RUN npm run build

# 프로덕션 의존성만 남기기
RUN npm prune --omit=dev

# 환경 변수
ENV NODE_ENV=production
ENV PORT=8080

# 포트 노출
EXPOSE 8080

# 서버 시작
CMD ["node", "dist/index.js"]
