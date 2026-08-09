#!/usr/bin/env python3
"""把中文文句裡的半形標點換成全形。

只在「字串字面值」與「註解」內作用,絕不碰 JS 語法本身的逗號與冒號——
物件字面值的 `id: 'x',` 那兩個符號必須留著,不然檔案就壞了。

判斷依據是標點的鄰居是不是中日韓文字,所以 `03:14`、`https://`、`50%)`
這種數字或英文語境不會被誤換。

用法: fullwidth.py <檔案...>       檢查並改寫
      fullwidth.py --check <檔案...>  只檢查,有殘留就以非零結束
"""

import re
import sys

CJK = r"　-〿一-鿿＀-￯"

# (半形, 全形) — 只在鄰接中文時替換
PAIRS = [(",", "，"), (":", "："), (";", "；"), ("?", "？"), ("!", "！")]

BEFORE = {h: re.compile(rf"(?<=[{CJK}]){re.escape(h)}") for h, _ in PAIRS}
AFTER = {h: re.compile(rf"{re.escape(h)}(?=[{CJK}])") for h, _ in PAIRS}
# 括號:整組被中文包住才換,避免動到程式碼
PAREN = re.compile(rf"(?<=[{CJK}])\(([^()]*)\)")


def convert_text(text: str) -> str:
    # 括號要先轉。否則 `（18%）,` 這種情況下，逗號前面還是半形右括號，
    # 不算在中文鄰接裡，就會被漏掉。
    text = PAREN.sub(lambda m: f"（{m.group(1)}）", text)
    for half, full in PAIRS:
        text = BEFORE[half].sub(full, text)
        text = AFTER[half].sub(full, text)
    return text


def split_js(src: str):
    """把原始碼切成 (是否為可改寫區段, 內容) 的序列。"""
    out = []
    i, n = 0, len(src)
    buf = []
    while i < n:
        ch = src[i]
        nxt = src[i + 1] if i + 1 < n else ""
        if ch in "'\"`":
            out.append((False, "".join(buf)))
            buf = []
            quote = ch
            j = i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == quote:
                    break
                j += 1
            out.append((True, src[i : j + 1]))
            i = j + 1
        elif ch == "/" and nxt == "/":
            out.append((False, "".join(buf)))
            buf = []
            j = src.find("\n", i)
            j = n if j == -1 else j
            out.append((True, src[i:j]))
            i = j
        elif ch == "/" and nxt == "*":
            out.append((False, "".join(buf)))
            buf = []
            j = src.find("*/", i)
            j = n if j == -1 else j + 2
            out.append((True, src[i:j]))
            i = j
        else:
            buf.append(ch)
            i += 1
    out.append((False, "".join(buf)))
    return out


def convert_source(src: str, is_js: bool) -> str:
    if not is_js:
        return convert_text(src)
    return "".join(convert_text(seg) if editable else seg for editable, seg in split_js(src))


def leftovers(src: str, is_js: bool):
    """回報仍鄰接中文的半形標點,供 --check 使用。"""
    segs = split_js(src) if is_js else [(True, src)]
    found = []
    for editable, seg in segs:
        if not editable:
            continue
        for half, _ in PAIRS:
            if BEFORE[half].search(seg) or AFTER[half].search(seg):
                found.append(half)
    return sorted(set(found))


def main() -> int:
    args = sys.argv[1:]
    check = "--check" in args
    paths = [a for a in args if a != "--check"]
    bad = 0
    for path in paths:
        with open(path, encoding="utf-8") as f:
            src = f.read()
        is_js = path.endswith((".js", ".mjs"))
        if check:
            found = leftovers(src, is_js)
            if found:
                bad += 1
                print(f"{path}: 仍有半形 {' '.join(found)}")
        else:
            new = convert_source(src, is_js)
            if new != src:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new)
                print(f"{path}: 已轉換")
    if check and bad == 0:
        print("全部通過:中文語境內沒有半形標點")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
