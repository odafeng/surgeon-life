#!/usr/bin/env python3
"""分享預覽圖（Open Graph）。

貼進 LINE、Facebook、Threads 的時候，抓的就是這張。沒有它就只是一條裸網址。
1200×630 是那幾個平台共用的比例；輸出 JPEG 而不是專案裡用的 WebP，
因為部分平台的爬蟲對 WebP 支援不一致，而這張圖只有一個用途就是被它們抓。

用法：python3 tools/gen-og.py
輸出：assets/og.jpg
"""

from PIL import Image, ImageDraw, ImageEnhance, ImageFont

W, H = 1200, 630
SRC = "assets/scene-or.webp"  # 標題畫面用的就是這張開刀房
OUT = "assets/og.jpg"
# 對應 CSS 的 'Songti TC'。這個 .ttc 有八面，index 0 是 Songti SC Black——
# 它缺「醫師個關選擇遊戲」等十一個字，而 PIL 缺字不會報錯，只會畫成空白。
# 第一版就是那樣產出一張寫著「外科　的一生」的圖。TC 那兩面才是正體。
FONT = "/System/Library/Fonts/Supplemental/Songti.ttc"
FONT_BOLD, FONT_REGULAR = 2, 7  # Songti TC Bold / Regular

GOLD = (184, 147, 78)
DIM = (182, 173, 156)

TITLE = "外科醫師的一生"
TAGLINE = "一個關於選擇的遊戲——在一個不太給你選擇的行業裡。"


def check(font, text, label):
    """缺字要當場失敗。PIL 畫不出來的字會靜靜變成空白，產出的圖看起來像有字。"""
    missing = [c for c in text if c.strip() and font.getmask(c).getbbox() is None]
    if missing:
        raise SystemExit(f"{label} 缺字：{''.join(missing)}（換一面字體，見 FONT_BOLD/FONT_REGULAR）")


def tracked(draw, text, font, y, fill, spacing):
    """字距。標題在網站上是有 letter-spacing 的，PIL 不支援，自己逐字畫。"""
    widths = [draw.textlength(c, font=font) for c in text]
    total = sum(widths) + spacing * (len(text) - 1)
    x = (W - total) / 2
    for c, w in zip(text, widths):
        draw.text((x, y), c, font=font, fill=fill)
        x += w + spacing
    return total


def main():
    im = Image.open(SRC).convert("RGB")

    # 先裁成 1200×630 的比例再縮，直接 resize 會把開刀房壓扁
    want = W / H
    have = im.width / im.height
    if have > want:
        w = int(im.height * want)
        im = im.crop(((im.width - w) // 2, 0, (im.width - w) // 2 + w, im.height))
    else:
        h = int(im.width / want)
        im = im.crop((0, (im.height - h) // 2, im.width, (im.height - h) // 2 + h))
    im = im.resize((W, H), Image.Resampling.LANCZOS)

    # 壓暗，讓字站得出來。縮圖在時間軸上只有幾公分寬，對比不夠就什麼都看不到
    im = ImageEnhance.Brightness(im).enhance(0.42)
    dark = Image.new("RGB", (W, H), (14, 13, 11))
    im = Image.blend(im, dark, 0.35)

    draw = ImageDraw.Draw(im)
    title = ImageFont.truetype(FONT, 104, index=FONT_BOLD)
    tagline = ImageFont.truetype(FONT, 32, index=FONT_REGULAR)
    check(title, TITLE, "標題")
    check(tagline, TAGLINE, "副標")

    tracked(draw, TITLE, title, 226, GOLD, 18)

    # 標題底下那條線，跟站上的分隔線同一個角色。要留在標題的字腳下面
    draw.line([(W / 2 - 140, 386), (W / 2 + 140, 386)], fill=GOLD, width=1)

    tw = draw.textlength(TAGLINE, font=tagline)
    draw.text(((W - tw) / 2, 416), TAGLINE, font=tagline, fill=DIM)

    im.save(OUT, "JPEG", quality=88, optimize=True, progressive=True)
    print(f"{OUT}  {W}×{H}")


if __name__ == "__main__":
    main()
