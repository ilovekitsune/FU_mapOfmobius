import peopleData from "../data/people.json";

interface PersonProfile {
  id: string;
  name: string;
  avatar?: string;
  originPlace?: string;
  role?: string;
  affiliation?: string;
  fate?: string;
  relationship?: string;
  status?: string;
  latestMove?: string;
  description?: string;
}

interface PeopleData {
  players: PersonProfile[];
  npcs: PersonProfile[];
}

const people: PeopleData = peopleData;

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
  return entities[character];
});

const resolveAvatarUrl = (avatar: string): string => {
  if (/^(https?:|data:|blob:)/i.test(avatar)) return avatar;
  return `${import.meta.env.BASE_URL}${avatar.replace(/^\/+/, "")}`;
};

const profileCard = (person: PersonProfile): string => {
  const name = escapeHtml(person.name);
  const avatar = person.avatar ? escapeHtml(resolveAvatarUrl(person.avatar)) : "";
  const fallback = escapeHtml(person.name.slice(0, 2) || "✦");
  const fields: [string, string | undefined][] = [
    ["起源之地", person.originPlace],
    ["身分", person.role],
    ["所屬／立場", person.affiliation],
    ["命定關係", person.fate],
    ["與旅人的關係", person.relationship],
    ["目前狀態", person.status],
    ["最近動向", person.latestMove]
  ];
  const details = fields
    .filter((field): field is [string, string] => Boolean(field[1]?.trim()))
    .map(([label, value]) => `<p><strong>${label}：</strong>${escapeHtml(value)}</p>`)
    .join("");
  const description = person.description?.trim()
    ? `<p class="person-description">${escapeHtml(person.description)}</p>`
    : "";

  return `
    <article class="person-card" data-person-id="${escapeHtml(person.id)}">
      <div class="person-avatar${avatar ? "" : " is-missing"}" aria-label="${name}頭像">
        ${avatar ? `<img src="${avatar}" alt="${name}的頭像" loading="lazy" />` : ""}
        <span aria-hidden="true">${fallback}</span>
      </div>
      <div class="person-card-copy">
        <h3>${name}</h3>
        ${details}${description}
      </div>
    </article>`;
};

export class PeopleMonitor {
  constructor(private readonly root: HTMLElement) {
    const playerCards = people.players.map(profileCard).join("");
    const npcCards = people.npcs.map(profileCard).join("");
    const playerContent = playerCards || '<p class="people-empty">尚未遇見命定之人</p>';
    const npcContent = npcCards || '<p class="people-empty">尚未遇見命定之人</p>';

    this.root.innerHTML = `
      <article class="people-section-card">
        <span class="eyebrow">PLAYER CHARACTERS</span>
        <h2>玩家角色</h2>
        <p>記錄同行旅人的基本資料與命運線索。</p>
        <div class="people-card-grid" aria-label="玩家角色列表">
          ${playerContent}
        </div>
      </article>
      <article class="people-section-card">
        <span class="eyebrow">NON-PLAYER CHARACTERS</span>
        <h2>NPC</h2>
        <p>記錄旅途中相遇的人物、立場與關聯事件。</p>
        <div class="people-card-grid" aria-label="NPC 列表">
          ${npcContent}
        </div>
      </article>
    `;

    this.root.querySelectorAll<HTMLImageElement>(".person-avatar img").forEach((image) => {
      image.addEventListener("error", () => image.parentElement?.classList.add("is-missing"), { once: true });
    });
  }
}
