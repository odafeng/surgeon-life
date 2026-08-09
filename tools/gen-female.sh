#!/bin/bash
# 生女性主角的 16 張立繪：4 個年齡各一張底圖，再由底圖生 3 個表情差分。
# 底圖必須先完成，表情是用 images/edits 帶著底圖去改的——順序不能反。
set -euo pipefail
PROJ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJ"
WORK=$(mktemp -d /tmp/_famXXXXXX)
trap 'rm -rf "$WORK"' EXIT

finish() {  # <來源png> <輸出名>
  python3 tools/cutout.py "$1" "$WORK/cut.png" 8
  cwebp -quiet -q 82 -alpha_q 90 "$WORK/cut.png" -o "assets/$2.webp"
  echo "完成 assets/$2.webp"
}

for age in 25 30 42 60; do
  echo "=== ${age} 歲底圖 ==="
  tools/gen-art.sh "$WORK/f$age.png" 1024x1536 medium "tools/prompts/f$age.txt"
  finish "$WORK/f$age.png" "portrait-f-$age"
done

for age in 25 30 42 60; do
  for mood in lifted weary wry; do
    ( echo "=== ${age} 歲 ${mood} ==="
      tools/gen-variant.sh "$WORK/f$age-$mood.png" "$WORK/f$age.png" "tools/prompts/moods-f/$mood.txt"
      finish "$WORK/f$age-$mood.png" "portrait-f-$age-$mood" ) &
  done
  wait   # 一個年齡三張並行,年齡之間串行,避免一次打太多請求
done
echo "全部完成"
ls -la assets/portrait-f-*.webp | wc -l
