import { CountryPanel } from "./components/CountryPanel";
import { FateClockMonitor } from "./components/FateClockMonitor";
import { MapControls } from "./components/MapControls";
import { PeopleMonitor } from "./components/PeopleMonitor";
import { Timeline } from "./components/Timeline";
import { WorldMap } from "./components/WorldMap";
import { events, history, settingCards, settings } from "./data";
import { WorldState } from "./systems/WorldState";
import "./styles/gothic.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("App root element #app was not found.");

root.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="Fabula 世界地圖首頁">
        <span class="brand-mark">✦</span>
        <span><span class="brand-name">kipat barzel</span><span class="brand-subtitle">SYSTEM</span></span>
      </a>
      <nav class="page-navigation" aria-label="主要頁面">
        <button class="page-nav-button is-active" type="button" data-view-target="map" aria-controls="map-page" aria-pressed="true">星圖</button>
        <button class="page-nav-button" type="button" data-view-target="log" aria-controls="world-log-page" aria-pressed="false">世界觀測LOG紀錄</button>
        <button class="page-nav-button" type="button" data-view-target="people" aria-controls="people-page" aria-pressed="false">命定之人監控</button>
        <button class="page-nav-button" type="button" data-view-target="fate-clock" aria-controls="fate-clock-page" aria-pressed="false">命刻監測系統</button>
      </nav>
      <div class="topbar-right">
       <span class="world-status system-status"><i class="status-dot"></i>系統狀態：正常</span>
       <span class="world-status"><i class="status-dot"></i>女武神狀態 :失聯        </span>
        <span class="world-status"><i class="status-dot"></i>世界狀態 :未知        </span>
        <label class="page-zoom-control" for="page-zoom">
          <span>頁面大小</span>
          <input id="page-zoom" type="range" min="80" max="150" step="10" value="150" aria-label="調整整個網頁大小" />
          <output id="page-zoom-value" for="page-zoom">150%</output>
        </label>
      </div>
    </header>
    <main class="main-content">
      <section class="page-view" id="map-page" data-page-view="map" aria-label="世界地圖首頁">
        <div class="intro-row">
          <div><span class="eyebrow">MAIN SYSTEM · ${settings.timeline.yearLabel}</span><h1>莫比烏斯<span>星圖</span></h1></div>
          <p class="intro-note">大陸循著莫比烏斯之環漂流。每一次交會，<br />都是相逢，也是告別。</p>
        </div>
        <section class="timeline-card" id="chronicle" aria-label="世界時間線"></section>
        <section class="map-layout" aria-label="世界地圖與航線推測">
          <div class="map-card">
            <div class="map-host"></div>
            <div class="map-control-host"></div>
          </div>
          <aside class="travel-panel" aria-label="航線推測"></aside>
        </section>
        <dialog class="world-map-dialog" aria-labelledby="world-map-dialog-title">
          <div class="world-map-dialog-heading">
            <div><span class="eyebrow">STARFIELD · FULL VIEW</span><h2 id="world-map-dialog-title">星域實景</h2></div>
            <form method="dialog"><button class="world-map-dialog-close" aria-label="關閉星域實景">×</button></form>
          </div>
          <div class="map-card world-map-dialog-card">
            <div class="world-map-dialog-host"></div>
          </div>
        </dialog>
        <section class="country-panel" aria-label="國家與大陸介紹" aria-live="polite"></section>
      </section>
      <section class="page-view" id="world-log-page" data-page-view="log" aria-label="世界觀測紀錄" hidden>
        <div class="intro-row">
          <div><span class="eyebrow">WORLD OBSERVATION · ${settings.timeline.yearLabel}</span><h1>世界觀測<span>LOG紀錄</span></h1></div>
          <p class="intro-note">世界的變遷、留下的記憶，<br />以及仍待解讀的觀測紀錄。</p>
        </div>
        
        <section class="world-setting" aria-label="世界設定與故事開場">
          ${settingCards.map((card) => `
            <article class="setting-card ${card.className ?? ""}">
              <span class="eyebrow">${card.eyebrow}</span>
              <h2>${card.title}</h2>
              ${card.paragraphs.map((paragraph) => `<p${paragraph.emphasis ? ' class="setting-emphasis"' : ""}>${paragraph.text}</p>`).join("")}
            </article>
          `).join("")}
        </section>
        <section class="history-card" aria-label="ManaSteam 歷史年表">
          <div class="history-heading"><span class="eyebrow">舊世界留下的傷痕</span><h2>ManaSteam 編年史</h2></div>
          <div class="history-list">
            ${history.map((event) => `
              <article class="history-entry">
                <span class="history-date">${event.date}</span>
                <div><h3>${event.title}</h3><p>${event.description}</p></div>
              </article>
            `).join("")}
          </div>
        </section>
      </section>
      <section class="page-view" id="people-page" data-page-view="people" aria-label="命定之人監控" hidden>
        <div class="intro-row">
          <div><span class="eyebrow">FATED PERSONNEL · CHARACTER INDEX</span><h1>命定之人<span>監控</span></h1></div>
          <p class="intro-note">記錄旅人與世界人物的身分、命定關係，<br />以及旅途中持續變化的狀態。</p>
        </div>
        <section class="people-intro-grid" aria-label="玩家角色與 NPC 介紹"></section>
      </section>
      <section class="page-view" id="fate-clock-page" data-page-view="fate-clock" aria-label="命刻監測系統" hidden>
        <div class="intro-row">
          <div><span class="eyebrow">FATE CLOCK · SYSTEM MONITOR</span><h1>命刻<span>監測系統</span></h1></div>
          <p class="intro-note">刻度代表各命刻可承受的總步數；<br />GM模式開啟時可調整進度、狀態與刪除命刻。</p>
        </div>
        <section class="fate-clock-status" aria-label="命刻系統狀態">
          <div><span class="eyebrow">命刻系統狀態</span><h2>危機監測中</h2></div>
          <p>目前顯示「已推進命刻／總命刻」。</p>
        </section>
        <section class="fate-clock-grid" aria-label="命刻進度"></section>
      </section>
      <footer class="footer-note">
        <span>✦ 傳說的盡頭，仍有人願意前行。</span>
        <span>虛空海會腐蝕固體 · 跨越請搭乘飛空艇或傳送法陣</span>
      </footer>
    </main>
  </div>
