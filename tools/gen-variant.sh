#!/bin/bash
# 以參考圖生變體(表情差分)。用 /v1/images/edits 帶原圖,確保是同一個人、同一套衣服。
# 用法: gen-variant.sh <輸出檔> <參考圖> <prompt檔> [size]
# key 從專案根目錄 .env 讀,全程不 echo。
set -euo pipefail
OUT="$1"; REF="$2"; PROMPT_FILE="$3"; SIZE="${4:-1024x1536}"
PROJ=/Users/huangshifeng/Desktop/Projects/surgeon-life
KEY=$(grep '^OPENAI_API_KEY=' "$PROJ/.env" | cut -d= -f2- | tr -d '"'"'"' \r\n')
TMP=$(mktemp /tmp/_edXXXXXX)
trap 'rm -f "$TMP"' EXIT

code=$(curl -s -o "$TMP" -w "%{http_code}" --max-time 280 \
  https://api.openai.com/v1/images/edits \
  -H "Authorization: Bearer $KEY" \
  -F model=gpt-image-2 \
  -F "image[]=@$REF" \
  -F size="$SIZE" -F quality=medium \
  -F prompt="$(cat "$PROMPT_FILE")")

if [ "$code" != "200" ]; then
  echo "HTTP $code"
  python3 -c "import json;print('錯誤:',json.load(open('$TMP')).get('error',{}).get('message','?')[:300])"
  exit 1
fi

python3 -c "
import json,base64,sys
d=json.load(open('$TMP'))
open(sys.argv[1],'wb').write(base64.b64decode(d['data'][0]['b64_json']))
print('OK ->',sys.argv[1],'| tokens:',d.get('usage',{}).get('total_tokens','?'))
" "$OUT"
