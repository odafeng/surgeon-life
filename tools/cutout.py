#!/usr/bin/env python3
"""把白底水彩立繪切成去背 PNG。

從四邊做 BFS,只吃「與畫布邊界相連」的白色區域,所以人物身上的白色
(白袍、口罩、識別證)不會被誤刪。邊界羽化以保留水彩暈開的軟邊。

容差要小:白袍是接近白的,tol 太大會從反鋸齒邊緣滲進去把袍子吃掉。
實測 tol=8 對白袍角色安全,tol=36 會吃掉大半件白袍。

用法: cutout.py <輸入> <輸出> [容差(預設 8)]
"""

import sys
from collections import deque

from PIL import Image, ImageFilter

DEFAULT_TOLERANCE = 8


def cutout(src: str, dst: str, tol: int = DEFAULT_TOLERANCE) -> None:
    im = Image.open(src).convert("RGB")
    w, h = im.size
    raw = im.tobytes()  # RGB,每像素 3 bytes;比 load() 快也避開型別歧義

    outside = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))

    floor = 255 - tol
    while q:
        x, y = q.popleft()
        i = y * w + x
        if outside[i]:
            continue
        j = i * 3
        if raw[j] < floor or raw[j + 1] < floor or raw[j + 2] < floor:
            continue
        outside[i] = 1
        if x > 0:
            q.append((x - 1, y))
        if x < w - 1:
            q.append((x + 1, y))
        if y > 0:
            q.append((x, y - 1))
        if y < h - 1:
            q.append((x, y + 1))

    alpha = Image.frombytes("L", (w, h), bytes(0 if v else 255 for v in outside))
    alpha = alpha.filter(ImageFilter.MinFilter(3))  # 微縮,避免殘留白邊
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.4))  # 羽化

    out = im.convert("RGBA")
    out.putalpha(alpha)
    out.save(dst)

    hist = alpha.histogram()
    total = sum(hist)
    print(
        f"{dst}: 透明 {hist[0] / total * 100:.0f}% / "
        f"不透明 {hist[255] / total * 100:.0f}% / "
        f"羽化邊 {(total - hist[0] - hist[255]) / total * 100:.1f}%"
    )


if __name__ == "__main__":
    tol = int(sys.argv[3]) if len(sys.argv) > 3 else DEFAULT_TOLERANCE
    cutout(sys.argv[1], sys.argv[2], tol)
