# 外科醫師的一生

一個輕量的回合制人生選擇器遊戲。主角從高中生開始,走完(或走不完)
一個台灣外科醫師的一生。寫實,苦中帶淚。

## 玩法

- 序章(16-24 歲):你沒有選擇。18 歲的聯考,無論你選什麼理由,都會進醫學系。
- 本篇(25 歲起):每年一回合,把 12 個月分配到臨床/教學/研究/家庭/個人五軸。
- 天賦決定成長斜率;能力不一定換得到錢;沒有真正的完美結局。

## 開發

    npm install
    npm test          # Vitest
    npm run lint      # ESLint
    python3 -m http.server 8080   # 本機遊玩:開 http://localhost:8080

零建置:純 Vanilla JS ES modules。架構決策見 docs/adr/。

## 部署(GitHub Pages)

Repo Settings → Pages → Source 選 `main` branch 根目錄即可,無 build step。
