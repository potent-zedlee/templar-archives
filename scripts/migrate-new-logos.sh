#!/bin/bash

# =====================================================
# Logo Migration Script
# =====================================================
# 새로운 SVG 로고 파일들을 정규화하고 적용하는 스크립트

set -e  # 에러 발생 시 즉시 중단

LOGOS_DIR="/Users/zed/Desktop/Archive/templar-archives/public/logos"
NEW_LOGOS_DIR="$LOGOS_DIR/new"
BACKUP_DIR="$LOGOS_DIR/_backup_$(date +%Y%m%d_%H%M%S)"

echo "🚀 Logo Migration Script"
echo "========================"
echo ""

# 1. 백업 디렉토리 생성
echo "📦 Step 1: Creating backup directory..."
mkdir -p "$BACKUP_DIR"
echo "   ✓ Created: $BACKUP_DIR"
echo ""

# 2. 교체될 기존 로고 백업
echo "💾 Step 2: Backing up existing logos..."
LOGOS_TO_BACKUP=(
  "ept.svg"
  "triton.svg"
  "triton.png"
  "wpt.svg"
  "wsop.svg"
  "wsope.svg"
)

for logo in "${LOGOS_TO_BACKUP[@]}"; do
  if [ -f "$LOGOS_DIR/$logo" ]; then
    cp "$LOGOS_DIR/$logo" "$BACKUP_DIR/"
    echo "   ✓ Backed up: $logo"
  fi
done
echo ""

# 3. 새 로고 복사 (정규화된 파일명)
echo "📋 Step 3: Copying new logos with normalized names..."

# 파일명 매핑 함수
get_target_filename() {
  case "$1" in
    "event-lgoos_appt.svg") echo "appt.svg" ;;
    "event-lgoos_ept.svg") echo "ept.svg" ;;
    "event-lgoos_espt.svg") echo "espt.svg" ;;
    "event-lgoos_eureka.svg") echo "eureka.svg" ;;
    "event-lgoos_lapt.svg") echo "lapt.svg" ;;
    "event-lgoos_syb-triton.svg") echo "triton-symbol.svg" ;;
    "event-lgoos_syb-wpt.svg") echo "wpt-symbol.svg" ;;
    "event-lgoos_syb-wsop.svg") echo "wsop-symbol.svg" ;;
    "event-lgoos_triton.svg") echo "triton.svg" ;;
    "event-lgoos_tritonone.svg") echo "triton-one.svg" ;;
    "event-lgoos_ukipt.svg") echo "ukipt.svg" ;;
    "event-lgoos_wpt.svg") echo "wpt.svg" ;;
    "event-lgoos_wptp.svg") echo "wpt-prime.svg" ;;
    "event-lgoos_wsop.svg") echo "wsop.svg" ;;
    "event-lgoos_wsopc.svg") echo "wsop-circuit.svg" ;;
    "event-lgoos_wsope.svg") echo "wsope.svg" ;;
    "event-lgoos_wsopp.svg") echo "wsop-paradise.svg" ;;
    *) echo "" ;;
  esac
}

# 매핑할 파일 목록
SOURCE_FILES=(
  "event-lgoos_appt.svg"
  "event-lgoos_ept.svg"
  "event-lgoos_espt.svg"
  "event-lgoos_eureka.svg"
  "event-lgoos_lapt.svg"
  "event-lgoos_syb-triton.svg"
  "event-lgoos_syb-wpt.svg"
  "event-lgoos_syb-wsop.svg"
  "event-lgoos_triton.svg"
  "event-lgoos_tritonone.svg"
  "event-lgoos_ukipt.svg"
  "event-lgoos_wpt.svg"
  "event-lgoos_wptp.svg"
  "event-lgoos_wsop.svg"
  "event-lgoos_wsopc.svg"
  "event-lgoos_wsope.svg"
  "event-lgoos_wsopp.svg"
)

for source_file in "${SOURCE_FILES[@]}"; do
  target_file=$(get_target_filename "$source_file")
  source_path="$NEW_LOGOS_DIR/$source_file"
  target_path="$LOGOS_DIR/$target_file"

  if [ -f "$source_path" ]; then
    # 파일 크기 확인 (104 bytes 이하는 빈 파일)
    file_size=$(stat -f%z "$source_path")
    if [ $file_size -gt 200 ]; then
      cp "$source_path" "$target_path"
      echo "   ✓ Copied: $source_file → $target_file ($file_size bytes)"
    else
      echo "   ⚠ Skipped (empty): $source_file ($file_size bytes)"
    fi
  else
    echo "   ✗ Not found: $source_file"
  fi
done
echo ""

# 4. 요약
echo "📊 Summary:"
echo "   - Backup location: $BACKUP_DIR"
echo "   - New logos copied to: $LOGOS_DIR"
echo ""

# 5. 다음 단계 안내
echo "✅ Migration completed!"
echo ""
echo "📝 Next steps:"
echo "   1. Test logos in local environment: npm run dev"
echo "   2. Check /archive page logo bar"
echo "   3. If all looks good, commit changes"
echo "   4. Clean up: rm -rf $NEW_LOGOS_DIR (optional)"
echo ""
