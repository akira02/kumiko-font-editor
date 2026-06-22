# Variable Font 支援：設計與實作計畫

本文件記錄 Kumiko 支援 variable font（多 master 插值、補不同字重）的設計與分階段實作計畫，作為日後動工的起點。產品脈絡見 [產品定位與開發路線](product-direction.md)，跟進 fontra 的整體策略見 [與 fontra 的相容與跟進策略](fontra-parity.md)。

> 前置工程：本文件預設 `FontData.sources` 已填妥多個 master。「這些 master 從哪個檔案格式來、如何進入資料模型、如何在 UI 切換」見 [多 Master 支援 Roadmap Spec](multi-master.md)。

## 範圍

目標是讓同一個 glyph 能在多個 master（source）之間插值，於設計空間任一位置預覽與編輯，最終匯出 instance。補字工作流的延伸需求是「補一個字重後，能在其他字重看到對應結果」。

不在初期範圍：GPOS/GSUB 的變體、HVAR/MVAR 等二進位最佳化（交給匯出階段的 fontTools pipeline）。

## 現況盤點

### 已就緒

資料模型（`src/store/types.ts`）已是仿 fontra 的結構：

- `FontData.axes: FontAxes` —— `FontAxis`（`name` / `tag` / `minValue` / `defaultValue` / `maxValue` / `mapping`）與 `CrossAxisMapping`。
- `FontData.sources: Record<string, FontSource>` —— 每個 source 有 `location: Record<string, number>`（設計空間座標）。
- `GlyphData.layers: Record<string, GlyphLayerData>`，`GlyphLayerData.associatedMasterId` 連到 source。
- store 已有 `activeMasterId` / `editLocation`，master 切換時會把 `editLocation` 吸附到該 source 的 location。
- `.designspace` + 多 `.ufo` 與 `.glyphs` / `.glyphspackage` 匯入已能建立多 master layers，並可用既有 master UI 在離散 source 間切換。
- 插值演算法已自 fontra 移植至 `src/font/fontra-ported/`：`VariationModel`、`DiscreteVariationModel`、`normalizeLocation` / `normalizeLocationSparse`、`piecewiseLinearMap`、`mapForward` / `mapBackward`、`makeDefaultLocation`、`makeSparseNormalizedLocation`、`supportScalar`。這些與 `fontTools.varLib.models` 行為一致，因此插值結果會與 fontra / fontTools 逐點相符。

### 缺口

- **沒有 glyph 插值控制器**：目前沒有「給定 glyph 的各 layer + 字體 axes/sources，於任意 location 算出一個 static glyph」的程式。對應 fontra 的 `VariableGlyphController`（`src-js/fontra-core/src/glyph-controller.js`）。
- **`editLocation` 尚未變成任意 location 工作流**：目前只隨 master 切換吸附到既有 source，sceneModel / canvas 尚未支援「位於 master 之間」的唯讀 instance。
- **沒有插值渲染**：sceneView 一律畫 active layer，不會畫插值結果。
- **沒有相容性檢查**：插值要求各 layer 的輪廓數、點數、點型別一致；目前無檢查。
- **沒有完整設計空間導覽 UI**：已有離散 source / master 切換；尚無軸 slider、任意 location preview、source map 視覺化。對應 fontra `panel-designspace-navigation.js`。
- **離散軸未表達**：`FontAxis` 沒有 `values` 欄位，無法描述離散軸（如 italic 0/1）。`DiscreteVariationModel` 需要此欄位；純連續軸（weight/width）則不受影響。

## 架構設計

### 插值資料流

```
使用者設定 location（設計空間，sparse）
  └─(套用 avar) mapForward(location, axes)
       └─ DiscreteVariationModel(sourceLocations, axes)
            ├─ getDeltas(sourceValues)         // sourceValues = 各 layer 的可插值表示
            └─ interpolateFromDeltas(location) // → instance（同樣的可插值表示）
                 └─ 重建 PathData / metrics 供 sceneView 渲染
```

關鍵是「可插值表示（interpolatable value）」。`var-funcs`（`addItemwise` / `subItemwise` / `mulScalar`）可對 number、array、object 遞迴運算，因此一個 layer 可表示為：

