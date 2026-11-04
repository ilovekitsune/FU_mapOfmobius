type SuitId = "spade" | "heart" | "diamond" | "club";
type Suit = {
  id: SuitId;
  name: string;
  symbol: string;
  color: "black" | "red";
  element: string;
};

type PlayingCard = {
  id: string;
  rank: number;
  suit: Suit;
  joker: boolean;
};

type SkillId =
  | "jackpot"
  | "illusion-flush"
  | "blind-flush"
  | "full-status"
  | "triple-support"
  | "double-impact"
  | "magic-pair"
  | "forbidden-king";

type Skill = {
  id: SkillId;
  name: string;
  requirement: string;
  cards: number;
};

type TrapResult = {
  card: PlayingCard;
  declaredSuit: Suit;
  canCast: boolean;
};

const suits: Suit[] = [
  { id: "spade", name: "黑桃", symbol: "♠", color: "black", element: "冰" },
  { id: "heart", name: "紅心", symbol: "♥", color: "red", element: "火" },
  { id: "diamond", name: "方塊", symbol: "♦", color: "red", element: "風" },
  { id: "club", name: "梅花", symbol: "♣", color: "black", element: "土" },
];

const skills: Skill[] = [
  {
    id: "jackpot",
    name: "頭獎",
    requirement: "4 張相同數值，且不得含鬼牌",
    cards: 4,
  },
  {
    id: "illusion-flush",
    name: "幻術同花",
    requirement: "4 張數值連續且花色相同",
    cards: 4,
  },
  {
    id: "blind-flush",
    name: "致盲同花",
    requirement: "4 張數值連續",
    cards: 4,
  },
  {
    id: "full-status",
    name: "全場狀態",
    requirement: "3 張相同數值＋2 張相同數值",
    cards: 5,
  },
  {
    id: "triple-support",
    name: "三重支援",
    requirement: "3 張相同數值",
    cards: 3,
  },
  {
    id: "double-impact",
    name: "雙倍衝擊",
    requirement: "2 張相同數值＋2 張相同數值",
    cards: 4,
  },
  { id: "magic-pair", name: "魔力對子", requirement: "2 張相同數值", cards: 2 },
  {
    id: "forbidden-king",
    name: "禁忌君王",
    requirement: "4 張相同數值（無鬼牌）＋1 張鬼牌",
    cards: 5,
  },
];

const states = ["混亂", "動搖", "遲緩", "虛弱"];

const authApiBaseUrl = "https://discordtrpg.yoyobrian85.workers.dev";

const getRankLabel = (rank: number): string =>
  rank === 1 ? "A" : String(rank);
const makeDeck = (): PlayingCard[] => [
  ...suits.flatMap((suit) =>
    Array.from({ length: 7 }, (_, index) => ({
      id: `${suit.id}-${index + 1}`,
      rank: index + 1,
      suit,
      joker: false,
    })),
  ),
  { id: "joker-1", rank: 0, suit: suits[0], joker: true },
  { id: "joker-2", rank: 0, suit: suits[0], joker: true },
];

const shuffle = <T>(items: T[]): T[] => {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
};

const cardFace = (card: PlayingCard, index = 0, selected = false): string => {
  const rank = card.joker ? "★" : getRankLabel(card.rank);
  const suit = card.joker ? "★" : card.suit.symbol;
  const face = card.joker
    ? `<span class="playing-card-joker-mark">✦</span><span class="playing-card-joker-label">JOKER</span>`
    : card.rank === 1
      ? `<span class="playing-card-pip playing-card-pip-ace">${suit}</span>`
      : `<div class="playing-card-pips">${Array.from(
          { length: card.rank },
          (_, pipIndex) =>
            `<span class="playing-card-pip playing-card-pip-${pipIndex + 1}">${suit}</span>`,
        ).join("")}</div>`;
  return `
    <button class="playing-card ${card.joker ? "suit-joker" : `suit-${card.suit.color}`} ${selected ? "is-selected" : ""}"
      type="button" data-card-id="${card.id}" aria-pressed="${selected}" aria-label="${card.joker ? "鬼牌" : `${card.suit.name}${card.rank}`}">
      <span class="playing-card-corner playing-card-corner-top" aria-hidden="true">${rank}<span>${suit}</span></span>
      ${face}
      <span class="playing-card-corner playing-card-corner-bottom" aria-hidden="true">${rank}<span>${suit}</span></span>
    </button>
  `;
};

const cardBack = (count: number): string => `
  <div class="card-pile-back" aria-label="牌組，${count} 張">
    <span class="card-pile-star">✦</span><span class="card-pile-count">${count}</span>
  </div>
`;

const countsByRank = (cards: PlayingCard[]): number[] => {
  const counts = new Map<number, number>();
  cards.forEach((card) =>
    counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1),
  );
  return [...counts.values()].sort((left, right) => right - left);
};

const isConsecutive = (cards: PlayingCard[]): boolean => {
  const ranks = cards
    .map((card) => card.rank)
    .sort((left, right) => left - right);
  return (
    new Set(ranks).size === cards.length &&
    ranks[ranks.length - 1] - ranks[0] === cards.length - 1
  );
};

