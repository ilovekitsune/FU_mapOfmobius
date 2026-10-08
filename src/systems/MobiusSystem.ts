import { continents, countries, islands, settings, type Continent } from "../data";
import { getIslandPosition } from "./IslandMovement";

export interface TravelOption {
  mode: "flight" | "portal" | "walk";
  label: string;
  duration: string;
  available: boolean;
}

export interface UpcomingMeeting {
  meeting: Continent["meetings"][number];
  daysUntil: number;
}

function getOrbitPosition(angleDegrees: number): { x: number; y: number } {
  const angle = (angleDegrees * Math.PI) / 180;
  return {
    x: settings.orbit.centerX + settings.orbit.radiusX * Math.cos(angle),
    y: settings.orbit.centerY + settings.orbit.radiusY * Math.sin(angle)
  };
}

function getOrbitAngle(continent: Continent, day: number): number {
  if (continent.movement === "anchored") return continent.orbitAngle;
  const orbitPeriodDays = continent.orbitPeriodDays ?? settings.continentDrift.orbitPeriodDays;
  return continent.orbitAngle
    + settings.orbit.direction * (day / orbitPeriodDays) * 360;
}

function getCycleDay(day: number): number {
  return ((day % settings.cycleDays) + settings.cycleDays) % settings.cycleDays;
}

function findMeetingPartner(continent: Continent, meeting: Continent["meetings"][number], meetingDay: number): Continent | undefined {
  if (meeting.targetContinentId) {
    const target = continents.find((item) => item.id === meeting.targetContinentId);
    return target?.movement === "anchored" && meeting.mode === "edge" ? target : undefined;
  }
  return continents.find((item) =>
    item.id !== continent.id
    && item.movement === "drifting"
    && item.meetings.some((other) =>
      !other.targetContinentId
      && getCycleDay(other.day) === meetingDay
      && other.mode === meeting.mode
    )
  );
}

export function getContinentPosition(continent: Continent, day: number): { x: number; y: number } {
  if (continent.movement === "anchored") return getOrbitPosition(continent.orbitAngle);
  const index = continents.findIndex((item) => item.id === continent.id);
  const currentAngle = getOrbitAngle(continent, day);
  const position = getOrbitPosition(currentAngle);
  const cycleDay = getCycleDay(day);
  const approachDays = Math.max(0, settings.continentDrift.meetingApproachDays);
  if (approachDays === 0) return position;

  let strongestInfluence = 0;
  let rendezvousAngle = currentAngle;
  let radialOffset = 0;

  for (const meeting of continent.meetings) {
    const meetingDay = getCycleDay(meeting.day);
    const distance = ((cycleDay - meetingDay + settings.cycleDays / 2) % settings.cycleDays
      + settings.cycleDays) % settings.cycleDays - settings.cycleDays / 2;
    const progress = Math.max(0, 1 - Math.abs(distance) / approachDays);
    const influence = progress * progress * (3 - 2 * progress);
    if (influence <= strongestInfluence) continue;

    const partner = findMeetingPartner(continent, meeting, meetingDay);
    if (!partner) continue;

    const currentAngle = getOrbitAngle(continent, meetingDay);
    const partnerAngle = getOrbitAngle(partner, meetingDay);
    const side = index < continents.indexOf(partner) ? -1 : 1;
    strongestInfluence = influence;
    if (partner.movement === "anchored") {
      const meetingAngle = (partnerAngle * Math.PI) / 180;
      const tangentX = -settings.orbit.radiusX * Math.sin(meetingAngle);
      const tangentY = settings.orbit.radiusY * Math.cos(meetingAngle);
      const tangentLength = Math.hypot(tangentX, tangentY);
      const gap = ((continent.width + partner.width) / 2)
        * settings.continentDrift.edgeMeetingGapRatio / tangentLength * (180 / Math.PI);
      rendezvousAngle = partnerAngle + gap * side;
      radialOffset = 0;
      continue;
    }

    const angleDifference = ((partnerAngle - currentAngle + 540) % 360) - 180;
    const sharedAngle = currentAngle + angleDifference / 2;
    const meetingAngle = (sharedAngle * Math.PI) / 180;
    if (meeting.mode === "inner") {
      rendezvousAngle = sharedAngle;
      radialOffset = ((continent.height + partner.height) / 2)
        * settings.continentDrift.innerMeetingGapRatio * side;
    } else {
      const tangentX = -settings.orbit.radiusX * Math.sin(meetingAngle);
      const tangentY = settings.orbit.radiusY * Math.cos(meetingAngle);
      const tangentLength = Math.hypot(tangentX, tangentY);
      const gap = ((continent.width + partner.width) / 2)
        * settings.continentDrift.edgeMeetingGapRatio / tangentLength * (180 / Math.PI) * side;
      rendezvousAngle = sharedAngle + gap;
      radialOffset = 0;
    }
  }

  if (strongestInfluence === 0) return position;

  const angleDifference = ((rendezvousAngle - currentAngle + 540) % 360) - 180;
  const rendezvousPosition = getOrbitPosition(currentAngle + angleDifference * strongestInfluence);
  if (radialOffset === 0) return rendezvousPosition;

  const angle = (rendezvousAngle * Math.PI) / 180;
  const normalX = Math.cos(angle) / settings.orbit.radiusX;
  const normalY = Math.sin(angle) / settings.orbit.radiusY;
  const normalLength = Math.hypot(normalX, normalY);
  return {
    x: rendezvousPosition.x + (normalX / normalLength) * radialOffset * strongestInfluence,
    y: rendezvousPosition.y + (normalY / normalLength) * radialOffset * strongestInfluence
  };
}

