# 素材生成計畫

## 第一步:風格測試(3 張,先決定長相再量產)

同一個主體「42 歲台灣外科主治醫師,刷手服,疲憊」,用三種風格各生一張,你挑一種。

| #   | 風格                   | prompt(英文,gpt-image-1 對英文較穩)                                                                                                                                                                                                                                                                                                                                      |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1  | 水墨手繪(最接近活俠傳) | `Traditional Chinese ink-wash painting portrait, half-body, a 42-year-old Taiwanese male surgeon in teal scrub top and surgical cap, mask pulled down around neck, exhausted expression with dark circles, visible brush strokes and ink bleed on rice paper texture, muted teal and warm grey palette, hand-painted game character art, plain dark background, no text` |
| S2  | 厚塗寫實(較有重量感)   | `Digital painted half-body portrait, semi-realistic painterly style with visible brush texture, a 42-year-old Taiwanese male surgeon in teal scrubs and surgical cap, mask around neck, tired eyes, dramatic overhead surgical lighting, desaturated cool palette, video game character art, dark plain background, no text`                                             |
| S3  | 扁平向量(最省、最一致) | `Flat vector illustration, half-body portrait of a 42-year-old Taiwanese male surgeon in teal scrubs and surgical cap, simplified geometric shapes, limited 5-color palette of teal slate cream and muted red, clean editorial style, flat dark background, no text, no gradients`                                                                                       |

生成指令(key 從檔案讀,不會印出來):

```bash
OPENAI_API_KEY=$(cat ~/.config/openai-key) \
  curl -s https://api.openai.com/v1/images/generations \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"model":"gpt-image-1","prompt":"...","size":"1024x1536","quality":"medium","n":1}'
```

用 curl 不用 CLI 的原因:CLI 只吃 `-m -p -n -s`,沒有 `background`、`quality` 參數。
立繪需要 `"background":"transparent"` 才能去背疊在場景上,只有直接打 API 拿得到。

## 第二步:量產清單(風格定案後)

**立繪 12 張** — 4 個年齡段 × 3 種表情,透明背景,1024×1536

| 年齡段      | 外觀要點                 | 表情                       |
| ----------- | ------------------------ | -------------------------- |
| 25 PGY      | 白袍過大、瀏海、眼神還亮 | 緊張 / 專注 / 強笑         |
| 30 住院醫師 | 刷手服、明顯黑眼圈、鬍渣 | 疲憊 / 麻木 / 短暫的成就感 |
| 42 主治     | 刷手服＋識別證、鬢角灰白 | 沉穩 / 忍耐 / 苦笑         |
| 60 資深     | 白髮、老花眼鏡、白袍     | 平靜 / 疏離 / 和解         |

**場景 8 張** — 1536×1024,不透明

1. 開刀房(無影燈、手術台、器械台)
2. 值班室(上下舖、沒開燈、窗外天正在亮)
3. 醫局深夜(螢幕唯一光源、論文與泡麵)
4. 門診間(排隊號碼機、下午四點的光)
5. 醫院走廊(清晨五點、空無一人)
6. 法庭(醫糾、木質長桌、冷光)
7. 醫美診所(落地窗、明亮、與前面所有場景形成刺眼對比)
8. 家裡餐桌(飯菜蓋著、留了一盞燈、沒有人)

**UI 素材 4 張** — 宣紙材質、印章紅底、木軸捲軸兩端、狀態列底紋

## 成本估算

gpt-image-1 medium quality:1024×1536 約 US$0.04/張,1536×1024 同價。
24 張 ≈ **US$1** 左右。風格測試 3 張 ≈ US$0.12。這比我原本估的「幾美元」還低。

## 你要做的事(不要把 key 貼進對話)

用你自己的編輯器(不要透過這個 session,免得 key 進到對話紀錄):

1. 建立檔案 `~/.config/openai-key`,內容只有那一行 key,不要有引號或換行以外的東西
2. `chmod 600 ~/.config/openai-key`
3. 回來跟我說一聲

我會用 `$(cat ~/.config/openai-key)` 帶入,全程不印出內容。