export class CardDraw {
  private deck: PlayingCard[] = [];
  private hand: PlayingCard[] = [];
  private discard: PlayingCard[] = [];
  private selectedIds = new Set<string>();
  private jokerRanks: Record<string, number> = { "joker-1": 1, "joker-2": 1 };
  private jokerSuits: Record<string, SuitId> = {
    "joker-1": "spade",
    "joker-2": "spade",
  };
  private characterLevel = 1;
  private magicCardLevel = 1;
  private trapCardLevel = 1;
  private redrawCardLevel = 1;
  private mp = 30;
  private spendMp = 10;
  private spellCost = 5;
  private statusOne = states[0];
  private statusTwo = states[1];
  private damageSuit: SuitId = "spade";
  private started = false;
  private pendingCards: PlayingCard[] | null = null;
  private highLowPending = false;
  private chosenSkill: SkillId | null = null;
  private lastPlayResult: string | null = null;
  private trapResult: TrapResult | null = null;
  private log: string[] = [];
  private isAuthenticated = false;
  private loginPending = false;
  private loginError = "";
  private discordMessage = "";
  private discordSending = false;
  private nickname = "";

  constructor(private readonly root: HTMLElement) {
    this.isAuthenticated = Boolean(localStorage.getItem("jwt_token"));
    this.root.addEventListener("click", (event) => this.onClick(event));
    this.root.addEventListener("change", (event) => this.onChange(event));
    this.root.addEventListener("submit", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLFormElement) || target.id !== "card-login-form") return;
      event.preventDefault();
      const formData = new FormData(target);
      void this.handleLogin(
        String(formData.get("username") ?? "").trim(),
        String(formData.get("password") ?? "")
      );
    });
    this.render();
  }

  private onClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const actionButton = target.closest<HTMLButtonElement>("[data-action]");
    if (actionButton) {
      this.performAction(actionButton.dataset.action ?? "");
      return;
    }

    const cardButton = target.closest<HTMLButtonElement>("[data-card-id]");
    if (!cardButton || !this.started || this.pendingCards) return;
    const cardId = cardButton.dataset.cardId;
    if (!cardId || !this.hand.some((card) => card.id === cardId)) return;
    if (this.highLowPending) {
      if (this.selectedIds.has(cardId)) this.selectedIds.clear();
      else this.selectedIds = new Set([cardId]);
    } else if (this.selectedIds.has(cardId)) this.selectedIds.delete(cardId);
    else this.selectedIds.add(cardId);
    this.render();
  }

  private onChange(event: Event): void {
    const target = event.target;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement
      )
    )
      return;
    const field = target.dataset.field;
    if (!field) return;

    if (field === "character-level") {
      this.characterLevel = Math.max(
        1,
        Math.min(60, Math.floor(Number(target.value) || 1)),
      );
    }
    if (field === "magic-level") {
      this.magicCardLevel = Math.max(
        1,
        Math.min(3, Math.floor(Number(target.value) || 1)),
      );
    }
    if (field === "trap-level") {
      this.trapCardLevel = Math.max(
        1,
        Math.min(4, Math.floor(Number(target.value) || 1)),
      );
    }
    if (field === "redraw-level") {
      this.redrawCardLevel = Math.max(1, Math.floor(Number(target.value) || 1));
    }
    if (field === "mp")
      this.mp = Math.max(0, Math.floor(Number(target.value) || 0));
    if (field === "spend")
      this.spendMp = Math.max(0, Math.floor(Number(target.value) || 0));
    if (field === "spell-cost")
      this.spellCost = Math.max(0, Math.floor(Number(target.value) || 0));
    if (field === "status-one") {
      this.statusOne = target.value;
      if (this.statusTwo === this.statusOne) {
        this.statusTwo =
          states.find((state) => state !== this.statusOne) ?? states[1];
      }
    }
    if (field === "status-two") {
      this.statusTwo = target.value;
      if (this.statusOne === this.statusTwo) {
        this.statusOne =
          states.find((state) => state !== this.statusTwo) ?? states[0];
      }
    }
    if (field === "damage-suit" && this.suitById(target.value))
      this.damageSuit = target.value as SuitId;
    if (field === "joker-rank" && target.dataset.cardId) {
      this.jokerRanks[target.dataset.cardId] = Math.max(
        1,
        Math.min(7, Number(target.value) || 1),
      );
    }
    if (
      field === "joker-suit" &&
      target.dataset.cardId &&
      this.suitById(target.value)
    ) {
      this.jokerSuits[target.dataset.cardId] = target.value as SuitId;
    }
    if (field === "trap-suit" && this.suitById(target.value)) {
      this.root.dataset.trapSuit = target.value;
    }
    this.render();
  }

  private performAction(action: string): void {
    if (action === "start") this.startConflict();
    else if (action === "end") this.endConflict();
    else if (action === "logout") this.logout();
    else if (action === "play") this.playCards();
    else if (action === "redraw") this.redrawCards();
    else if (action === "high-low") this.startHighLow();
    else if (action === "high-low-discard") this.finishHighLow();
    else if (action === "discord-send") this.shareResult();
    else if (action === "resolve") this.finishPlay();
    else if (action.startsWith("skill:"))
      this.chooseSkill(action.slice(6) as SkillId);
    else if (action === "trap") this.triggerTrap();
    else if (action === "cast") this.castSpell();
    this.render();
  }

  private startConflict(): void {
    if (this.started) return;
    this.deck = shuffle(makeDeck());
    this.hand = [];
    this.discard = [];
    this.pendingCards = null;
    this.highLowPending = false;
    this.chosenSkill = null;
    this.lastPlayResult = null;
    this.selectedIds.clear();
    this.trapResult = null;
    this.started = true;
    this.drawCards(5);
    this.addLog("衝突開始，洗牌並抽取 5 張起始手牌。");
  }

  private endConflict(): void {
    if (!this.started) return;
    const total =
      this.deck.length +
      this.hand.length +
      this.discard.length +
      (this.pendingCards?.length ?? 0);
    this.deck = [];
    this.hand = [];
    this.discard = [];
    this.pendingCards = null;
    this.highLowPending = false;
    this.chosenSkill = null;
    this.trapResult = null;
    this.selectedIds.clear();
    this.started = false;
    this.addLog(`衝突結束，收回全部 ${total} 張牌並重置牌組。`);
  }

  private playCards(): void {
    if (!this.started || this.pendingCards || this.highLowPending) return;
    const selected = this.hand.filter((card) => this.selectedIds.has(card.id));
    const maximumMp = 10 + this.magicCardLevel * 5;
    if (selected.length === 0 || selected.length > 5) {
      this.addLog("請先選擇 1 至 5 張手牌。");
      return;
    }
    if (
      this.spendMp < 10 ||
      this.spendMp > maximumMp ||
      this.spendMp > this.mp
    ) {
      this.addLog(`MP 消耗須介於 10 與 ${Math.min(maximumMp, this.mp)} 之間。`);
      return;
    }
    if (selected.length > Math.floor(this.spendMp / 5)) {
      this.addLog(
        `消耗 ${this.spendMp} MP 最多可打出 ${Math.floor(this.spendMp / 5)} 張牌。`,
      );
      return;
    }

    this.mp -= this.spendMp;
    this.pendingCards = selected;
    const firstSuit = selected[0].suit;
    this.damageSuit = firstSuit.id;
    this.hand = this.hand.filter((card) => !this.selectedIds.has(card.id));
    this.selectedIds.clear();
    this.chosenSkill = null;
    this.addLog(
      `使用一個行動，消耗 ${this.spendMp} MP 打出 ${selected.length} 張牌。`,
    );
  }

  private redrawCards(): void {
    if (!this.started || this.pendingCards || this.highLowPending) return;
    const selected = this.hand.filter((card) => this.selectedIds.has(card.id));
    if (selected.length === 0 || selected.length > this.redrawCardLevel) {
      this.addLog(`重抽時請選擇 1 至 ${this.redrawCardLevel} 張手牌。`);
      return;
    }

    this.hand = this.hand.filter((card) => !this.selectedIds.has(card.id));
    this.discard.push(...selected);
    this.selectedIds.clear();
    this.addLog(
      `回合結束，發動重抽（SL ${this.redrawCardLevel}），棄置 ${selected.length} 張牌並抽取等量牌補充手牌。`,
    );
    this.drawCards(selected.length);
  }

  private startHighLow(): void {
    if (!this.started || this.pendingCards || this.highLowPending) return;
    if (this.deck.length === 0 && this.discard.length === 0) {
      this.addLog("牌組與棄牌堆皆無牌，無法發動高或低。");
      return;
    }

    this.selectedIds.clear();
    const handSize = this.hand.length;
    this.drawCards(1);
    if (this.hand.length !== handSize + 1) {
      this.addLog("沒有可抽取的牌，無法發動高或低。");
      return;
    }
    this.highLowPending = true;
    this.addLog(
      "擲出大成功或大失敗，發動高或低：抽 1 張牌，請從手牌選擇 1 張棄置。",
    );
  }

  private finishHighLow(): void {
    if (!this.started || !this.highLowPending || this.pendingCards) return;
    const selected = this.hand.filter((card) => this.selectedIds.has(card.id));
    if (selected.length !== 1) {
      this.addLog("高或低需從手牌選擇 1 張牌棄置。");
      return;
    }
    this.hand = this.hand.filter((card) => card.id !== selected[0].id);
    this.discard.push(selected[0]);
    this.selectedIds.clear();
    this.highLowPending = false;
    this.addLog(`高或低結算：棄置${this.cardName(selected[0])}。`);
  }

  private chooseSkill(skillId: SkillId): void {
    if (
      !this.pendingCards ||
      !this.availableSkills().some((skill) => skill.id === skillId)
    )
      return;
    this.chosenSkill = skillId;
  }

  private finishPlay(): void {
    if (!this.pendingCards) return;
    const played = this.pendingCards;
    this.lastPlayResult = this.createDiscordMessage(played, this.chosenSkill);
    if (this.chosenSkill) this.addLog(this.skillDescription(this.chosenSkill));
    else this.addLog("這組牌沒有符合的套牌效果。");
    this.discard.push(...played);
    this.pendingCards = null;
    this.chosenSkill = null;
    this.drawCards(played.length);
    this.addLog(
      `將 ${played.length} 張牌放入棄牌堆，並補抽 ${played.length} 張手牌。`,
    );
  }

  private createDiscordMessage(
    cards: PlayingCard[],
    skillId: SkillId | null,
  ): string {
    const assignedCards = this.assigned(cards);
    const cardNames = assignedCards.map((card) =>
      card.joker
        ? `鬼牌（${card.suit.name}${card.rank}）`
        : this.cardName(card),
    );
    const skill = skillId
      ? skills.find((item) => item.id === skillId)
      : undefined;
    const effect = skillId
      ? this.skillDescription(skillId)
      : "未形成套牌效果。";
    return [
      "【命運抽牌結果】",
      `打出的牌：${cardNames.join("、")}`,
      `選擇效果：${skill?.name ?? "無套牌效果"}`,
      `效果說明：${effect}`,
    ].join("\n");
  }

  private shareResult(): void {
    const message = this.pendingCards
      ? this.createDiscordMessage(this.pendingCards, this.chosenSkill)
      : this.lastPlayResult;
    if (!message || this.discordSending) return;
    void this.sendToDiscord(message);
  }

  private logout(): void {
    this.endConflict();
    localStorage.removeItem("jwt_token");
    this.isAuthenticated = false;
    this.nickname = "";
    this.loginError = "";
    this.render();
  }

  // Discord Worker /api/send authenticates this request with a server-issued JWT.
  private async sendToDiscord(message: string): Promise<void> {
    const token = localStorage.getItem("jwt_token");
    if (!token) {
      this.isAuthenticated = false;
      this.loginError = "登入狀態已失效，請重新登入。";
      this.render();
      return;
    }

    this.discordSending = true;
    this.discordMessage = "正在傳送至 Discord…";
    this.render();
    try {
      const response = await fetch(authApiBaseUrl + "/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ message }),
      });
      const payload: unknown = await response.json();
      const result = payload && typeof payload === "object"
        ? payload as Record<string, unknown>
        : {};

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("jwt_token");
        this.isAuthenticated = false;
        this.nickname = "";
        this.loginError = "登入已失效，請重新登入後再傳送。";
      } else if (!response.ok || result.success !== true) {
        this.discordMessage = typeof result.error === "string"
          ? "發送失敗：" + result.error
          : "發送失敗（HTTP " + response.status + "）。";
      } else {
        this.discordMessage = typeof result.sender === "string"
          ? "訊息已成功由 " + result.sender + " 送出。"
          : "訊息已成功送出。";
      }
    } catch (error) {
      this.discordMessage = error instanceof Error
        ? "無法連線 Discord Worker：" + error.message
        : "無法連線 Discord Worker，請稍後再試。";
    } finally {
      this.discordSending = false;
      this.render();
    }
  }
  private async handleLogin(username: string, password: string): Promise<void> {
    if (!username || !password || this.loginPending) {
      this.loginError = "請輸入帳號與密碼。";
      this.render();
      return;
    }

    this.loginPending = true;
    this.loginError = "";
    this.render();
    try {
      const response = await fetch(`${authApiBaseUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object") {
        throw new Error("登入服務回傳格式錯誤，請稍後再試。");
      }

      const result = payload as Record<string, unknown>;
      if (!response.ok || result.success !== true || typeof result.token !== "string" || !result.token) {
        const errorMessage = typeof result.error === "string" ? result.error : "帳號或密碼錯誤，請再試一次。";
        const configIssues = Array.isArray(result.configIssues)
          ? result.configIssues.filter((issue): issue is string => typeof issue === "string")
          : [];
        throw new Error(configIssues.length > 0
          ? `${errorMessage}（設定檢查：${configIssues.join("；")}）`
          : errorMessage);
      }

      // JWT 由登入伺服器簽發；前端僅保存它，絕不自行產生或簽章。
      localStorage.setItem("jwt_token", result.token);
      const user = result.user;
      this.nickname = user && typeof user === "object" && "nickname" in user && typeof user.nickname === "string"
        ? user.nickname
        : username;
      this.isAuthenticated = true;
      this.loginError = "";
    } catch (error) {
      this.loginError = error instanceof Error
        ? error.message
        : "無法連線登入服務，請稍後再試。";
    } finally {
      this.loginPending = false;
      this.render();
    }
  }
  private triggerTrap(): void {
    if (!this.started || this.pendingCards || this.highLowPending) return;
    const declaredId = this.root.dataset.trapSuit ?? "spade";
    const declaredSuit = this.suitById(declaredId);
    if (!declaredSuit) throw new Error("Declared trap suit was not found.");
    if (this.deck.length === 0 && this.discard.length > 0) {
      this.deck = shuffle(this.discard);
      this.discard = [];
    }
    const card = this.deck.pop();
    if (!card) {
      this.addLog("牌組沒有可翻開的牌，無法觸發陷阱卡。");
      return;
    }
    this.discard.push(card);
    const canCast = card.joker || card.suit.id === declaredSuit.id;
    this.trapResult = { card, declaredSuit, canCast };
    this.addLog(
      `宣告${declaredSuit.name}，翻開${this.cardName(card)}並正面朝上放入棄牌堆。${canCast ? "符合條件，可免費施放法術。" : "花色不符，沒有觸發施法效果。"}`,
    );
  }

  private castSpell(): void {
    const maximumCost = this.trapCardLevel * 5;
    if (!this.trapResult?.canCast) return;
    if (this.spellCost > maximumCost || this.spellCost > this.mp) {
      this.addLog(
        `法術消耗須不超過 ${maximumCost} MP，且不能高於目前 MP ${this.mp}。`,
      );
      return;
    }
    this.mp -= this.spellCost;
    this.addLog(
      `免費進行一次施法行動，施放總消耗 ${this.spellCost} MP 的法術（已支付 MP）。`,
    );
    this.trapResult = null;
  }

  private drawCards(count: number): void {
    for (let index = 0; index < count; index += 1) {
      if (this.deck.length === 0 && this.discard.length > 0) {
        this.deck = shuffle(this.discard);
        this.discard = [];
        this.addLog("牌組用盡，將棄牌堆洗回牌組。");
      }
      const card = this.deck.pop();
      if (!card) break;
      this.hand.push(card);
    }
  }

  private assigned(cards: PlayingCard[]): PlayingCard[] {
    return cards.map((card) => {
      if (!card.joker) return card;
      const suit = this.suitById(this.jokerSuits[card.id]);
      if (!suit) throw new Error("Joker suit assignment was not found.");
      return { ...card, rank: this.jokerRanks[card.id] ?? 1, suit };
    });
  }

  private availableSkills(): Skill[] {
    if (!this.pendingCards) return [];
    const cards = this.assigned(this.pendingCards);
    const count = cards.length;
    const rankCounts = countsByRank(cards);
    const hasJoker = cards.some((card) => card.joker);
    const fourKind = rankCounts[0] === 4;
    const fullHouse = rankCounts[0] === 3 && rankCounts[1] === 2;
    const twoPairs = rankCounts[0] === 2 && rankCounts[1] === 2;
    const consecutive = count === 4 && isConsecutive(cards);
    const sameSuit = cards.every((card) => card.suit.id === cards[0].suit.id);
    const eligible = new Set<SkillId>();

    if (count === 4 && !hasJoker && fourKind) eligible.add("jackpot");
    if (consecutive && sameSuit) eligible.add("illusion-flush");
    if (consecutive) eligible.add("blind-flush");
    if (count === 5 && fullHouse) eligible.add("full-status");
    if (count === 3 && rankCounts[0] === 3) eligible.add("triple-support");
    if (count === 4 && twoPairs) eligible.add("double-impact");
    if (count === 2 && rankCounts[0] === 2) eligible.add("magic-pair");
    if (count === 5 && cards.filter((card) => card.joker).length === 1) {
      const nonJokers = cards.filter((card) => !card.joker);
      if (
        nonJokers.length === 4 &&
        new Set(nonJokers.map((card) => card.rank)).size === 1
      ) {
        eligible.add("forbidden-king");
      }
    }
    return skills.filter((skill) => eligible.has(skill.id));
  }

  private skillDescription(skillId: SkillId): string {
    const skill = skills.find((item) => item.id === skillId);
    if (!skill || !this.pendingCards)
      throw new Error(`Skill "${skillId}" is unavailable.`);
    const cards = this.assigned(this.pendingCards);
    const ranks = cards.map((card) => card.rank);
    const sum = ranks.reduce((total, rank) => total + rank, 0);
    const maximum = Math.max(...ranks);
    const bonus =
      this.characterLevel >= 40 ? 20 : this.characterLevel >= 20 ? 10 : 0;
    const highCards = cards.filter((card) => !card.joker);
    const rankEven =
      (skillId === "forbidden-king"
        ? highCards.reduce((total, card) => total + card.rank, 0)
        : maximum) %
        2 ===
      0;
    const damageBonusText = bonus ? `（等級加成 +${bonus}）` : "";

    switch (skillId) {
      case "jackpot":
        return "你與場景中的所有盟友恢復 777 HP 與 777 MP；場景內已投降的玩家角色立刻恢復意識，但投降效果不取消。";
      case "illusion-flush": {
        const element = cards[0].suit.element;
        return `你對場景中的每一名敵人造成 ${25 + sum + bonus} 點${element}屬性傷害（25 + 點數總和 ${sum}${damageBonusText}）。`;
      }
      case "blind-flush":
        return `你對場景中的每一名敵人造成 ${15 + sum + bonus} 點${maximum % 2 === 0 ? "光" : "暗"}屬性傷害（15 + 點數總和 ${sum}${damageBonusText}；最高點數 ${maximum} 為${maximum % 2 === 0 ? "偶數" : "奇數"}）。`;
      case "full-status":
        return maximum % 2 === 0
          ? `選擇的「${this.statusOne}」與「${this.statusTwo}」：你與所有盟友從這兩種狀態中恢復（最高點數 ${maximum} 為偶數）。`
          : `選擇的「${this.statusOne}」與「${this.statusTwo}」狀態施加於場景中的每一名敵人（最高點數 ${maximum} 為奇數）。`;
      case "triple-support":
        return `你與場景中所有盟友各恢復 ${sum * 3} HP 與 ${sum * 3} MP（點數總和 ${sum} × 3）。`;
      case "double-impact":
        return `對你能看見的最多 2 名不同敵人造成 ${10 + maximum} 點${this.suitById(this.damageSuit)?.element ?? "冰"}屬性傷害（10 + 最高點數 ${maximum}）。`;
      case "magic-pair": {
        const suitText = cards.some((card) => card.suit.id === this.damageSuit)
          ? `${this.suitById(this.damageSuit)?.name}（${this.suitById(this.damageSuit)?.element}）`
          : "所選花色不在這組牌中；請改選有效花色";
        return `使用裝備武器進行一次免費攻擊；若攻擊造成傷害，可將全部傷害轉為${suitText}屬性。`;
      }
      case "forbidden-king":
        return `對場上每一位敵人造成 777 點${rankEven ? "光" : "暗"}屬性傷害（四張同點牌點數總和為${rankEven ? "偶數" : "奇數"}）。${this.discard.some((card) => card.joker) ? "棄牌堆已有鬼牌，此傷害無視免疫與抗性。" : "棄牌堆尚無鬼牌，不忽略免疫與抗性。"}`;
    }
  }

  private render(): void {
    if (!this.isAuthenticated) {
      this.renderLogin();
      return;
    }

    const maximumMp = 10 + this.magicCardLevel * 5;
    const selectedCount = this.hand.filter((card) =>
      this.selectedIds.has(card.id),
    ).length;
    const pendingSkills = this.availableSkills();
    const pendingMarkup = this.pendingCards
      ? `
        <section class="card-resolution" aria-live="polite">
          <div class="card-section-heading">
            <div><span class="eyebrow">PLAYED CARDS · EFFECT RESOLUTION</span><h3>本次打出的牌</h3></div>
            <span class="card-count-badge">${this.pendingCards.length} 張</span>
          </div>
          <div class="playing-card-grid playing-card-grid-pending">${this.pendingCards.map((card, index) => cardFace(card, index)).join("")}</div>
          ${this.pendingCards.some((card) => card.joker) ? this.renderJokerControls(this.pendingCards.filter((card) => card.joker)) : ""}
          ${
            pendingSkills.length
              ? `<div class="card-skill-options"><p>符合多種套牌效果時，擇一發動：</p>${pendingSkills
                  .map(
                    (skill) => `
                <button class="card-skill-option ${this.chosenSkill === skill.id ? "is-chosen" : ""}" type="button" data-action="skill:${skill.id}">
                  <strong>${skill.name}</strong><span>${skill.requirement}</span>
                </button>`,
                  )
                  .join("")}</div>
              ${this.chosenSkill ? this.renderSkillDetails() : `<p class="card-resolution-hint">選擇一項套牌效果後，查看效果說明並結算。</p>`}`
              : `<div class="card-skill-result"><span class="eyebrow">NO MATCHING COMBO</span><h3>未形成套牌效果</h3><p>此組牌不符合任何套牌技能，仍會棄牌並補抽。</p></div>`
          }
          <div class="card-resolution-actions">
            <button class="card-end-button" type="button" data-action="discord-send" ${this.discordSending || (pendingSkills.length > 0 && !this.chosenSkill) ? "disabled" : ""}>傳送結果至 Discord</button>
            <button class="card-draw-button card-resolve-button" type="button" data-action="resolve">結算並棄牌補充手牌</button>
          </div>
          ${this.discordMessage ? `<p class="card-discord-note" role="status">${this.escapeHtml(this.discordMessage)}</p>` : ""}
        </section>`
      : "";

    this.root.innerHTML = `
      <section class="card-draw-panel" aria-label="衝突牌組管理">
        <div class="card-draw-toolbar">
          <div><span class="eyebrow">CONFLICT DECK · 30 CARDS</span><h2>衝突牌組管理</h2><p class="card-login-welcome">已登入${this.nickname ? `：${this.escapeHtml(this.nickname)}` : ""}</p></div>
          <div class="card-game-actions">
            <button class="card-draw-button" type="button" data-action="start" ${this.started ? "disabled" : ""}>開始衝突・洗牌抽 5 張</button>
            <button class="card-end-button" type="button" data-action="end" ${this.started ? "" : "disabled"}>結束衝突</button>
            <button class="card-end-button" type="button" data-action="logout">登出</button>
          </div>
        </div>
        <div class="card-game-settings">
          <label>魔法卡技能等級 SL<input type="number" min="1" max="3" value="${this.magicCardLevel}" data-field="magic-level" ${this.pendingCards ? "disabled" : ""}></label>
          <label>陷阱卡技能等級 SL<input type="number" min="1" max="4" value="${this.trapCardLevel}" data-field="trap-level" ${this.pendingCards ? "disabled" : ""}></label>
          <label>重抽技能等級 SL<input type="number" min="1" value="${this.redrawCardLevel}" data-field="redraw-level" ${this.pendingCards ? "disabled" : ""}></label>
          <label>角色等級（傷害加成）<input type="number" min="1" max="60" value="${this.characterLevel}" data-field="character-level" ${this.pendingCards ? "disabled" : ""}></label>
          <label>目前 MP<input type="number" min="0" value="${this.mp}" data-field="mp" ${this.pendingCards ? "disabled" : ""}></label>
          <label>本次消耗 MP<input type="number" min="10" max="${maximumMp}" value="${this.spendMp}" data-field="spend" ${!this.started || this.pendingCards ? "disabled" : ""}></label>
          <p>行動消耗上限：${maximumMp} MP <span>・</span> 每 5 MP 最多打出 1 張（每次至少消耗 10 MP）</p>
        </div>
        <section class="high-low-panel" aria-label="高或低技能">
          <div><span class="eyebrow">HIGH OR LOW · CRITICAL SUCCESS / FUMBLE</span><h3>高或低</h3>
            <p>擲出大成功或大失敗時，可選擇抽 1 張牌，再從手牌棄置 1 張。</p></div>
          ${
            this.highLowPending
              ? `<div class="high-low-discard"><span>已抽 1 張牌，請選擇 1 張手牌棄置（已選 ${selectedCount}/1）。</span>
                <button class="card-end-button" type="button" data-action="high-low-discard" ${selectedCount !== 1 ? "disabled" : ""}>確認棄置所選牌</button></div>`
              : `<button class="card-draw-button" type="button" data-action="high-low" ${!this.started || this.pendingCards ? "disabled" : ""}>大成功／大失敗後・抽 1 張</button>`
          }
        </section>
        <div class="card-pile-row">
          <section class="card-pile" aria-label="牌組">
            <h3>牌組 <span>${this.deck.length} 張</span></h3>${this.deck.length ? cardBack(this.deck.length) : `<div class="card-pile-empty">空</div>`}
          </section>
          <section class="card-pile card-pile-hand" aria-label="手牌">
            <div class="card-section-heading"><h3>手牌 <span>${this.hand.length} 張</span></h3><span class="card-selection-count">已選 ${selectedCount} 張</span></div>
            ${
              this.hand.length
                ? `<div class="playing-card-grid">${this.hand.map((card, index) => cardFace(card, index, this.selectedIds.has(card.id))).join("")}</div>`
                : `<div class="card-pile-empty">${this.started ? "手牌為空" : "開始衝突後抽取 5 張起始手牌"}</div>`
            }
            ${this.hand.some((card) => card.joker) && this.started && !this.pendingCards ? this.renderJokerControls(this.hand.filter((card) => card.joker)) : ""}
            <div class="card-play-controls">
              <p>已選 ${selectedCount} 張牌；本次最多可出 ${Math.min(5, Math.floor(this.spendMp / 5))} 張。</p>
              <button class="card-draw-button" type="button" data-action="play" ${!this.started || this.pendingCards || this.highLowPending || selectedCount === 0 ? "disabled" : ""}>使用行動並打出所選牌</button>
            </div>
            <div class="card-redraw-controls">
              <p>回合結束時可棄置所選手牌，最多 ${this.redrawCardLevel} 張；不消耗行動或 MP，並抽取等量牌補充。</p>
              <button class="card-end-button" type="button" data-action="redraw" ${!this.started || this.pendingCards || this.highLowPending || selectedCount === 0 || selectedCount > this.redrawCardLevel ? "disabled" : ""}>回合結束・發動重抽（${selectedCount}/${this.redrawCardLevel}）</button>
            </div>
          </section>
          <section class="card-pile" aria-label="棄牌堆">
            <h3>棄牌堆 <span>${this.discard.length} 張</span></h3>
            ${this.discard.length ? `<div class="discard-top-card">${cardFace(this.discard[this.discard.length - 1])}<span>最上方</span></div>` : `<div class="card-pile-empty">空</div>`}
          </section>
        </div>
        ${pendingMarkup}
        ${
          !this.pendingCards && this.lastPlayResult
            ? `<section class="card-discord-result">
          <p>上次套牌結算結果已備妥，可交由 Discord 傳送函式處理。</p>
          <button class="card-end-button" type="button" data-action="discord-send" ${this.discordSending ? "disabled" : ""}>傳送上次結果至 Discord</button>
          ${this.discordMessage ? `<p class="card-discord-note" role="status">${this.escapeHtml(this.discordMessage)}</p>` : ""}
        </section>`
            : ""
        }
        <section class="trap-card-panel">
          <div class="card-section-heading">
            <div><span class="eyebrow">TRAP CARD · AFTER ENEMY ACTION</span><h3>陷阱卡（✦4）</h3></div>
            <span class="card-rule-tag">敵方行動結算後</span>
          </div>
          <p class="card-rule-copy">敵人行動結算後，宣告一種花色並翻開牌組頂牌，正面朝上放入棄牌堆。若翻出鬼牌或符合宣告花色，可免費進行一次施法行動；法術消耗上限為 SL × 5 MP，仍須支付法術 MP。</p>
          <div class="trap-action-row">
            <label>宣告花色<select data-field="trap-suit" ${!this.started || this.pendingCards ? "disabled" : ""}>${suits.map((suit) => `<option value="${suit.id}" ${(this.root.dataset.trapSuit ?? "spade") === suit.id ? "selected" : ""}>${suit.name} ${suit.symbol}</option>`).join("")}</select></label>
            <button class="card-draw-button card-trap-button" type="button" data-action="trap" ${!this.started || this.pendingCards || this.highLowPending ? "disabled" : ""}>敵方行動結算後・翻開頂牌</button>
          </div>
          ${this.trapResult ? this.renderTrapResult() : ""}
        </section>
        <section class="card-rules-reference">
          <div class="card-section-heading"><div><span class="eyebrow">COMBO REFERENCE</span><h3>技能或套牌效果與條件</h3></div><span class="card-rule-tag">鬼牌可指定為 1–7 任一點數與花色</span></div>
          <div class="card-skill-reference-grid">${skills.map((skill) => `<article class="card-skill-reference"><h4>${skill.name}</h4><p>${skill.requirement}</p><span>${this.skillRuleSummary(skill.id)}</span></article>`).join("")}
            <article class="card-skill-reference"><h4>重抽（✦5）</h4><p>回合結束時，棄置最多 SL 張手牌</p><span>從牌組抽取等量牌補充手牌；牌組不足時，將棄牌堆洗回牌組後繼續抽取。</span></article>
            <article class="card-skill-reference"><h4>高或低</h4><p>擲出大成功或大失敗時</p><span>可從牌組抽 1 張牌，再從手牌棄置 1 張。</span></article>
          </div>
        </section>
        <section class="card-battle-log" aria-live="polite"><h3>衝突紀錄</h3>${
          this.log.length
            ? `<ol>${this.log
                .slice(-6)
                .reverse()
                .map((entry) => `<li>${entry}</li>`)
                .join("")}</ol>`
            : `<p>開始衝突後，抽牌與技能結算會記錄於此。</p>`
        }</section>
      </section>
    `;
  }

  private renderLogin(): void {
    this.root.innerHTML = `
      <section class="card-login-page" aria-labelledby="card-login-title">
        <div class="card-login-card">
          <span class="eyebrow">AUTHENTICATION · SECURE ACCESS</span>
          <h2 id="card-login-title">命運抽牌登入</h2>
          <p>請先使用帳號與密碼登入，登入成功後才能進入牌組頁面。</p>
          <form id="card-login-form" class="card-login-form">
            <label for="card-login-username">帳號</label>
            <input id="card-login-username" name="username" type="text" autocomplete="username" required ${this.loginPending ? "disabled" : ""} />
            <label for="card-login-password">密碼</label>
            <input id="card-login-password" name="password" type="password" autocomplete="current-password" required ${this.loginPending ? "disabled" : ""} />
            <p class="card-login-error" role="alert"></p>
            <button class="card-draw-button" type="submit" ${this.loginPending ? "disabled" : ""}>${this.loginPending ? "登入中…" : "登入並進入牌組"}</button>
          </form>
          <p class="card-login-security-note"></p>
        </div>
      </section>
    `;
    const error = this.root.querySelector<HTMLElement>(".card-login-error");
    if (error) error.textContent = this.loginError;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    })[character] ?? character);
  }

  private renderJokerControls(cards: PlayingCard[]): string {
    return `<div class="joker-assignment"><p>鬼牌可自由指定為 1–7 任一數值與花色：</p>${cards
      .map(
        (card) => `
      <div class="joker-assignment-row"><strong>✦ ${card.id === "joker-1" ? "鬼牌一" : "鬼牌二"}</strong>
        <label>點數<select data-field="joker-rank" data-card-id="${card.id}">${Array.from(
          { length: 7 },
          (_, index) => index + 1,
        )
          .map(
            (rank) =>
              `<option value="${rank}" ${(this.jokerRanks[card.id] ?? 1) === rank ? "selected" : ""}>${rank}</option>`,
          )
          .join("")}</select></label>
        <label>花色<select data-field="joker-suit" data-card-id="${card.id}">${suits.map((suit) => `<option value="${suit.id}" ${(this.jokerSuits[card.id] ?? "spade") === suit.id ? "selected" : ""}>${suit.name} ${suit.symbol}</option>`).join("")}</select></label>
      </div>`,
      )
      .join("")}</div>`;
  }

  private renderSkillDetails(): string {
    if (!this.pendingCards || !this.chosenSkill) return "";
    const skill = skills.find((item) => item.id === this.chosenSkill);
    if (!skill) throw new Error("Chosen skill was not found.");
    const cards = this.assigned(this.pendingCards);
    const maximum = Math.max(...cards.map((card) => card.rank));
    const damageSuits = this.availableDamageSuits(cards);
    if (!damageSuits.some((suit) => suit.id === this.damageSuit)) {
      this.damageSuit = damageSuits[0].id;
    }
    const skillFields =
      skill.id === "full-status"
        ? `<div class="skill-options-row"><label>狀態一<select data-field="status-one">${states.map((state) => `<option ${this.statusOne === state ? "selected" : ""}>${state}</option>`).join("")}</select></label><label>狀態二<select data-field="status-two">${states
            .filter((state) => state !== this.statusOne)
            .map(
              (state) =>
                `<option ${this.statusTwo === state ? "selected" : ""}>${state}</option>`,
            )
            .join("")}</select></label></div>`
        : skill.id === "double-impact"
          ? `<div class="skill-options-row"><label>傷害屬性<select data-field="damage-suit">${this.availableDamageSuits(
              cards,
            )
              .map(
                (suit) =>
                  `<option value="${suit.id}" ${this.damageSuit === suit.id ? "selected" : ""}>${suit.name}・${suit.element} ${suit.symbol}</option>`,
              )
              .join("")}</select></label></div>`
          : skill.id === "magic-pair"
            ? `<div class="skill-options-row"><label>可轉換的花色<select data-field="damage-suit">${this.availableDamageSuits(
                cards,
              )
                .map(
                  (suit) =>
                    `<option value="${suit.id}" ${this.damageSuit === suit.id ? "selected" : ""}>${suit.name}・${suit.element} ${suit.symbol}</option>`,
                )
                .join("")}</select></label></div>`
            : "";
    return `<div class="card-skill-result"><span class="eyebrow">SKILL EFFECT · ${skill.requirement}</span><h3>${skill.name}</h3>
      ${skillFields}<p>${this.skillDescription(skill.id)}</p></div>`;
  }

  private renderTrapResult(): string {
    if (!this.trapResult) return "";
    const { card, declaredSuit, canCast } = this.trapResult;
    return `<div class="trap-reveal ${canCast ? "is-triggered" : "is-missed"}">
      <div>${cardFace(card)}<p>宣告${declaredSuit.name} ${declaredSuit.symbol}</p></div>
      <div><span class="eyebrow">${canCast ? "SPELL ACTION UNLOCKED" : "NO MATCH"}</span><h4>${canCast ? "陷阱觸發，可免費施法" : "花色不符，陷阱未觸發"}</h4>
        ${
          canCast
            ? `<p>陷阱卡 SL ${this.trapCardLevel}，法術 MP 上限：${this.trapCardLevel * 5}；目前 MP：${this.mp}</p><div class="skill-options-row"><label>法術 MP 消耗<input type="number" min="0" max="${this.trapCardLevel * 5}" value="${this.spellCost}" data-field="spell-cost"></label>
          <button class="card-draw-button" type="button" data-action="cast">支付 MP 並免費施法</button></div>`
            : ""
        }
      </div>
    </div>`;
  }

  private availableDamageSuits(cards: PlayingCard[]): Suit[] {
    const cardSuitIds = new Set(cards.map((card) => card.suit.id));
    return suits.filter((suit) => cardSuitIds.has(suit.id));
  }

  private skillRuleSummary(skillId: SkillId): string {
    switch (skillId) {
      case "jackpot":
        return "盟友各恢復 777 HP、777 MP；已投降者恢復意識。";
      case "illusion-flush":
        return "全體敵人受 25＋點數總和傷害；等級 20/40 額外 +10/+20，屬性依花色。";
      case "blind-flush":
        return "全體敵人受 15＋點數總和傷害；等級 20/40 額外 +10/+20，最高點偶數光、奇數暗。";
      case "full-status":
        return "選兩種狀態；最高點偶數時盟友解除，奇數時施加於全體敵人。";
      case "triple-support":
        return "你與盟友各恢復點數總和 × 3 的 HP 與 MP。";
      case "double-impact":
        return "最多兩名可見敵人各受 10＋最高點傷害，屬性取自牌組花色。";
      case "magic-pair":
        return "使用裝備武器免費攻擊；造成傷害時可轉為牌組花色屬性。";
      case "forbidden-king":
        return "全體敵人受 777 傷害；四張點數總和偶數為光、奇數為暗。棄牌堆有鬼牌時無視免疫與抗性。";
    }
  }

  private cardName(card: PlayingCard): string {
    return card.joker ? "鬼牌" : `${card.suit.name}${card.rank}`;
  }

  private suitById(id: string): Suit | undefined {
    return suits.find((suit) => suit.id === id);
  }

  private addLog(message: string): void {
    this.log.push(message);
    if (this.log.length > 20) this.log.shift();
  }
}