export function getUpcomingMeeting(continentId: string, currentDay: number): UpcomingMeeting | undefined {
  const continent = continents.find((item) => item.id === continentId);
  if (!continent) return undefined;
  const scheduledMeetings = continent.movement === "anchored"
    ? continents
      .filter((item) => item.movement === "drifting")
      .flatMap((item) => item.meetings
        .filter((meeting) => meeting.targetContinentId === continent.id)
        .map((meeting) => ({ meeting, owner: item })))
    : continent.meetings.map((meeting) => ({ meeting, owner: continent }));
  const remainder = getCycleDay(currentDay);
  const upcomingMeetings = scheduledMeetings.flatMap(({ meeting, owner }) => {
    const meetingDay = getCycleDay(meeting.day);
    if (!findMeetingPartner(owner, meeting, meetingDay)) return [];
    return [{ meeting, daysUntil: (meetingDay - remainder + settings.cycleDays) % settings.cycleDays }];
  });
  return upcomingMeetings.sort((left, right) => left.daysUntil - right.daysUntil)[0];
}

export function getMeetingDays(continentId: string, currentDay: number): number {
  return getUpcomingMeeting(continentId, currentDay)?.daysUntil ?? Number.POSITIVE_INFINITY;
}

interface TravelEndpoint {
  width: number;
  height: number;
  shape?: Continent["shape"];
  circular?: boolean;
}

function getSurfaceGap(
  from: TravelEndpoint,
  fromPosition: { x: number; y: number },
  to: TravelEndpoint,
  toPosition: { x: number; y: number }
): number {
  const dx = toPosition.x - fromPosition.x;
  const dy = toPosition.y - fromPosition.y;
  const centerDistance = Math.hypot(dx, dy);
  if (centerDistance === 0) return 0;

  const directionX = dx / centerDistance;
  const directionY = dy / centerDistance;
  const getRadius = (endpoint: TravelEndpoint) => {
    if (endpoint.circular) return endpoint.width / 2;
    if (endpoint.shape === "circle") return Math.min(endpoint.width, endpoint.height) / 2;
    if (endpoint.shape === "square") {
      const halfSide = Math.min(endpoint.width, endpoint.height) / 2;
      return halfSide * (Math.abs(directionX) + Math.abs(directionY));
    }
    if (endpoint.shape === "rectangle") {
      return (endpoint.width * Math.abs(directionX) + endpoint.height * Math.abs(directionY)) / 2;
    }
    return Math.hypot(endpoint.width * directionX / 2, endpoint.height * directionY / 2);
  };
  const fromRadius = getRadius(from);
  const toRadius = getRadius(to);
  return Math.max(0, centerDistance - fromRadius - toRadius);
}

