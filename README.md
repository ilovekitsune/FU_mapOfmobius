# Fabula — 虛空航圖

粉黑哥德風格的跑團用公路劇世界地圖。故事始於 ManaSteam（MS）399 年。

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

- 點選地圖上的大陸、國家或空島，查看地點、國家與地下城檔案。
- 以橢圓軌跡呈現莫比烏斯環；可切換環帶顯示、地圖縮放與漂移動畫。
- 透過時間線瀏覽旅行日、世界事件、大陸位置和交會狀態；年表及首頁設定卡片也可編輯。
- 在航路推演中選擇大陸或空島作為出發地／目的地，查看飛行與傳送選項。步行只在符合條件的大陸接觸時可用。出發地會保存在目前瀏覽器。
- 可設定頁面顯示比例（80%–150%）；頁面比例也會保存在目前瀏覽器。

## GitHub Pages 部署

此專案已包含 [GitHub Actions 部署流程](./.github/workflows/deploy.yml)，推送到 `main` 分支時會自動建置並部署。

1. 確認專案已推送至 GitHub repository 的 `main` 分支。
2. 在 GitHub repository 開啟 **Settings → Pages**，將 **Build and deployment → Source** 設為 **GitHub Actions**。
3. 開啟 **Actions** 分頁，確認 **Deploy to GitHub Pages** 工作流程完成且為綠色成功狀態。
4. 回到 **Settings → Pages**，使用頁面上的網址開啟網站。一般專案網址格式為 `https://<帳號或組織>.github.io/<repository>/`。

之後每次將更新推送到 `main`，Actions 都會重新建置並部署。也可在 **Actions → Deploy to GitHub Pages → Run workflow** 手動部署。若部署失敗，先在 Actions 開啟失敗的工作流程，查看 `Build site` 或 `Deploy to GitHub Pages` 工作的錯誤訊息。建置可在本機先用 `npm install`、`npm run build` 檢查。Vite 使用相對資產路徑，可用於 GitHub Pages 專案頁面。

## 編輯世界資料

資料檔位於 `src/data/`。修改並儲存 JSON 後，Vite 開發伺服器會自動重新載入；正式發布則將變更推送至 GitHub 的 `main` 分支。JSON 欄位名稱、大小寫和值需符合以下格式。

### 世界與系統參數：`world.json`

檔案：[`src/data/world.json`](./src/data/world.json)。世界內容包含 `settings`、`continents`、`countries`、`islands`、`events` 和 `history`。

#### `settings`

| 欄位 | 用途 |
| --- | --- |
| `initialDay` | 頁面載入時的初始旅行日，需在時間線範圍內。 |
| `initialSelectedId` | 初始選取地點的 ID，可使用國家、大陸或空島 ID。 |
| `cycleDays` | 大陸沿橢圓軌道環行一圈所需日數。 |
| `orbit.centerX`, `centerY` | 軌道中心在地圖 SVG 上的位置。 |
| `orbit.radiusX`, `radiusY` | 軌道橢圓的水平與垂直半徑。 |
| `orbit.direction` | 運行方向：`1` 或 `-1`。 |
| `timeline.startDay`, `endDay` | 時間線起訖日。 |
| `timeline.step` | 前後日按鈕及拖曳時間線的日期步進。 |
| `timeline.marks` | 時間線顯示的刻度日；範圍端點和事件日也會自動加入。 |
| `timeline.yearLabel`, `heading`, `dayLabel` | 年份標籤、時間線標題及日數單位文案。 |
| 其他 `timeline` 欄位 | 重設／前後日按鈕、無事件狀態、事件種類名稱／圖示與無障礙標籤文字。 |
| `continentDrift.meetingApproachDays` | 大陸交會前開始靠近的天數。設為 `0` 可關閉靠近效果。 |
| `continentDrift.innerMeetingGapRatio` | 環內上下交會時的分隔距離比例。 |
| `continentDrift.edgeMeetingGapRatio` | 大陸接觸時的邊緣間距比例；`0.5` 約為邊緣相接。 |
| `islandDrift.daysPerCycle` | 漂移空島沿橢圓環帶跑完一圈的天數；數字越小移動越快。目前為 4 日。 |
| `travel.flightDistancePerDay` | 飛行每日可行經的地圖距離單位。 |
| `travel.minimumFlightDays` | 飛行時間下限，單位為日。 |
| `travel.walkDistancePerHour` | 步行每小時可行經的地圖距離單位。 |
| `travel.minimumWalkHours` | 步行時間下限，單位為小時。 |
| `travel.innerMeetingFlightDays` | 大陸在同日配對為 `inner` 交會時，使用的飛行日數。 |
| 其他 `travel` 欄位 | 飛行、傳送、步行、瞬間及不可用狀態的顯示文字。 |

