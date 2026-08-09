# 美術素材與生成管線

風格定案：**S1 水墨淡彩**——水彩暈染加墨線、宣紙質地，克制的青綠與墨黑，單一朱砂點綴。

## 生成管線（已驗證）

```
gpt-image-2(純白底) → tools/cutout.py 去背 → 轉 WebP → assets/
```

```bash
# 立繪（直式）
tools/gen-art.sh out/p42.png 1024x1536 medium tools/prompts/p42.txt
python3 tools/cutout.py out/p42.png out/p42-cut.png 8

# 場景（橫式，不需去背）
tools/gen-art.sh out/s_or.png 1536x1024 medium tools/prompts/s_or.txt
```

API key 從專案根目錄 `.env` 的 `OPENAI_API_KEY` 讀取。`.env` 已在 `.gitignore` 內。

## 三個踩過的坑

**一、模型不是選最新的就好。**

| 模型          | 去背       | 人種與畫風                            |
| ------------- | ---------- | ------------------------------------- |
| gpt-image-2   | **不支援** | 台灣人臉、畫風最貼近 S1 ✅            |
| gpt-image-1   | 支援       | 偏炭筆速寫、西方臉、會長出無關物件 ❌ |
| gpt-image-1.5 | 支援       | 水彩乾淨但明顯西方臉、透明邊有白暈 ❌ |

支援去背的兩個模型都畫不出台灣人臉。所以改成「用 gpt-image-2 生在純白底，再自己去背」——
水墨本來就畫在白紙上，白底轉透明是這個媒材最自然的切法。

**二、去背容差必須小。** `cutout.py` 從畫布四邊做 BFS，只吃與邊界相連的白色，
所以口罩、識別證這些「人物身上的白」會保留。但白袍是接近白的，容差一大就會從
反鋸齒邊緣滲進去把整件袍子吃掉。實測：

| 容差 | 透明比例 | 結果            |
| ---- | -------- | --------------- |
| 8    | 35%      | 白袍完整 ✅     |
| 22   | 46%      | 白袍開始破洞    |
| 36   | 59%      | 白袍大半消失 ❌ |

**三、獨立生成不保證是同一個人。** 四個年齡段分開生成時，25 歲那張畫成了另一個
偏動漫的角色。解法是拿 42 歲那張當基準，改用 `/v1/images/edits` 帶參考圖生其他年齡：

```bash
curl https://api.openai.com/v1/images/edits \
  -H "Authorization: Bearer $KEY" \
  -F model=gpt-image-2 -F "image[]=@assets-src/p42.png" \
  -F size=1024x1536 -F quality=medium \
  -F prompt="Using the reference image as the definitive face of this character, paint the SAME man at age 25 ..."
```

## 已完成

**立繪 16 張**(720×1080 WebP，去背)——4 個年齡段 × 4 種表情

| 檔案                      | 年齡段    | 外觀                               |
| ------------------------- | --------- | ---------------------------------- |
| `assets/portrait-25.webp` | PGY       | 過大的白袍、聽診器、眼神還亮       |
| `assets/portrait-30.webp` | 住院醫師  | 皺的刷手服、黑眼圈、鬍渣           |
| `assets/portrait-42.webp` | 主治      | 刷手服＋識別證、鬢角灰白（基準圖） |
| `assets/portrait-60.webp` | 資深/退休 | 白髮、老花眼鏡、針織背心           |

**場景 4 張**(1400×933 WebP)

| 檔案                       | 場景                                     |
| -------------------------- | ---------------------------------------- |
| `assets/scene-or.webp`     | 開刀房（無影燈、空的手術台、監視器綠光） |
| `assets/scene-oncall.webp` | 值班室（上下舖、時鐘四點十五、天剛要亮） |
| `assets/scene-office.webp` | 醫局深夜（論文堆、桌燈與螢幕是唯一光源） |
| `assets/scene-home.webp`   | 家裡餐桌（菜罩著、留一盞燈、沒有人）     |

**表情差分**：每個年齡段除了平靜，另有 `weary`(疲憊)、`wry`(苦笑)、`lifted`(振奮),
檔名為 `assets/portrait-<age>-<mood>.webp`。全部以該年齡段自己的平靜版當參考圖，
用 `tools/gen-variant.sh` 走 edits 端點生成，所以是同一個人、同一套衣服，只換表情。

事件在 `events.js` 用 `mood:` 指定表情：疲憊給被工作輾過去的時刻（急刀、扎針、大量傷患、
孩子不認得你），苦笑給被制度荒謬到但決定不吵的時刻（點值、核刪、喬刀、升等被拒），
振奮給少數幾個真心高興的時刻（第一台主刀、求婚、生子、判決無罪）。

合計 3.2 MB / 24 個檔案（立繪 16、場景 8）。原始 PNG 約 66 MB，轉 WebP 後降到 5%。
圖是按需載入的（立繪換 src、場景換 background-image），所以開場只會下載一到兩張。

## 素材已齊

立繪 16 張、場景 8 張，遊戲用到的都有了。`tests/events-data.test.js` 會檢查
每個事件引用的場景與表情、每個結局引用的場景是否真的有檔案——引用不存在的圖不會讓
測試變紅，只會讓玩家看到破圖，所以擋在測試裡。

之後若要再加：UI 材質（宣紙底、印章紅底、捲軸木軸）目前是純 CSS 畫的，換成圖檔會更有質感。

## 成本

gpt-image-2 medium 每張輸出約 1500–1600 tokens,edits 帶參考圖約 3100 tokens。
實際單價請查 OpenAI 用量頁面——gpt-image-2 在我的知識截止之後發布，我無法確認它的定價。
