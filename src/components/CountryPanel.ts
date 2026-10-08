import { continents, countries, islands, settings } from "../data";
import { getTravelOptions, getUpcomingMeeting } from "../systems/MobiusSystem";

export class CountryPanel {
  constructor(
    private detailsRoot: HTMLElement,
    private travelRoot: HTMLElement,
    private onSelect: (id: string) => void,
    private onDepartureChange: (id: string) => void
  ) {}

  render(selectedId: string, day: number, departureId: string): void {
    const country = countries.find((item) => item.id === selectedId);
    const island = islands.find((item) => item.id === selectedId);
    const continent = continents.find((item) => item.id === selectedId);

    if (island) {
      this.detailsRoot.innerHTML = `
        <div class="panel-kicker">漂移空島 · ${island.movement === "anchored" ? "已固定" : "高速漂移"}</div>
        <h2>${island.name}</h2>
        <p class="panel-description">${island.description}</p>
        <div class="detail-card"><span>地下城</span><strong>${island.dungeon ?? "無已知地下城"}</strong></div>
        <div class="detail-card"><span>移動狀態</span><strong>${island.movement === "anchored" ? "受外力固定" : "未施加外力 · 頻繁變位"}</strong></div>
        ${island.dungeon ? `<div class="dungeon-note"><span>核心與遺跡</span><p>核心失效後，地下城會成為普通廢墟；核心不限定是物品，也可能是一種存在。</p></div>` : ""}
        <div class="panel-divider"></div>
        <p class="small-note">虛空海中的小空島若未受外力固定，會以高頻率漂移；追蹤座標隨旅行日改變，靠近前請先確認航道。</p>
        <button class="text-button" data-action="island">在地圖上定位 <span>↗</span></button>`;
    } else if (continent) {
      const nations = continent.countryIds
        .map((id) => countries.find((item) => item.id === id))
        .filter((item) => item !== undefined);
      const nextMeeting = getUpcomingMeeting(continent.id, day);
      this.detailsRoot.innerHTML = `
        <div class="panel-kicker">大陸 · ${continent.movement === "anchored" ? "固定" : "環帶漂流"}</div>
        <h2>${continent.name}</h2>
        <p class="panel-description">${continent.description}</p>
        <div class="detail-card"><span>所屬國家</span><strong>${nations.length ? nations.map((item) => item.name).join("、") : "待玩家共同設定"}</strong></div>
        <div class="detail-card"><span>下次交會</span><strong>${nextMeeting ? `${nextMeeting.daysUntil === 0 ? "今日" : `約 ${nextMeeting.daysUntil} 日後`} · ${nextMeeting.meeting.mode === "inner" ? "環內上下交會" : "大陸接觸"}` : "尚未排定"}</strong></div>
        <div class="panel-divider"></div>
        <p class="small-note">${continent.subtitle}</p>
        ${nations.length ? `<div class="country-list">${nations.map((item) => `<button class="country-chip" data-country="${item.id}"><i style="--country-color:${item.color}"></i>${item.name}<span>›</span></button>`).join("")}</div>` : `<div class="dungeon-note"><span>共創空白</span><p>國家、政體、科技與魔法設定尚未定案，留待玩家填寫。</p></div>`}`;
    } else if (country) {
      const home = continents.find((item) => item.id === country.continentId);
      this.detailsRoot.innerHTML = `
        <div class="panel-kicker">國家檔案 · ${home?.name ?? "未知大陸"}</div>
        <h2>${country.name}</h2>
        <p class="country-motto">「${country.motto}」</p>
        <p class="panel-description">${country.description}</p>
        <div class="detail-card"><span>首都</span><strong>${country.capital}</strong></div>
        <div class="detail-card"><span>現況</span><strong class="status-text">${country.status}</strong></div>
        <div class="country-details">${country.details.map((detail) => `<div class="detail-card"><span>${detail.label}</span><strong>${detail.value}</strong></div>`).join("")}</div>
        `;
    } else {
      this.detailsRoot.innerHTML = `<div class="empty-panel"><span class="empty-icon">✦</span><h2>迷失於航圖</h2><p>選擇一座大陸、國家或空島，查看它的故事。</p></div>`;
    }

    const locations = [...continents, ...islands];
    this.travelRoot.innerHTML = `
      <div class="section-heading"><span>航路推演</span><span>${settings.timeline.yearLabel} · ${settings.timeline.dayLabel} ${String(day).padStart(2, "0")}</span></div>
      <label class="select-label" for="departure">出發地</label>
      <select id="departure" class="destination-select">${locations.map((item) => `<option value="${item.id}" ${item.id === departureId ? "selected" : ""}>${item.name}</option>`).join("")}</select>
      <label class="select-label" for="destination">目的地</label>
      <select id="destination" class="destination-select"></select>
      <div class="travel-options" id="travel-options"></div>`;

    const departureSelect = this.travelRoot.querySelector<HTMLSelectElement>("#departure");
    const destinationSelect = this.travelRoot.querySelector<HTMLSelectElement>("#destination");
    const travelHost = this.travelRoot.querySelector<HTMLElement>("#travel-options");
    const renderDestinations = (preferredId?: string) => {
      if (!departureSelect || !destinationSelect) return;
      const destinations = locations.filter((item) => item.id !== departureSelect.value);
      const selectedDestination = destinations.find((item) => item.id === preferredId) ?? destinations[0];
      destinationSelect.innerHTML = destinations.map((item) =>
        `<option value="${item.id}" ${item.id === selectedDestination?.id ? "selected" : ""}>${item.name}</option>`
      ).join("");
    };
    const renderOptions = () => {
      if (!departureSelect || !destinationSelect || !travelHost) return;
      const options = getTravelOptions(departureSelect.value, destinationSelect.value, day);
      travelHost.innerHTML = options.map((option) => `
        <div class="travel-option ${option.available ? "" : "is-unavailable"}">
          <span class="travel-icon">${option.mode === "flight" ? "✧" : option.mode === "portal" ? "◎" : "⌁"}</span>
          <span>${option.label}<small>${option.available ? option.duration : settings.travel.unavailableLabel}</small></span>
          <span class="travel-state">${option.available ? "可用" : "—"}</span>
        </div>`).join("");
    };
    renderDestinations();
    renderOptions();
    departureSelect?.addEventListener("change", () => {
      if (!departureSelect) return;
      this.onDepartureChange(departureSelect.value);
    });
    destinationSelect?.addEventListener("change", renderOptions);

    this.detailsRoot.querySelectorAll<HTMLButtonElement>("[data-country]").forEach((button) => {
      button.addEventListener("click", () => this.onSelect(button.dataset.country ?? ""));
    });
  }
}
