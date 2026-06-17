<img width="1088" height="362" alt="image" src="https://github.com/user-attachments/assets/725fa628-7af8-4aaf-aae8-0950599abad8" />

# Kumiko Font Editor

[English](README.md) | 繁體中文

**一個全新的、以瀏覽器為核心的字體編輯軟體——目前專注於作為以 GitHub 為核心的 CJK 補字工具。**

**線上試用 → [kumiko.chiaki.ch](https://kumiko.chiaki.ch)**

Kumiko 是一套從頭打造、零安裝、完全在瀏覽器裡運行的字體編輯器。目前它專注於一件事：直接對著 GitHub repo 補齊缺少的 CJK 字。貢獻者從 repo 載入 UFO 專案、在瀏覽器裡編輯 glyph，再以 pull request 推回去——不需要本地工具鏈、不需要跑後端、不需要設定環境。

## 為什麼做 Kumiko？

雖然已有 [Fontra](https://github.com/googlefonts/fontra) 這類優秀工具，Kumiko 專注於解決開源 CJK 字體開發特有的摩擦點。我們透過四個核心原則達成：

1. **真正的零安裝體驗**：不同於仍需在本地架設後端伺服器的現有 web 字體工具，Kumiko 是純前端應用。貢獻者只要開啟瀏覽器、用 GitHub 登入，就能馬上開始設計。零摩擦意味著更多社群貢獻。
2. **現代且可持續的架構**：完全以 React、TypeScript、Vite 建構。Kumiko 元件驅動的架構讓它高度可客製，也對前端開發者極為友善、容易參與。
3. **IDS 驅動的組字工作流**：CJK 字體動輒數萬個 glyph。Kumiko 內建 Ideographic Description Characters（IDS）拆字引擎，讓設計者能透過可重用的 component 快速組字、補齊缺字。
4. **量化品質建議**：為了在去中心化的開源環境裡維持專業水準，Kumiko 扮演「字體排印的 Linter」，把即時灰階測試與統計式設計建議直接整合進編輯畫布。（建議引擎目前為初版，仍在持續精進。）

## 功能

- **從任何地方開啟**：匯入本地 `.ufo` 專案資料夾，或直接從 GitHub repo 載入 UFO 專案（透過 Cloudflare Pages Functions 代理 archive 下載）。
- **GitHub 原生工作流**：用 GitHub OAuth 登入、檢查 fork、列出 branch、推送 commit，並跳轉到 compare 頁建立 pull request。
- **component-aware 字形編輯**：在畫布上編輯路徑、節點與 metrics，並以 IDS 引擎用可重用 component 組出 CJK 字形。
- **內建品質檢查**：即時灰階預覽與統計式設計洞察，直接呈現在編輯器內。
- **離線友善草稿**：工作成果保存在瀏覽器 IndexedDB，方便日後重新開啟。

## 開發路線

Kumiko 近期聚焦在**協作補字工作流**，貢獻者流程與體驗優先，編輯器完整度次之。重點：

- 穩固的 GitHub 同步（per-glyph 衝突解決；以 server-side session storage 取代 signed cookie）。
- 錨定 UFO 模型（`groups.plist` / `kerning.plist`）的 kerning，匯出為 FEA。
- 擴充更多 UFO metadata 與非 glyph 檔案的 GitHub 回寫。
- 嘗試解決 OpenType features

完整方向與已議定路線見 [docs/product-direction.md](docs/product-direction.md)。

## 文件

- **[CONTRIBUTING.md](CONTRIBUTING.md)**（英文）— 如何安裝、在本地執行、設定環境變數與提交變更。
- **[docs/architecture.md](docs/architecture.md)**（英文）— 技術選型、狀態管理策略與專案結構。
- **[docs/](docs/README.md)** — 設計決策的開發者筆記（CJK 組字策略、品質檢查、glyph 命名、variable font 等）。

### 與 Fontra 的關係

Kumiko 參考了許多 [Fontra](https://github.com/googlefonts/fontra) 的設計，並逐檔移植部分純演算法模組到 `src/font/fontra-ported/`。但兩者技術棧分歧到無法直接 fork：Fontra 以 web UI 搭配 Python WebSocket 後端，Kumiko 則盡可能維持純前端。跟進策略、目前對齊的 Fontra baseline SHA 與 re-sync 流程見 [docs/fontra-parity.md](docs/fontra-parity.md)。

## 授權

[MIT](LICENSE) © Chiaki.C。第三方資料與字型授權列於 [CREDITS.md](CREDITS.md)。
