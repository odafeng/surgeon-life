#!/bin/bash
# 用法: gen.sh <輸出檔名> <size> <quality> <prompt檔路徑> [background] [model]
# key 從專案 .env 讀,全程不 echo
set -euo pipefail
OUT="$1"; SIZE="$2"; QUAL="$3"; PROMPT_FILE="$4"; BG="${5:-opaque}"; MODEL="${6:-gpt-image-2}"
PROJ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"  # 專案根目錄,由腳本位置推得
TMP=$(mktemp /tmp/_imgXXXXXX)
trap 'rm -f "$TMP"' EXIT
KEY=$(grep '^OPENAI_API_KEY=' "$PROJ/.env" | cut -d= -f2- | tr -d '"'"'"' \r\n')

BODY=$(python3 -c "
import json,sys
p=open(sys.argv[1],encoding='utf-8').read().strip()
d={'model':sys.argv[5],'prompt':p,'size':sys.argv[2],'quality':sys.argv[3],'n':1}
if sys.argv[4]!='opaque': d['background']=sys.argv[4]; d['output_format']='png'
print(json.dumps(d))
" "$PROMPT_FILE" "$SIZE" "$QUAL" "$BG" "$MODEL")

code=$(curl -s -o "$TMP" -w "%{http_code}" --max-time 280 \
  https://api.openai.com/v1/images/generations \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d "$BODY")

if [ "$code" != "200" ]; then
  echo "HTTP $code"
  python3 -c "import json;print('錯誤:',json.load(open('"$TMP"')).get('error',{}).get('message','?')[:300])"
  rm -f "$TMP"; exit 1
fi

python3 -c "
import json,base64,sys
d=json.load(open('"$TMP"'))
open(sys.argv[1],'wb').write(base64.b64decode(d['data'][0]['b64_json']))
u=d.get('usage',{})
print('OK ->',sys.argv[1],'| tokens:',u.get('total_tokens','?'))
" "$OUT"
rm -f "$TMP"
