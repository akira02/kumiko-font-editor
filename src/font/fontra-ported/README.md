# fontra-ported

跟 UI 框架無關的純演算法模組，逐檔自 [fontra](https://github.com/googlefonts/fontra) 移植而來。整體相容策略與 baseline SHA 見 [docs/fontra-parity.md](../../../docs/fontra-parity.md)。

## 規則

- 每個檔頂部以 `// ported from fontra <sha>` 標註來源檔與對齊的 commit。
- 檔名對齊 fontra，方便 `git diff` 跟進上游變更。
- 維持純函式：不依賴 React、Zustand、canvas 或任何 Kumiko 特定狀態。
- 因為是逐字移植的動態 JS，本資料夾在 `eslint.config.js` 關閉了 `@typescript-eslint/no-explicit-any` 與 `prefer-const`；新檔請放在這裡，不要把這種寬鬆規則擴散到其他目錄。
- 與上游的刻意差異（例如省略未使用的 helper）寫在檔頂註解，並登記在 parity 文件。

## 內容

- `fit-cubic.ts` — 最小平方 cubic Bézier 擬合（Schneider 1990）與 Newton-Raphson 最近點求解。依賴 `bezier-js`（與 fontra 相同）。
- `var-model.ts` — `VariationModel`，`fontTools.varLib.models` 的移植；variable font 軸插值、delta 權重、location 正規化。
- `discrete-variation-model.ts` — 支援離散軸（如 italic）的變體模型，建立在 `var-model` 之上。
- `var-funcs.ts` / `vector.ts` / `set-ops.ts` / `errors.ts` / `utils.ts` — 上述模組的相依。
- `bezier-js.d.ts` — `bezier-js` 的最小 ambient 型別宣告（套件未內建型別）。
- `fontra-ported.test.ts` — 數值回歸測試，re-sync 後務必通過。

用同一套演算法插值，代表 Kumiko 對 variable font 算出的中間 master 結果會與 fontra / fontTools 逐點一致。
