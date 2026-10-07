import { continents, countries, islands, settings } from "../data";

export interface WorldStateSnapshot {
  day: number;
  selectedId: string;
  departureId: string;
  zoom: number;
  mobiusVisible: boolean;
}

type Listener = (state: WorldStateSnapshot) => void;

const defaultCountry = countries.find((country) => country.id === settings.initialSelectedId);
const defaultDepartureId = defaultCountry?.continentId ?? settings.initialSelectedId;
const savedDepartureId = localStorage.getItem("fabula-departure-id");
const validDepartureIds = new Set([
  ...continents.map((continent) => continent.id),
  ...islands.map((island) => island.id)
]);
const savedDepartureCountry = countries.find((country) => country.id === savedDepartureId);
const resolvedSavedDepartureId = savedDepartureCountry?.continentId ?? savedDepartureId;

export class WorldState {
  private state: WorldStateSnapshot = {
    day: settings.initialDay,
    selectedId: settings.initialSelectedId,
    departureId: resolvedSavedDepartureId && validDepartureIds.has(resolvedSavedDepartureId)
      ? resolvedSavedDepartureId
      : validDepartureIds.has(defaultDepartureId)
        ? defaultDepartureId
        : continents[0]?.id ?? islands[0]?.id ?? "",
    zoom: 1,
    mobiusVisible: true
  };
  private listeners = new Set<Listener>();

  get snapshot(): Readonly<WorldStateSnapshot> {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  setDay(day: number): void {
    const { startDay, endDay, step } = settings.timeline;
    const snappedDay = startDay + Math.round((day - startDay) / step) * step;
    this.update({
      day: Math.max(startDay, Math.min(endDay, snappedDay))
    });
  }

  select(id: string): void {
    this.update({ selectedId: id });
  }

  setDeparture(id: string): void {
    if (!validDepartureIds.has(id)) return;
    localStorage.setItem("fabula-departure-id", id);
    this.update({ departureId: id });
  }

  setZoom(zoom: number): void {
    this.update({ zoom: Math.max(0.8, Math.min(1.3, zoom)) });
  }

  setMobiusVisible(visible: boolean): void {
    this.update({ mobiusVisible: visible });
  }

  private update(change: Partial<WorldStateSnapshot>): void {
    this.state = { ...this.state, ...change };
    for (const listener of this.listeners) listener(this.state);
  }
}
