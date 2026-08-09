# 0001. 採用零建置 Vanilla JS 架構

## Status

Accepted

## Context

《外科醫師的一生》是輕量單頁文字遊戲,核心複雜度在事件內容而非程式架構。
候選方案:(A) 純 Vanilla JS ES modules 零建置;(B) Vite + TypeScript。

## Decision

採用方案 A。engine 純邏輯與 DOM 分離,以 Vitest 直接對 ES module 做單元測試;
部署為 GitHub Pages 靜態檔案,無 build step。

## Consequences

- 優點:零工具鏈負擔、clone 即玩、部署即複製檔案。
- 缺點:沒有 TypeScript 型別保護,事件資料欄位錯誤要靠資料完整性測試把關。
- 缺點:無 bundler 最佳化(minify/tree-shaking);以本遊戲的體量可接受。
- 約束:所有隨機性必須經由可播種 RNG,否則 engine 不可測。
