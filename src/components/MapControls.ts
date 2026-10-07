export interface MapControlActions {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  toggleMotion: (enabled: boolean) => void;
  toggleMobius: (enabled: boolean) => void;
}

export class MapControls {
  constructor(private root: HTMLElement, actions: MapControlActions) {
    this.root.innerHTML = `
      <div class="map-control-group" aria-label="地圖控制">
        <button class="map-control-button" data-zoom="in" aria-label="放大地圖">＋</button>
        <button class="map-control-button" data-zoom="out" aria-label="縮小地圖">－</button>
        <span class="control-separator"></span>
        <button class="map-control-button" data-reset aria-label="重設地圖位置">⤢</button>
      </div>
      <label class="mobius-toggle">
        <input type="checkbox" checked aria-label="顯示莫比烏斯之環" />
        <span class="toggle-track"></span>
        <span>莫比烏斯環帶</span>
      </label>
      <label class="motion-toggle"><input type="checkbox" checked /><span class="toggle-track"></span><span>漂移動畫</span></label>
    `;
    this.root.querySelector('[data-zoom="in"]')?.addEventListener("click", actions.zoomIn);
    this.root.querySelector('[data-zoom="out"]')?.addEventListener("click", actions.zoomOut);
    this.root.querySelector("[data-reset]")?.addEventListener("click", actions.reset);
    this.root.querySelector<HTMLInputElement>(".motion-toggle input")?.addEventListener("change", (event) => {
      actions.toggleMotion((event.target as HTMLInputElement).checked);
    });
    this.root.querySelector<HTMLInputElement>(".mobius-toggle input")?.addEventListener("change", (event) => {
      actions.toggleMobius((event.target as HTMLInputElement).checked);
    });
  }
}