- 輪廓座標：攤平成數值陣列（與 `src/font/VarPackedPath.ts` 的 `coordinates` 同概念）。各 layer 必須等長且點型別一致。
- metrics：`{ lsb, width }` 等數值物件。
- component transform、anchor 座標：數值物件。

插值後把數值陣列寫回 `PathData`（沿用同一份點 id / 型別，只換座標）。

### 模組落點（建議）

- `src/font/glyphInterpolation.ts`（新）：純函式層，輸入 glyph layers + axes + sources，建立 `DiscreteVariationModel`，輸出某 location 的 static instance。對應 fontra `glyph-controller.js`，**不依賴 React/store**，可單元測試。
- `src/font/glyphCompatibility.ts`（新）：相容性檢查（輪廓數 / 點數 / 點型別 / component 結構），回報不相容處。
- store：新增「目前 location」狀態與 setter；sceneModel 暴露「目前要渲染的 instance」。
- sceneView：非 master 位置時渲染插值 instance（唯讀）；master 位置時沿用既有 active layer 編輯路徑。

### 與 avar / cross-axis 的關係

- `FontAxis.mapping`（avar 1）：在進入 model 前以 `mapForward` 套用。
- `CrossAxisMapping`（avar 2）：較複雜，對應 fontra `cross-axis-mapper.js`，列為後期。

## 分階段實作

### Phase 0 — 相容性與資料對應

- 實作 `glyphCompatibility.ts`，在 glyph 有多 layer 時檢查相容性，於 UI 標示不相容。
- 確認 layer → source location 的對應（`associatedMasterId` → `FontSource.location`）。
- 決定座標攤平 / 還原的單一函式（建議重用 / 對齊 `VarPackedPath`）。

### Phase 1 — 唯讀插值預覽

- 擴充 `editLocation` 的設定 action，允許 UI 設到非 master location。
- 實作 `glyphInterpolation.ts`，於 location 算出 instance。
- sceneView 在非 master 位置渲染 instance（唯讀），master 位置維持現狀。
- 最小 UI：每軸一個 slider（先不做 avar）。

### Phase 2 — 在 master 編輯與切換

- 依目前 location 對應/吸附到最近 master，切換 active layer 進行編輯（沿用既有編輯路徑）。
- 離散 source / master 的新增、刪除、命名管理已由多 master 工程提供；本階段補的是 slider location 與 master 編輯模式之間的清楚切換。

### Phase 3 — 跨 source 連動編輯

- 對應 fontra `scene-controller.editLayersAndRecordChanges`：在一個 master 編輯時，可選擇將變更依規則套用到其他 source。
- 套用 `FontAxis.mapping`（avar）至插值前的位置轉換。

### Phase 4 — Instance 匯出

- 以 `FontData.exportInstances`（已存在）於指定 location 烘出 static instance，餵現有匯出 pipeline。

## 待決策

- **離散軸**：是否在 `FontAxis` 加 `values` 以支援 italic 等離散軸；初期可只支援連續軸。
- **座標表示**：直接用 `VarPackedPath` 作為插值與渲染的共同表示，或維持 `PathData` 並另建攤平工具。建議前者以減少轉換。
- **不相容 layer 的處理**：阻擋插值並提示，或盡力插值（`DiscreteVariationModel` 內含 `BrokenVariationModel` 退化路徑，回退到最近 source）。
- **編輯時機**：是否允許在非 master 位置直接編輯（fontra 透過 delta 反推，複雜度高），或一律導引使用者回到 master 編輯。建議初期採後者。

## fontra 對應檔案（移植 / 參考來源）

| 主題                 | fontra 檔案                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| 插值模型（已移植）   | `src-js/fontra-core/src/var-model.js`、`discrete-variation-model.js`                                |
| glyph 插值控制器     | `src-js/fontra-core/src/glyph-controller.js`（`VariableGlyphController` / `StaticGlyphController`） |
| 多 source 同步編輯   | `src-js/views-editor/src/scene-controller.js`（`editLayersAndRecordChanges`）                       |
| cross-axis（avar 2） | `src-js/fontra-core/src/cross-axis-mapper.js`                                                       |
| 設計空間導覽 UI      | `src-js/views-editor/src/panel-designspace-navigation.js`                                           |
| 資料模型定義         | `src-js/fontra-core/src/classes.json`（由 Python `classes.py` 產生；新欄位的權威來源）              |
