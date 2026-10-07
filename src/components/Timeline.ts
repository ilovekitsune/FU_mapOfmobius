import { events, settings } from "../data";
import type { WorldStateSnapshot } from "../systems/WorldState";

export class Timeline {
  constructor(private root: HTMLElement, private onDayChange: (day: number) => void, private onSelect: (id: string) => void) {}

  render(state: WorldStateSnapshot): void {
    const event = [...events].reverse().find((item) => item.day <= state.day);
    const nextEvent = events.find((item) => item.day > state.day);
    const {
      startDay,
      endDay,
      step,
      marks,
      yearLabel,
      previousDayLabel,
      nextDayLabel,
      previousDayAriaLabel,
      nextDayAriaLabel,
      sliderAriaLabel,
      dayLabel,
      eventDayPrefix,
      nextEventPrefix,
      locationButtonLabel
    } = settings.timeline;
    const timelineRange = endDay - startDay;
    const eventDays = events
      .map((item) => item.day)
      .filter((day) => day >= startDay && day <= endDay);
    const markerDays = [...new Set([startDay, ...marks, ...eventDays, endDay])]
      .filter((day) => day >= startDay && day <= endDay)
      .sort((left, right) => left - right);
    const progress = timelineRange === 0 ? 100 : ((state.day - startDay) / timelineRange) * 100;
    this.root.innerHTML = `
      <div class="timeline-top">
        <div><span class="eyebrow">${settings.timeline.heading}</span><h2>${yearLabel} <span>·</span> ${dayLabel} ${String(state.day).padStart(2, "0")}</h2></div>
        <div class="timeline-actions">
          <button class="icon-button" data-step="-${step}" aria-label="${previousDayAriaLabel}" ${state.day <= startDay ? "disabled" : ""}>${previousDayLabel}</button>
          <button class="icon-button" data-step="${step}" aria-label="${nextDayAriaLabel}" ${state.day >= endDay ? "disabled" : ""}>${nextDayLabel}</button>
          <button class="today-button" data-today>${settings.timeline.resetLabel}</button>
        </div>
      </div>
      <div class="timeline-range-wrap">
        <div class="timeline-track"><div class="timeline-progress" style="width:${progress}%"></div></div>
        <input class="timeline-range" type="range" min="${startDay}" max="${endDay}" step="${step}" value="${state.day}" aria-label="${sliderAriaLabel}" />
        <div class="timeline-marks">
          ${markerDays.map((day) => `<button class="timeline-mark ${day === state.day ? "is-current" : ""} ${events.some((item) => item.day === day) ? "has-event" : ""}" style="left:${timelineRange === 0 ? 0 : ((day - startDay) / timelineRange) * 100}%" data-day="${day}" aria-label="${eventDayPrefix} ${day} ${dayLabel}">${day}</button>`).join("")}
        </div>
      </div>
      <div class="event-summary">
        <div class="event-icon ${event?.type ?? "story"}">${event ? settings.timeline.eventTypeIcons[event.type] : "✦"}</div>
        <div class="event-copy">
          <div class="event-meta"><span>${event ? `${eventDayPrefix} ${event.day} ${dayLabel} · ${settings.timeline.eventTypeLabels[event.type]}` : settings.timeline.quietLabel}</span>${nextEvent ? `<span class="next-event">${nextEventPrefix} · ${nextEvent.title}</span>` : ""}</div>
          <strong>${event?.title ?? settings.timeline.emptyTitle}</strong>
          <p>${event?.description ?? settings.timeline.emptyDescription}</p>
        </div>
        ${event?.locationId ? `<button class="event-location" data-location="${event.locationId}">${locationButtonLabel} <span>↗</span></button>` : ""}
      </div>
    `;

    this.root.querySelector<HTMLInputElement>(".timeline-range")?.addEventListener("input", (inputEvent) => {
      const value = Number((inputEvent.target as HTMLInputElement).value);
      const percentage = timelineRange === 0 ? 100 : ((value - startDay) / timelineRange) * 100;
      this.root.querySelector<HTMLElement>(".timeline-progress")?.style.setProperty("width", `${percentage}%`);
    });
    this.root.querySelector<HTMLInputElement>(".timeline-range")?.addEventListener("change", (inputEvent) => {
      const value = Number((inputEvent.target as HTMLInputElement).value);
      this.onDayChange(value);
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((button) => {
      button.addEventListener("click", () => this.onDayChange(state.day + Number(button.dataset.step)));
    });
    this.root.querySelector<HTMLButtonElement>("[data-today]")?.addEventListener("click", () => this.onDayChange(startDay));
    this.root.querySelectorAll<HTMLButtonElement>("[data-day]").forEach((button) => {
      button.addEventListener("click", () => this.onDayChange(Number(button.dataset.day)));
    });
    this.root.querySelector<HTMLButtonElement>("[data-location]")?.addEventListener("click", (clickEvent) => {
      const id = (clickEvent.currentTarget as HTMLButtonElement).dataset.location;
      if (id) this.onSelect(id);
    });
  }
}
