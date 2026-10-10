import fateClocksData from "../data/fateClocks.json";
import gmSettings from "../data/GM_setting.json";

interface FateClockConfig {
  id: string;
  title: string;
  total: number;
  initialValue: number;
  description: string;
}

type FateClockStatus = "active" | "achieved" | "expired";

interface SavedFateClockState {
  statuses: Record<string, FateClockStatus>;
  deletedIds: string[];
  values?: Record<string, number>;
}

const fateClocks = fateClocksData as FateClockConfig[];
const isGMMode = gmSettings[0]?.GM_mode === true;
const stateStorageKey = "fabula-fate-clock-state";

const loadSavedState = (): SavedFateClockState => {
  const savedState = localStorage.getItem(stateStorageKey);
  if (!savedState) return { statuses: {}, deletedIds: [] };

  const parsed: unknown = JSON.parse(savedState);
  if (!parsed || typeof parsed !== "object" || !("statuses" in parsed) || !("deletedIds" in parsed)) {
    throw new Error("Saved fate clock state has an invalid format.");
  }
  const { statuses, deletedIds } = parsed as SavedFateClockState;
  if (!statuses || typeof statuses !== "object" || !Array.isArray(deletedIds)) {
    throw new Error("Saved fate clock state has invalid statuses or deleted IDs.");
  }
  if (Object.values(statuses).some((status) => !["active", "achieved", "expired"].includes(status))) {
    throw new Error("Saved fate clock state contains an unknown status.");
  }
  const values = "values" in parsed && parsed.values && typeof parsed.values === "object"
    ? parsed.values as Record<string, number>
    : {};
  if (Object.values(values).some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error("Saved fate clock state contains an invalid clock value.");
  }
  return { statuses, deletedIds: deletedIds.filter((id): id is string => typeof id === "string"), values };
};

const statusLabels: Record<FateClockStatus, string> = {
  active: "進行中",
  achieved: "已達成",
  expired: "已過期"
};

export class FateClockMonitor {
  private readonly values = new Map<string, number>();
  private readonly statuses: Record<string, FateClockStatus>;
  private readonly deletedIds: Set<string>;

  constructor(private readonly root: HTMLElement) {
    const savedState = isGMMode
      ? loadSavedState()
      : { statuses: {}, deletedIds: [], values: {} };
    this.statuses = savedState.statuses;
    this.deletedIds = new Set(savedState.deletedIds);
    this.root.innerHTML = fateClocks.filter((clock) => !this.deletedIds.has(clock.id)).map((clock) => `
      <article class="fate-clock-card" data-clock-id="${clock.id}">
        <div class="fate-clock-heading">
          <div><span class="panel-kicker">FATE CLOCK · ${clock.total} SEGMENTS</span><h2>${clock.title}</h2></div>
          <div class="fate-clock-actions">
            <span class="fate-clock-status-badge"></span>
            ${isGMMode ? `
              <button class="fate-clock-status-button" type="button" aria-label="切換${clock.title}狀態"></button>
              <button class="fate-clock-delete" type="button" aria-label="刪除${clock.title}" title="刪除命刻">×</button>
            ` : ""}
          </div>
        </div>
        <div class="fate-clock-content">
          <div class="fate-clock-face" role="img" aria-label="${clock.title} 0 / ${clock.total}">
            ${Array.from({ length: clock.total }, (_, index) => `
              <span class="fate-clock-tick" data-tick="${index}" style="--tick-angle:${(index / clock.total) * 360}deg"></span>
            `).join("")}
            <div class="fate-clock-center">
              <strong class="fate-clock-value" aria-live="polite">0 <span>/ ${clock.total}</span></strong>
              <span>已推進命刻</span>
            </div>
          </div>
          ${isGMMode ? `
            <div class="fate-clock-controls">
              <button class="fate-clock-step" type="button" data-step="1" aria-label="增加${clock.title}進度">＋</button>
              <button class="fate-clock-step" type="button" data-step="-1" aria-label="減少${clock.title}進度">－</button>
            </div>
          ` : ""}
        </div>
        <p class="fate-clock-description">${clock.description}</p>
      </article>
    `).join("");

    fateClocks.filter((clock) => !this.deletedIds.has(clock.id)).forEach((clock) => {
      const savedValue = savedState.values?.[clock.id];
      this.values.set(
        clock.id,
        Math.max(0, Math.min(clock.total, savedValue ?? clock.initialValue))
      );
      const card = this.root.querySelector<HTMLElement>(`[data-clock-id="${clock.id}"]`);
      card?.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((button) => {
        button.addEventListener("click", () => {
          const nextValue = (this.values.get(clock.id) ?? 0) + Number(button.dataset.step);
          this.values.set(clock.id, Math.max(0, Math.min(clock.total, nextValue)));
          this.saveState();
          this.updateClock(clock);
        });
      });
      card?.querySelector<HTMLButtonElement>(".fate-clock-status-button")?.addEventListener("click", () => {
        const statusOrder: FateClockStatus[] = ["active", "achieved", "expired"];
        const currentStatus = this.statuses[clock.id] ?? "active";
        const nextStatus = statusOrder[(statusOrder.indexOf(currentStatus) + 1) % statusOrder.length];
        this.statuses[clock.id] = nextStatus;
        this.saveState();
        this.updateClock(clock);
      });
      card?.querySelector<HTMLButtonElement>(".fate-clock-delete")?.addEventListener("click", () => {
        if (!window.confirm(`確定刪除「${clock.title}」命刻？`)) return;
        this.deletedIds.add(clock.id);
        this.saveState();
        card.remove();
      });
      this.updateClock(clock);
    });
  }

  private saveState(): void {
    if (!isGMMode) return;
    localStorage.setItem(stateStorageKey, JSON.stringify({
      statuses: this.statuses,
      deletedIds: [...this.deletedIds],
      values: Object.fromEntries(this.values)
    }));
  }

  private updateClock(clock: FateClockConfig): void {
    const card = this.root.querySelector<HTMLElement>(`[data-clock-id="${clock.id}"]`);
    if (!card) return;

    const value = this.values.get(clock.id) ?? 0;
    const status = this.statuses[clock.id] ?? "active";
    card.dataset.status = status;
    const badge = card.querySelector<HTMLElement>(".fate-clock-status-badge");
    if (badge) badge.textContent = statusLabels[status];
    const statusButton = card.querySelector<HTMLButtonElement>(".fate-clock-status-button");
    if (statusButton) {
      statusButton.textContent = statusLabels[status];
      statusButton.setAttribute("aria-label", `${clock.title}狀態：${statusLabels[status]}。按一下切換狀態`);
    }
    const face = card.querySelector<HTMLElement>(".fate-clock-face");
    if (face) face.setAttribute("aria-label", `${clock.title} ${value} / ${clock.total}`);
    const output = card.querySelector<HTMLElement>(".fate-clock-value");
    if (output) output.innerHTML = `${value} <span>/ ${clock.total}</span>`;
    card.querySelectorAll<HTMLElement>("[data-tick]").forEach((tick) => {
      tick.classList.toggle("is-filled", Number(tick.dataset.tick) < value);
    });
    card.querySelector<HTMLButtonElement>('[data-step="-1"]')?.toggleAttribute("disabled", value === 0);
    card.querySelector<HTMLButtonElement>('[data-step="1"]')?.toggleAttribute("disabled", value === clock.total);
  }
}
