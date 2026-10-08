import { continents, countries, islands, settings } from "../data";
import { getContinentPosition, getUpcomingMeeting } from "../systems/MobiusSystem";
import { getIslandPosition } from "../systems/IslandMovement";
import type { WorldStateSnapshot } from "../systems/WorldState";

const landShape = (
  x: number,
  y: number,
  width: number,
  height: number,
  shape: "irregular" | "circle" | "square" | "rectangle" | "spaceship"
) => {
  if (shape === "circle") {
    const radius = Math.min(width, height) / 2;
    return `M ${x - radius} ${y} A ${radius} ${radius} 0 1 0 ${x + radius} ${y} A ${radius} ${radius} 0 1 0 ${x - radius} ${y} Z`;
  }
  if (shape === "square") {
    const side = Math.min(width, height);
    return `M ${x - side / 2} ${y - side / 2} H ${x + side / 2} V ${y + side / 2} H ${x - side / 2} Z`;
  }
  if (shape === "rectangle") {
    return `M ${x - width / 2} ${y - height / 2} H ${x + width / 2} V ${y + height / 2} H ${x - width / 2} Z`;
  }
  if (shape === "spaceship") {
    const point = (horizontal: number, vertical: number) =>
      `${x + width * (horizontal / 100 - 0.5)} ${y + height * (vertical / 100 - 0.5)}`;
    return `M ${point(0, 55)}
      Q ${point(8, 51)} ${point(17, 49)}
      L ${point(66, 43)}
      L ${point(72, 39)} ${point(76, 40)}
      L ${point(78, 30)} ${point(83, 27)}
      L ${point(87, 30)} ${point(87, 39)}
      L ${point(92, 40)} ${point(96, 37)}
      L ${point(100, 43)} ${point(96, 48)}
      L ${point(100, 53)} ${point(96, 58)}
      L ${point(100, 64)} ${point(95, 68)}
      L ${point(90, 64)} ${point(86, 65)}
      L ${point(82, 76)} ${point(77, 73)}
      L ${point(74, 61)} ${point(67, 60)}
      L ${point(18, 62)}
      Q ${point(7, 61)} ${point(0, 55)}
      Z`;
  }
  return `M ${x - width * 0.46} ${y - height * 0.1}
   L ${x - width * 0.34} ${y - height * 0.38}
   L ${x - width * 0.08} ${y - height * 0.48}
   L ${x + width * 0.11} ${y - height * 0.35}
   L ${x + width * 0.4} ${y - height * 0.4}
   L ${x + width * 0.48} ${y - height * 0.12}
   L ${x + width * 0.33} ${y + height * 0.11}
   L ${x + width * 0.4} ${y + height * 0.34}
   L ${x + width * 0.13} ${y + height * 0.47}
   L ${x - width * 0.08} ${y + height * 0.31}
   L ${x - width * 0.35} ${y + height * 0.39}
   L ${x - width * 0.49} ${y + height * 0.13} Z`;
};

export class WorldMap {
  constructor(private root: HTMLElement, private onSelect: (id: string) => void) {}