`;

const state = new WorldState();
const mapRoot = root.querySelector<HTMLElement>(".map-host");
const panelRoot = root.querySelector<HTMLElement>(".country-panel");
const travelRoot = root.querySelector<HTMLElement>(".travel-panel");
const timelineRoot = root.querySelector<HTMLElement>(".timeline-card");
const controlsRoot = root.querySelector<HTMLElement>(".map-control-host");
const mapDialog = root.querySelector<HTMLDialogElement>(".world-map-dialog");
const mapDialogRoot = root.querySelector<HTMLElement>(".world-map-dialog-host");
const mapDialogCard = root.querySelector<HTMLElement>(".world-map-dialog-card");
const mapPage = root.querySelector<HTMLElement>("#map-page");
const worldLogPage = root.querySelector<HTMLElement>("#world-log-page");
const pageViews = [...root.querySelectorAll<HTMLElement>("[data-page-view]")];
const pageViewButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-view-target]")];
const fateClockRoot = root.querySelector<HTMLElement>(".fate-clock-grid");
if (!mapRoot || !panelRoot || !travelRoot || !timelineRoot || !controlsRoot || !mapDialog || !mapDialogRoot || !mapDialogCard || !mapPage || !worldLogPage || !fateClockRoot || pageViews.length !== pageViewButtons.length) {
  throw new Error("A required application region is missing.");
}

type PageView = "map" | "log" | "people" | "fate-clock";
let pageSwitchTimer: number | undefined;
const setPageView = (view: PageView) => {
  const activePage = pageViews.find((page) => !page.hidden);
  const targetPage = pageViews.find((page) => page.dataset.pageView === view);
  if (!targetPage) throw new Error(`Page view "${view}" was not found.`);

  if (pageSwitchTimer !== undefined) {
    window.clearTimeout(pageSwitchTimer);
    pageSwitchTimer = undefined;
  }

  if (activePage === targetPage) {
    activePage.classList.remove("is-leaving");
  } else {
    activePage?.classList.add("is-leaving");
    pageSwitchTimer = window.setTimeout(() => {
      pageViews.forEach((page) => {
        page.hidden = page !== targetPage;
        page.classList.remove("is-leaving", "is-entering");
      });
      targetPage.classList.add("is-entering");
      pageSwitchTimer = undefined;
      window.setTimeout(() => targetPage.classList.remove("is-entering"), 850);
    }, activePage ? 150 : 0);
  }

  pageViewButtons.forEach((button) => {
    const isActive = button.dataset.viewTarget === view;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
};

pageViewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.viewTarget as PageView | undefined;
    if (view) setPageView(view);
  });
});

const pageZoomInput = root.querySelector<HTMLInputElement>("#page-zoom");
const pageZoomValue = root.querySelector<HTMLOutputElement>("#page-zoom-value");
const savedPageZoom = Number(localStorage.getItem("fabula-page-zoom"));
const initialPageZoom = Number.isFinite(savedPageZoom) && savedPageZoom >= 80 && savedPageZoom <= 150
  ? savedPageZoom
  : 150;

const sizeMapDialog = () => {
  const pageScale = Number.parseFloat(document.documentElement.style.zoom) / 100 || 1;
  const dialogWidth = Math.max(180, (window.innerWidth - 48) / pageScale);
  const mapHeight = Math.max(220, Math.min(760, (window.innerHeight - 200) / pageScale));
  mapDialog.style.width = `${dialogWidth}px`;
  mapDialog.style.maxHeight = `${Math.max(260, (window.innerHeight - 32) / pageScale)}px`;
  mapDialogCard.style.height = `${mapHeight}px`;
  mapDialogCard.style.minHeight = `${mapHeight}px`;
};

const setPageZoom = (zoom: number) => {
  const boundedZoom = Math.max(80, Math.min(150, zoom));
  document.documentElement.style.setProperty("zoom", `${boundedZoom}%`);
  sizeMapDialog();
  if (pageZoomInput) pageZoomInput.value = String(boundedZoom);
  if (pageZoomValue) pageZoomValue.value = `${boundedZoom}%`;
  localStorage.setItem("fabula-page-zoom", String(boundedZoom));
};

setPageZoom(initialPageZoom);
pageZoomInput?.addEventListener("input", () => setPageZoom(Number(pageZoomInput.value)));

const map = new WorldMap(mapRoot, (id) => state.select(id));
const starfieldMap = new WorldMap(mapDialogRoot, (id) => state.select(id));
const panel = new CountryPanel(panelRoot, travelRoot, (id) => state.select(id), (id) => state.setDeparture(id));
const timeline = new Timeline(timelineRoot, (day) => state.setDay(day), (id) => {
  setPageView("map");
  state.select(id);
});

new MapControls(controlsRoot, {
  zoomIn: () => state.setZoom(state.snapshot.zoom + 0.1),
  zoomOut: () => state.setZoom(state.snapshot.zoom - 0.1),
  reset: () => state.setZoom(1),
  toggleMotion: (enabled) => document.body.classList.toggle("reduce-motion", !enabled),
  toggleMobius: (enabled) => state.setMobiusVisible(enabled),
  showStarfield: () => {
    sizeMapDialog();
    mapDialog.showModal();
  }
});
window.addEventListener("resize", sizeMapDialog);
mapDialog.addEventListener("click", (event) => {
  if (event.target === mapDialog) mapDialog.close();
});

new FateClockMonitor(fateClockRoot);
const peopleRoot = root.querySelector<HTMLElement>(".people-intro-grid");
if (!peopleRoot) throw new Error("People monitor region is missing.");
new PeopleMonitor(peopleRoot);

state.subscribe((snapshot) => {
  map.render(snapshot);
  starfieldMap.render(snapshot);
  panel.render(snapshot.selectedId, snapshot.day, snapshot.departureId);
  timeline.render(snapshot);
  const activeEvent = [...events].reverse().find((event) => event.day <= snapshot.day);
  const selectedContinent = mapRoot.querySelector<SVGGElement>(`.landmass[data-id="${snapshot.selectedId}"]`);
  if (selectedContinent) selectedContinent.classList.add("is-selected");
  if (activeEvent?.type === "meeting") {
    mapRoot.querySelectorAll<SVGCircleElement>(".land-beacon").forEach((beacon) => beacon.classList.add("beacon-active"));
  }
});
