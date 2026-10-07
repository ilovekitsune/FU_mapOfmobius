import rawWorldData from "./world.json";
import settingCardsData from "./settingCards.json";
import type { SettingCard, WorldData } from "./types";

const worldData = rawWorldData as WorldData;

export const { settings, continents, countries, islands, history } = worldData;
export const events = [...worldData.events].sort((left, right) => left.day - right.day);
export const settingCards: SettingCard[] = settingCardsData;
export type {
  Continent,
  ContinentMeeting,
  Country,
  CountryDetail,
  HistoricalEvent,
  SettingCard,
  SettingCardParagraph,
  SkyIsland,
  TimelineSettings,
  WorldEvent,
  WorldSettings
} from "./types";
