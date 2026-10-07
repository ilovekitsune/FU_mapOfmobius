import { settings, type SkyIsland } from "../data";

export function getIslandPosition(island: SkyIsland, day: number): { x: number; y: number } {
  if (island.movement === "anchored") return { x: island.x, y: island.y };
  const initialAngle = Math.atan2(
    (island.y - settings.orbit.centerY) / settings.orbit.radiusY,
    (island.x - settings.orbit.centerX) / settings.orbit.radiusX
  );
  const angle = initialAngle
    + settings.orbit.direction * (day / settings.islandDrift.daysPerCycle) * Math.PI * 2;
  return {
    x: settings.orbit.centerX + Math.cos(angle) * settings.orbit.radiusX,
    y: settings.orbit.centerY + Math.sin(angle) * settings.orbit.radiusY
  };
}
