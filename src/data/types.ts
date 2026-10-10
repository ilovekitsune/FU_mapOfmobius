export interface ContinentMeeting {
  day: number;
  mode: "inner" | "edge";
  targetContinentId?: string;
}

export interface Continent {
  id: string;
  name: string;
  subtitle: string;
  shape: "irregular" | "circle" | "square" | "rectangle" | "spaceship";
  width: number;
  height: number;
  rotation: number;
  orbitAngle: number;
  orbitPeriodDays?: number;
  movement: "drifting" | "anchored";
  countryIds: string[];
  description: string;
  meetings: ContinentMeeting[];
}

export interface CountryDetail {
  label: string;
  value: string;
}

export interface Country {
  id: string;
  name: string;
  continentId: string;
  motto: string;
  status: string;
  capital: string;
  description: string;
  color: string;
  details: CountryDetail[];
}

export interface SkyIsland {
  id: string;
  name: string;
  x: number;
  y: number;
  size: number;
  movement: "drifting" | "anchored";
  orbitPeriodDays?: number;
  dungeon?: string;
  description: string;
  phase: number;
}

export interface WorldEvent {
  day: number;
  title: string;
  description: string;
  locationId?: string;
  type: "story" | "meeting" | "warning";
}

export interface HistoricalEvent {
  date: string;
  title: string;
  description: string;
}

export interface SettingCardParagraph {
  text: string;
  emphasis?: boolean;
}

export interface SettingCard {
  eyebrow: string;
  title: string;
  className?: string;
  paragraphs: SettingCardParagraph[];
}

export interface TimelineSettings {
  startDay: number;
  endDay: number;
  step: number;
  marks: number[];
  yearLabel: string;
  heading: string;
  resetLabel: string;
  previousDayLabel: string;
  nextDayLabel: string;
  previousDayAriaLabel: string;
  nextDayAriaLabel: string;
  sliderAriaLabel: string;
  dayLabel: string;
  eventDayPrefix: string;
  nextEventPrefix: string;
  locationButtonLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  quietLabel: string;
  eventTypeLabels: Record<WorldEvent["type"], string>;
  eventTypeIcons: Record<WorldEvent["type"], string>;
}

export interface WorldSettings {
  initialDay: number;
  initialSelectedId: string;
  cycleDays: number;
  orbit: {
    centerX: number;
    centerY: number;
    radiusX: number;
    radiusY: number;
    direction: 1 | -1;
  };
  timeline: TimelineSettings;
  continentDrift: {
    orbitPeriodDays: number;
    meetingApproachDays: number;
    innerMeetingGapRatio: number;
    edgeMeetingGapRatio: number;
  };
  islandDrift: {
    daysPerCycle: number;
  };
  travel: {
    flightDistancePerDay: number;
    minimumFlightDays: number;
    walkDistancePerHour: number;
    minimumWalkHours: number;
    innerMeetingFlightDays: number;
    flightLabel: string;
    portalLabel: string;
    walkLabel: string;
    instantLabel: string;
    unavailableLabel: string;
  };
}

export interface WorldData {
  settings: WorldSettings;
  continents: Continent[];
  countries: Country[];
  islands: SkyIsland[];
  events: WorldEvent[];
  history: HistoricalEvent[];
}
