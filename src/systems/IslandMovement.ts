import { settings, type SkyIsland } from "../data";

export function getIslandPosition(island: SkyIsland, day: number): { x: number; y: number } {
  if (island.movement === "anchored") return { x: island.x, y: island.y };
  const { centerX, centerY, radiusX, radiusY } = settings.orbit;
  const horizontalPosition = Math.max(-1, Math.min(1, (island.x - centerX) / radiusX));
  const firstAngle = Math.asin(horizontalPosition);
  const secondAngle = Math.PI - firstAngle;
  const firstY = centerY - radiusY * Math.sin(2 * firstAngle);
  const secondY = centerY - radiusY * Math.sin(2 * secondAngle);
  const initialAngle = Math.abs(firstY - island.y) <= Math.abs(secondY - island.y)
    ? firstAngle
    : secondAngle;
  const orbitPeriodDays = island.orbitPeriodDays ?? settings.islandDrift.daysPerCycle;
  const angle = initialAngle
    + settings.orbit.direction * (day / orbitPeriodDays) * Math.PI * 2;
  return {
    x: centerX + radiusX * Math.sin(angle),
    y: centerY - radiusY * Math.sin(2 * angle)
  };
}
