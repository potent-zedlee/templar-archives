#!/bin/bash
# Vercel 배포 스크립트

echo "🚀 Vercel 배포 시작..."

# Vercel CLI 설치 확인
if ! command -v vercel &> /dev/null
then
    echo "❌ Vercel CLI가 설치되지 않았습니다."
    echo "설치 명령: npm i -g vercel"
    exit 1
fi

# 현재 브랜치 확인
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📌 현재 브랜치: $CURRENT_BRANCH"

# 변경사항 확인
if [[ -n $(git status -s) ]]; then
    echo "⚠️  경고: 커밋되지 않은 변경사항이 있습니다."
    git status -s
    read -p "계속하시겠습니까? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 배포 타입 선택
echo ""
echo "배포 타입을 선택하세요:"
echo "1) 미리보기 배포 (Preview)"
echo "2) 프로덕션 배포 (Production)"
read -p "선택 (1/2): " DEPLOY_TYPE

if [[ $DEPLOY_TYPE == "1" ]]; then
    echo "🔍 미리보기 배포 시작..."
    vercel --yes
elif [[ $DEPLOY_TYPE == "2" ]]; then
    echo "🚀 프로덕션 배포 시작..."
    vercel --prod --yes
else
    echo "❌ 잘못된 선택입니다."
    exit 1
fi

echo ""
echo "✅ 배포 완료!"
echo "📍 Vercel 대시보드에서 URL 확인: https://vercel.com/potent-zedlee/templar-archives"