function getMeetingBetween(
  first: Continent,
  second: Continent,
  cycleDay: number
): Continent["meetings"][number] | undefined {
  const findScheduledMeeting = (continent: Continent, partner: Continent) => {
    if (continent.movement !== "drifting") return undefined;
    return continent.meetings.find((meeting) => {
      if (getCycleDay(meeting.day) !== cycleDay) return false;
      if (meeting.targetContinentId) return meeting.targetContinentId === partner.id;
      return partner.movement === "drifting" && partner.meetings.some((other) =>
        !other.targetContinentId
        && getCycleDay(other.day) === cycleDay
        && other.mode === meeting.mode
      );
    });
  };
  return findScheduledMeeting(first, second) ?? findScheduledMeeting(second, first);
}

export function getTravelOptions(fromId: string, toId: string, day: number): TravelOption[] {
  const fromContinent = continents.find((item) => item.id === fromId);
  const toContinent = continents.find((item) => item.id === toId);
  const fromIsland = islands.find((item) => item.id === fromId);
  const toIsland = islands.find((item) => item.id === toId);
  if ((!fromContinent && !fromIsland) || (!toContinent && !toIsland) || fromId === toId) return [];

  const fromPosition = fromContinent
    ? getContinentPosition(fromContinent, day)
    : getIslandPosition(fromIsland!, day);
  const toPosition = toContinent
    ? getContinentPosition(toContinent, day)
    : getIslandPosition(toIsland!, day);
  const fromEndpoint: TravelEndpoint = fromContinent
    ? fromContinent
    : { width: fromIsland!.size, height: fromIsland!.size, circular: true };
  const toEndpoint: TravelEndpoint = toContinent
    ? toContinent
    : { width: toIsland!.size, height: toIsland!.size, circular: true };
  const distance = getSurfaceGap(fromEndpoint, fromPosition, toEndpoint, toPosition);
  const meeting = fromContinent && toContinent
    ? getMeetingBetween(fromContinent, toContinent, getCycleDay(day))
    : undefined;
  const innerMeeting = meeting?.mode === "inner";
  const edgeContact = meeting?.mode === "edge";

  return [
    {
      mode: "flight",
      label: settings.travel.flightLabel,
      duration: innerMeeting
        ? `約 ${settings.travel.innerMeetingFlightDays} 日`
        : `${Math.max(settings.travel.minimumFlightDays, Math.ceil(distance / settings.travel.flightDistancePerDay))} 日`,
      available: true
    },
    {
      mode: "portal",
      label: settings.travel.portalLabel,
      duration: settings.travel.instantLabel,
      available: true
    },
    {
      mode: "walk",
      label: settings.travel.walkLabel,
      duration: edgeContact
        ? `${Math.max(settings.travel.minimumWalkHours, Math.ceil(distance / settings.travel.walkDistancePerHour))} 小時`
        : settings.travel.unavailableLabel,
      available: edgeContact
    }
  ];
}

export function getMeetingLabel(day: number): string {
  const selectedCountry = countries.find((country) => country.id === settings.initialSelectedId);
  const continentId = selectedCountry?.continentId ?? settings.initialSelectedId;
  const upcoming = getUpcomingMeeting(continentId, day);
  if (!upcoming) return "尚未排定";
  return upcoming.daysUntil === 0 ? "今日交會" : `${upcoming.daysUntil} 日後交會`;
}
