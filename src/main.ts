import { CountryPanel } from "./components/CountryPanel";
import { MapControls } from "./components/MapControls";
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
      <div class="topbar-right">
       <span class="world-status"><i class="status-dot"></i>系統狀態 :錯誤        </span>
       <span class="world-status"><i class="status-dot"></i>女武神狀態 :失聯        </span>
        <span class="world-status"><i class="status-dot"></i>世界狀態 :未知        </span>
        <!-- <a class="topbar-link" href="#chronicle">開啟編年史</a> -->
        <label class="page-zoom-control" for="page-zoom">
          <span>頁面大小</span>
          <input id="page-zoom" type="range" min="80" max="150" step="10" value="150" aria-label="調整整個網頁大小" />
          <output id="page-zoom-value" for="page-zoom">150%</output>
        </label>
      </div>
    </header>
    <main class="main-content">
      <div class="intro-row">
        <div><span class="eyebrow">MAIN SYSTEM · ${settings.timeline.yearLabel} · 時間:錯誤 </span><h1>莫比烏斯<span>星圖</span></h1></div>
        <p class="intro-note">大陸循著莫比烏斯之環漂流。每一次交會，<br />都是相逢，也是告別。</p>
      </div>
      <section class="timeline-card" id="chronicle" aria-label="世界時間線"></section>
      
      <section class="map-layout" aria-label="世界地圖與地點資訊">
        <div class="map-card">
          <div class="map-host"></div>
          <div class="map-control-host"></div>
        </div>
        <aside class="country-panel" aria-live="polite"></aside>
      </section>
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
const timelineRoot = root.querySelector<HTMLElement>(".timeline-card");
const controlsRoot = root.querySelector<HTMLElement>(".map-control-host");
if (!mapRoot || !panelRoot || !timelineRoot || !controlsRoot) throw new Error("A required application region is missing.");

const pageZoomInput = root.querySelector<HTMLInputElement>("#page-zoom");
const pageZoomValue = root.querySelector<HTMLOutputElement>("#page-zoom-value");
const savedPageZoom = Number(localStorage.getItem("fabula-page-zoom"));
const initialPageZoom = Number.isFinite(savedPageZoom) && savedPageZoom >= 80 && savedPageZoom <= 150
  ? savedPageZoom
  : 150;

const setPageZoom = (zoom: number) => {
  const boundedZoom = Math.max(80, Math.min(150, zoom));
  document.documentElement.style.setProperty("zoom", `${boundedZoom}%`);
  if (pageZoomInput) pageZoomInput.value = String(boundedZoom);
  if (pageZoomValue) pageZoomValue.value = `${boundedZoom}%`;
  localStorage.setItem("fabula-page-zoom", String(boundedZoom));
};

setPageZoom(initialPageZoom);
pageZoomInput?.addEventListener("input", () => setPageZoom(Number(pageZoomInput.value)));

const map = new WorldMap(mapRoot, (id) => state.select(id));
const panel = new CountryPanel(panelRoot, (id) => state.select(id), (id) => state.setDeparture(id));
const timeline = new Timeline(timelineRoot, (day) => state.setDay(day), (id) => state.select(id));

new MapControls(controlsRoot, {
  zoomIn: () => state.setZoom(state.snapshot.zoom + 0.1),
  zoomOut: () => state.setZoom(state.snapshot.zoom - 0.1),
  reset: () => state.setZoom(1),
  toggleMotion: (enabled) => document.body.classList.toggle("reduce-motion", !enabled),
  toggleMobius: (enabled) => state.setMobiusVisible(enabled)
});

state.subscribe((snapshot) => {
  map.render(snapshot);
  panel.render(snapshot.selectedId, snapshot.day, snapshot.departureId);
  timeline.render(snapshot);
  const activeEvent = [...events].reverse().find((event) => event.day <= snapshot.day);
  const selectedContinent = mapRoot.querySelector<SVGGElement>(`.landmass[data-id="${snapshot.selectedId}"]`);
  if (selectedContinent) selectedContinent.classList.add("is-selected");
  if (activeEvent?.type === "meeting") {
    mapRoot.querySelectorAll<SVGCircleElement>(".land-beacon").forEach((beacon) => beacon.classList.add("beacon-active"));
  }
});
