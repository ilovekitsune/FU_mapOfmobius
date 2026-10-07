# Fabula — 虛空航圖

粉黑哥德風格的公路劇世界地圖。故事始於 ManaSteam（MS）399 年：虛空海侵蝕艾倫布萊德下層，幻影旅團搭上飛空艇，在漂流大陸之間尋找世界的生路。其他國度保留為玩家共創空白。

## 開始使用

需要 Node.js 20 或更新版本。

```bash
npm install
npm run dev
```

開啟 Vite 顯示的本機網址即可預覽。正式建置：

```bash
npm run build
```

建置產物會輸出至 `dist/`。

## 功能

- 點選大陸、國家與空島，查看地點檔案。
- 以寬幅扭轉交錯的粉黑色帶呈現莫比烏斯之環，並可在地圖控制中切換顯示。
- 拖動時間線，檢視 MS 399 年的旅途事件與世界漂移狀態，並查看 ManaSteam 歷史年表。
- 在地點面板選擇大陸或空島作為出發地與目的地，依當日位置查看飛行與傳送航路；步行僅適用於符合交會條件的大陸；出發地選擇會保存在瀏覽器中。
- 調整地圖縮放，並關閉漂移動畫。

## GitHub Pages 部署

此專案已包含 GitHub Actions 部署流程。將專案推送到 GitHub 的 `main` 分支後，在 repository 的 **Settings → Pages** 將來源設為 **GitHub Actions**，即可自動建置並部署。`vite.config.ts` 使用相對資產路徑，適用於一般專案頁面與使用者頁面。

## 編輯世界資料

常用的世界內容集中在 [`src/data/world.json`](./src/data/world.json)，修改並儲存後，Vite 開發伺服器會自動重新載入：

- `continents`：大陸名稱、外觀形狀（`shape` 可用 `irregular`、`circle`、`square`、`rectangle`）、寬高尺寸、`orbitAngle` 初始軌道角度與交會日。圓形與正方形使用寬高較小值作為直徑或邊長；大陸位置由共用軌道及旅行日計算，不再使用固定地圖座標；`meetings[].mode` 使用 `inner`（環內上下交會）或 `edge`（大陸接觸）。
- `src/data/settingCards.json`：首頁世界設定與故事開場卡片。每個項目包含眉標 `eyebrow`、標題 `title` 和段落陣列 `paragraphs`；段落可設 `"emphasis": true` 套用強調樣式，卡片可選填 `className`。
- `countries`：國家資料與面板細節。`continentId` 必須對應大陸的 `id`，大陸的 `countryIds` 也要填入該國家的 `id`。
- `islands`：空島初始航線位置、漂移狀態與地下城。`movement` 使用 `drifting` 或 `anchored`；漂移空島會沿共用莫比烏斯環軌道移動，固定空島則停留在 JSON 座標。
- `events`：旅行日事件，`day` 需落在 `settings.timeline.startDay`–`endDay` 範圍內才會出現在時間線；`type` 使用 `story`、`meeting` 或 `warning`；`locationId` 對應大陸、國家或空島的 `id`。
- `history`：ManaSteam 歷史年表。
- `settings.timeline`：時間線起訖日、步進、刻度、標題文案、事件類型名稱與圖示。刻度會自動包含起訖日和範圍內的事件日。
- `settings.orbit`：大陸共用軌道的橢圓中心、長短半徑與運行方向；`continents[].orbitAngle` 是每座大陸在第 0 日的軌道角度。`settings.cycleDays` 決定環行一圈所需天數。
- `settings.continentDrift`、`islandDrift`：大陸交會前的靠近天數、交會間距，以及漂移空島環行一圈所需日數（目前每 4 日一圈）。交會間距比例 `0.5` 代表兩塊大陸邊緣相接；要讓交會生效，另一座大陸必須在相同週期日設定相同模式。
- `settings.travel`：飛行／步行速度以地圖 SVG 座標單位（1200 × 760 畫布）每日時／每小時表示；航程以大陸外緣間的估算距離計算，並向上取整至整日／整小時，再套用最短旅程時間。
- `settings.initialDay`、`initialSelectedId`：頁面開啟時的旅行日和預選地點。

請保留各物件的欄位名稱與資料型別，並確保所有關聯 ID 對得上。資料型別與應用程式匯出集中在 `src/data/types.ts` 與 `src/data/index.ts`；一般內容更新只需編輯 JSON。

## 專案結構

```text
public/assets/   靜態地圖、國家、空島與音樂素材
src/components/  地圖、地點面板、時間線與控制元件
src/data/world.json  可直接編輯的世界、國家、空島、事件與歷史資料
src/data/settingCards.json 首頁世界設定卡片內容
src/data/types.ts    世界資料型別
src/data/index.ts    應用程式資料匯出
src/systems/     莫比烏斯環、空島漂移與世界狀態
src/styles/      哥德粉黑主題
```

大陸的初始環行位置與世界內容可直接從 `src/data/world.json` 編輯。