地圖為 `1200 × 760` SVG 畫布；軌道座標、半徑與航行速度均使用這個畫布的座標單位。航程依當日兩地位置和外緣間距估算，所需日／小時向上取整後再套用最短時間。傳送法陣為瞬間移動。步行只提供給同日互相配對為 `edge` 的兩座大陸；空島與大陸或空島之間可計算飛行／傳送航程。

#### `continents`

每座大陸需有唯一 `id`，並設定：

- `name`、`subtitle`、`description`：地圖與地點面板顯示內容。
- `shape`：外形，使用以下英文值之一：`irregular`、`circle`、`square`、`rectangle`。值區分大小寫；不要使用中文翻譯。
- `width`、`height`：外形尺寸，單位為 SVG 畫布座標。圓形與正方形以較小值作為直徑或邊長。
- `rotation`：目前保留的資料欄位；大陸平面圖形目前不會依此角度旋轉。
- `orbitAngle`：旅行日 0 時在軌道上的初始角度，單位為度。
- `countryIds`：此大陸所屬國家的 ID；需與 `countries[].continentId` 相互對應。
- `meetings`：交會日清單，每筆包含 `day` 和 `mode`。`mode` 為 `inner`（環內上下交會）或 `edge`（大陸接觸）。要形成配對，另一座大陸必須在相同週期日設定相同模式。

大陸的位置由軌道參數、`orbitAngle`、旅行日與交會設定推算，不使用固定座標。

#### `countries`、`islands`、`events`、`history`

- `countries`：國家檔案。`continentId` 必須對應大陸 ID；`details` 是由 `label`、`value` 組成的面板資料陣列。
- `islands`：空島檔案。`x`、`y` 是初始位置；`size` 是地圖尺寸；`movement` 使用 `drifting` 或 `anchored`。漂移空島會從初始座標投影至環帶，依 `islandDrift.daysPerCycle` 沿環帶高速移動；固定空島則停留於 JSON 座標。`dungeon` 為選填欄位，`phase` 目前不參與位置計算。
- `events`：旅行事件。`day` 是事件旅行日；`type` 使用 `story`、`meeting`、`warning`；`locationId` 可選填，填入時需對應國家、大陸或空島 ID。超出時間線範圍的事件不會出現在時間線。
- `history`：ManaSteam 歷史年表，每筆包含 `date`、`title`、`description`。

### 首頁設定卡片：`settingCards.json`

檔案：[`src/data/settingCards.json`](./src/data/settingCards.json)。陣列中的每筆資料會動態生成一張首頁卡片：

- `eyebrow`：卡片上方眉標。
- `title`：卡片標題。
- `paragraphs`：段落陣列，每筆使用 `text`；可選填 `"emphasis": true` 套用強調文字樣式。
- `className`：選填的樣式類別，可使用專案 CSS 已定義的卡片類別，例如 `prologue-card`。

卡片顯示順序就是 JSON 陣列順序；可新增、刪除或移動陣列項目以調整首頁內容。

### 瀏覽器個人設定

網頁大小（80%–150%）和航路推演出發地會保存在目前瀏覽器的 `localStorage`，不屬於 JSON 世界資料，也不會同步到其他裝置。出發地可在航路推演面板中選擇大陸或空島。

請保留 JSON 格式有效、物件欄位名稱與型別正確，並確保所有關聯 ID 對得上。資料型別及匯出集中在 [`src/data/types.ts`](./src/data/types.ts) 與 [`src/data/index.ts`](./src/data/index.ts)。

## 專案結構

```text
public/assets/             靜態地圖、國家、空島與音樂素材
src/components/            地圖、地點面板、時間線與控制元件
src/data/world.json        世界、國家、空島、事件、年表與系統參數
src/data/settingCards.json 首頁世界設定卡片內容
src/data/types.ts          世界資料型別
src/data/index.ts          應用程式資料匯出
src/systems/               莫比烏斯環、空島漂移與世界狀態
src/styles/                哥德粉黑主題
```