  render(state: WorldStateSnapshot): void {
    const continentMarkup = continents.map((continent, index) => {
      const position = getContinentPosition(continent, state.day);
      const isSelected = continent.countryIds.includes(state.selectedId) || continent.id === state.selectedId;
      const upcomingMeeting = getUpcomingMeeting(continent.id, state.day);
      const meeting = upcomingMeeting?.daysUntil === 0;
      const fill = ["land-rose", "land-plum", "land-ash"][index % 3];
      const shape = landShape(position.x, position.y, continent.width, continent.height, continent.shape);
      const shapeDetails = continent.shape === "spaceship"
        ? `<path class="land-detail" d="
          M ${position.x - continent.width * 0.36} ${position.y + continent.height * 0.07} L ${position.x + continent.width * 0.48} ${position.y - continent.height * 0.06}
          M ${position.x + continent.width * 0.22} ${position.y - continent.height * 0.08} L ${position.x + continent.width * 0.24} ${position.y - continent.height * 0.23} L ${position.x + continent.width * 0.31} ${position.y - continent.height * 0.27} L ${position.x + continent.width * 0.36} ${position.y - continent.height * 0.23} L ${position.x + continent.width * 0.36} ${position.y - continent.height * 0.05}
          M ${position.x + continent.width * 0.28} ${position.y - continent.height * 0.28} L ${position.x + continent.width * 0.28} ${position.y - continent.height * 0.4}
          M ${position.x + continent.width * 0.48} ${position.y + continent.height * 0.12} L ${position.x + continent.width * 0.53} ${position.y + continent.height * 0.28} L ${position.x + continent.width * 0.58} ${position.y + continent.height * 0.12}
          M ${position.x + continent.width * 0.67} ${position.y - continent.height * 0.05} L ${position.x + continent.width * 0.77} ${position.y - continent.height * 0.14} L ${position.x + continent.width * 0.84} ${position.y - continent.height * 0.03}
          M ${position.x + continent.width * 0.67} ${position.y + continent.height * 0.1} L ${position.x + continent.width * 0.77} ${position.y + continent.height * 0.19} L ${position.x + continent.width * 0.84} ${position.y + continent.height * 0.08}" />`
        : continent.shape === "irregular"
          ? `<path class="land-detail" d="M ${position.x - 38} ${position.y - 12} Q ${position.x - 3} ${position.y - 48} ${position.x + 19} ${position.y - 11} T ${position.x + 56} ${position.y + 16}" />`
          : "";
      return `
        <g class="landmass ${isSelected ? "is-selected" : ""}" data-id="${continent.id}" tabindex="0" role="button" aria-label="選擇${continent.name}">
          <path class="land-shadow" transform="translate(0 9)" d="${shape}" />
          <path class="land ${fill}" d="${shape}" />
          ${shapeDetails}
          <circle class="land-beacon ${meeting ? "beacon-active" : ""}" cx="${position.x + continent.width * 0.28}" cy="${position.y - continent.height * 0.19}" r="4" />
          <text class="map-label" x="${position.x}" y="${position.y + 5}">${continent.name}</text>
          <text class="map-sub-label" x="${position.x}" y="${position.y + 25}">${meeting ? (upcomingMeeting.meeting.mode === "inner" ? "環內交會" : "大陸接觸") : continent.subtitle}</text>
        </g>`;
    }).join("");

    const islandMarkup = islands.map((island) => {
      const position = getIslandPosition(island, state.day);
      const active = island.id === state.selectedId;
      return `
        <g class="sky-island ${active ? "is-selected" : ""}" data-id="${island.id}" tabindex="0" role="button" aria-label="選擇${island.name}">
          <ellipse class="island-shadow" cx="${position.x}" cy="${position.y + island.size * 0.66}" rx="${island.size * 1.4}" ry="5" />
          <path d="M ${position.x - island.size} ${position.y} Q ${position.x - island.size * 0.6} ${position.y - island.size} ${position.x} ${position.y - island.size * 0.62} Q ${position.x + island.size} ${position.y - island.size * 0.8} ${position.x + island.size} ${position.y} Q ${position.x} ${position.y + island.size * 0.25} ${position.x - island.size} ${position.y}Z" />
          <circle class="island-glow" cx="${position.x}" cy="${position.y - 2}" r="2.2" />
          <text class="island-label" x="${position.x}" y="${position.y + island.size + 15}">${island.name}</text>
        </g>`;
    }).join("");

    const countryNodes = continents.flatMap((continent) => {
      const continentCountries = countries.filter((country) => country.continentId === continent.id);
      const position = getContinentPosition(continent, state.day);
      const markerRadius = Math.min(continent.width, continent.height) * 0.22;
      return continentCountries.map((country, index) => {
        const angle = -Math.PI / 2 + (index * 2 * Math.PI) / continentCountries.length;
        const x = position.x + Math.cos(angle) * markerRadius;
        const y = position.y + Math.sin(angle) * markerRadius;
        return `<circle class="country-dot ${country.id === state.selectedId ? "is-selected" : ""}" data-id="${country.id}" cx="${x}" cy="${y}" r="5" style="--country-color:${country.color}" tabindex="0" role="button" aria-label="選擇${country.name}" />`;
      });
    }).join("");

    this.root.innerHTML = `
      <svg class="world-svg" viewBox="0 0 1200 760" style="transform:scale(${state.zoom});transform-origin:center center" role="img" aria-label="莫比烏斯之環上的世界地圖">
        <defs>
          <radialGradient id="voidGlow">
            <stop offset="0%" stop-color="#dc4d9f" stop-opacity=".22" />
            <stop offset="70%" stop-color="#8c367f" stop-opacity=".08" />
            <stop offset="100%" stop-color="#17111c" stop-opacity="0" />
          </radialGradient>
          <linearGradient id="mobiusBand" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#f08ac6" />
            <stop offset="30%" stop-color="#744476" />
            <stop offset="52%" stop-color="#382542" />
            <stop offset="76%" stop-color="#a64d87" />
            <stop offset="100%" stop-color="#f08ac6" />
          </linearGradient>
          <marker id="orbitArrow" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
            <path d="M 0 0 L 8 5 L 0 10 Z" fill="#ffd2ed" />
          </marker>
          <pattern id="starGrid" width="83" height="79" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="18" r="1" fill="#ffe4f5" opacity=".34" />
            <circle cx="63" cy="49" r=".8" fill="#ed75b7" opacity=".42" />
          </pattern>
          <filter id="pinkBlur"><feGaussianBlur stdDeviation="9" /></filter>
          <filter id="bandGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <rect width="1200" height="760" fill="url(#starGrid)" />
        <ellipse class="void-glow" cx="600" cy="403" rx="265" ry="248" fill="url(#voidGlow)" />
        <g class="mobius-band ${state.mobiusVisible ? "" : "is-hidden"}" aria-label="莫比烏斯環形軌道">
          <ellipse class="band-halo" cx="${settings.orbit.centerX}" cy="${settings.orbit.centerY}" rx="${settings.orbit.radiusX}" ry="${settings.orbit.radiusY}" />
          <ellipse class="band-ribbon" cx="${settings.orbit.centerX}" cy="${settings.orbit.centerY}" rx="${settings.orbit.radiusX}" ry="${settings.orbit.radiusY}" />
          <ellipse class="band-edge" cx="${settings.orbit.centerX}" cy="${settings.orbit.centerY}" rx="${settings.orbit.radiusX}" ry="${settings.orbit.radiusY}" />
          <path class="orbit-direction" marker-end="url(#orbitArrow)" d="${settings.orbit.direction === 1
            ? `M ${settings.orbit.centerX + settings.orbit.radiusX * 0.56} ${settings.orbit.centerY - settings.orbit.radiusY * 0.83} A ${settings.orbit.radiusX} ${settings.orbit.radiusY} 0 0 1 ${settings.orbit.centerX + settings.orbit.radiusX * 0.83} ${settings.orbit.centerY - settings.orbit.radiusY * 0.56}`
            : `M ${settings.orbit.centerX + settings.orbit.radiusX * 0.83} ${settings.orbit.centerY - settings.orbit.radiusY * 0.56} A ${settings.orbit.radiusX} ${settings.orbit.radiusY} 0 0 0 ${settings.orbit.centerX + settings.orbit.radiusX * 0.56} ${settings.orbit.centerY - settings.orbit.radiusY * 0.83}`}" />
          <path class="band-twist-seam" d="M 600 114 L 600 166" />
          <text class="band-label" x="600" y="89">莫比烏斯之環</text>
          <text class="band-label-en" x="600" y="104">大陸依各自週期環行 · 順箭頭方向</text>
        </g>
        <path class="void-current" d="M 438 262 Q 585 320 668 394 T 792 536" />
        <text class="void-label" x="602" y="426">虛 空 海</text>
        <text class="void-caption" x="602" y="448">THE LUMINOUS VOID</text>
        ${continentMarkup}
        ${islandMarkup}
        ${countryNodes}
        <g class="map-compass" transform="translate(1083 111)">
          <circle r="22" />
          <path d="M 0 -15 L 5 3 L 0 0 L -5 3 Z" />
          <text x="0" y="-30">N</text>
        </g>
        <g class="map-scale" transform="translate(63 682)">
          <path d="M 0 0 H 92 M 0 -5 V 5 M 92 -5 V 5" />
          <text x="46" y="19">環帶航程示意</text>
        </g>
      </svg>
      <div class="map-legend">
        <span><i class="legend-dot legend-country"></i>國家</span>
        <span><i class="legend-dot legend-island"></i>漂移空島</span>
        <span><i class="legend-band"></i>莫比烏斯之環</span>
      </div>
    `;

    this.root.querySelectorAll<SVGElement>("[data-id], .country-dot").forEach((node) => {
      const select = () => {
        const id = node.getAttribute("data-id");
        if (id) this.onSelect(id);
      };
      node.addEventListener("click", select);
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          select();
        }
      });
    });
  }
}
